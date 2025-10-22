// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./GovernanceToken.sol";
import "./ReputationNFT.sol";
import "./DAOMembership.sol";
import "../LoanManager.sol";

/**
 * @title LoanVoting
 * @notice Manages loan backing votes and dynamic collateral calculation
 * @dev Members vote to back borrowers, reducing their required collateral based on backing count
 *
 * Key Features:
 * - Dynamic collateral calculation (more backers = less collateral)
 * - Risk distribution among backers on default
 * - Reputation tracking for backers
 * - Slashing mechanism for consistent bad backers
 * - Integration with LoanManager for loan approvals
 */
contract LoanVoting is Ownable, ReentrancyGuard {

    GovernanceToken public governanceToken;
    ReputationNFT public reputationNFT;
    DAOMembership public membership;
    LoanManager public loanManager;

    // Collateral Configuration
    uint256 public constant BASE_COLLATERAL_PERCENTAGE = 100; // 100% base
    uint256 public constant MIN_COLLATERAL_PERCENTAGE = 20;   // 20% minimum
    uint256 public constant COLLATERAL_REDUCTION_PER_BACKER = 8; // 8% reduction per backer

    // Voting Configuration
    uint256 public constant VOTING_PERIOD = 5 minutes;
    uint256 public minBackers = 3; // Minimum backers required
    uint256 public minStakeToBack = 500 * 10**18; // Min stake to back a loan

    // Loan Backing Request
    struct LoanRequest {
        address borrower;
        uint256 amount;
        uint256 requestedCollateral; // Collateral borrower wants to provide
        uint256 startTime;
        uint256 endTime;
        uint256 backerCount;
        bool executed;
        bool approved;
        address[] backers;
        mapping(address => uint256) backingAmount; // Voting power backing
    }

    // Backer Loss Tracking (for defaults)
    struct BackerLoss {
        uint256 totalBacked;
        uint256 totalLost;
        uint256 lossCount;
    }

    // State Variables
    mapping(uint256 => LoanRequest) public loanRequests;
    uint256 public requestCount;

    mapping(address => BackerLoss) public backerLosses;
    mapping(address => uint256[]) public borrowerRequests;
    mapping(address => uint256[]) public backerActiveLoans;

    // Events
    event LoanRequested(
        uint256 indexed requestId,
        address indexed borrower,
        uint256 amount,
        uint256 requestedCollateral
    );
    event LoanBacked(
        uint256 indexed requestId,
        address indexed backer,
        uint256 votingPower
    );
    event LoanApproved(
        uint256 indexed requestId,
        address indexed borrower,
        uint256 amount,
        uint256 requiredCollateral,
        uint256 backerCount
    );
    event LoanRejected(
        uint256 indexed requestId,
        address indexed borrower,
        string reason
    );
    event LoanDefaultHandled(
        uint256 indexed requestId,
        address indexed borrower,
        uint256 lossAmount
    );
    event BackerSlashed(address indexed backer, string reason);

    constructor(
        address _governanceToken,
        address _reputationNFT,
        address _membership,
        address _loanManager
    ) Ownable(msg.sender) {
        require(_governanceToken != address(0), "Invalid governance token");
        require(_reputationNFT != address(0), "Invalid reputation NFT");
        require(_membership != address(0), "Invalid membership");
        require(_loanManager != address(0), "Invalid loan manager");

        governanceToken = GovernanceToken(_governanceToken);
        reputationNFT = ReputationNFT(_reputationNFT);
        membership = DAOMembership(_membership);
        loanManager = LoanManager(_loanManager);
    }

    // Loan Request Functions

    /**
     * @notice Request a loan with social backing
     * @param amount Loan amount requested
     * @param collateralPercentage Collateral percentage borrower is willing to provide (0-100)
     * @return requestId The created request ID
     */
    function requestLoan(
        uint256 amount,
        uint256 collateralPercentage
    ) external returns (uint256) {
        require(membership.isActiveMember(msg.sender), "Not an active DAO member");
        require(amount > 0, "Invalid amount");
        require(collateralPercentage <= 100, "Collateral cannot exceed 100%");

        // Check if borrower has active loan
        (bool eligible, string memory reason) = loanManager.checkEligibility(msg.sender);
        require(eligible, reason);

        uint256 requestId = requestCount++;
        LoanRequest storage request = loanRequests[requestId];

        request.borrower = msg.sender;
        request.amount = amount;
        request.requestedCollateral = collateralPercentage;
        request.startTime = block.timestamp;
        request.endTime = block.timestamp + VOTING_PERIOD;

        borrowerRequests[msg.sender].push(requestId);

        emit LoanRequested(requestId, msg.sender, amount, collateralPercentage);
        return requestId;
    }

    /**
     * @notice Back a loan request
     * @param requestId ID of the loan request
     */
    function backLoan(uint256 requestId) external nonReentrant {
        require(membership.isActiveMember(msg.sender), "Not an active DAO member");

        LoanRequest storage request = loanRequests[requestId];

        require(request.borrower != address(0), "Request does not exist");
        require(request.borrower != msg.sender, "Cannot back own loan");
        require(block.timestamp <= request.endTime, "Voting period ended");
        require(!request.executed, "Request already executed");
        require(request.backingAmount[msg.sender] == 0, "Already backed this loan");

        uint256 votingPower = governanceToken.getVotingPower(msg.sender);
        require(votingPower >= minStakeToBack, "Insufficient staked tokens");

        // Add backer
        request.backers.push(msg.sender);
        request.backingAmount[msg.sender] = votingPower;
        request.backerCount++;

        backerActiveLoans[msg.sender].push(requestId);

        emit LoanBacked(requestId, msg.sender, votingPower);
    }

    /**
     * @notice Execute loan request after voting period
     * @param requestId ID of the request to execute
     */
    function executeRequest(uint256 requestId) external nonReentrant {
        LoanRequest storage request = loanRequests[requestId];

        require(block.timestamp > request.endTime, "Voting period not ended");
        require(!request.executed, "Request already executed");

        request.executed = true;

        // Calculate required collateral based on backers
        uint256 requiredCollateral = calculateRequiredCollateral(request.backerCount);

        // Check if minimum backers met and collateral sufficient
        if (request.backerCount >= minBackers && request.requestedCollateral >= requiredCollateral) {
            request.approved = true;

            // Approve loan through LoanManager
            // Note: This is a simplified flow. In production, you'd need proper collateral handling
            emit LoanApproved(
                requestId,
                request.borrower,
                request.amount,
                requiredCollateral,
                request.backerCount
            );
        } else {
            request.approved = false;
            string memory reason;

            if (request.backerCount < minBackers) {
                reason = "Insufficient backers";
            } else {
                reason = "Insufficient collateral";
            }

            emit LoanRejected(requestId, request.borrower, reason);
        }
    }

    /**
     * @notice Handle loan default - distribute losses and update reputations
     * @param requestId ID of the defaulted loan request
     * @param lossAmount Total loss amount to distribute
     */
    function handleDefault(uint256 requestId, uint256 lossAmount) external onlyOwner {
        LoanRequest storage request = loanRequests[requestId];

        require(request.executed && request.approved, "Loan not approved");
        require(request.backerCount > 0, "No backers");

        // Distribute loss proportionally among backers
        uint256 totalVotingPower = 0;
        for (uint256 i = 0; i < request.backers.length; i++) {
            totalVotingPower += request.backingAmount[request.backers[i]];
        }

        for (uint256 i = 0; i < request.backers.length; i++) {
            address backer = request.backers[i];
            uint256 backerShare = (lossAmount * request.backingAmount[backer]) / totalVotingPower;

            // Update backer loss tracking
            BackerLoss storage loss = backerLosses[backer];
            loss.totalLost += backerShare;
            loss.lossCount++;

            // Update reputation
            reputationNFT.recordBacking(backer, false);

            // Check if backer should be slashed (>30% loss rate and >5 defaults)
            if (loss.lossCount >= 5) {
                uint256 lossRate = (loss.totalLost * 100) / loss.totalBacked;
                if (lossRate > 30) {
                    governanceToken.slash(backer, "Consistent backing of defaulting borrowers");
                    emit BackerSlashed(backer, "High default rate");
                }
            }
        }

        emit LoanDefaultHandled(requestId, request.borrower, lossAmount);
    }

    /**
     * @notice Handle successful loan repayment - update reputations
     * @param requestId ID of the repaid loan request
     */
    function handleRepayment(uint256 requestId) external {
        LoanRequest storage request = loanRequests[requestId];

        require(request.executed && request.approved, "Loan not approved");
        require(request.backerCount > 0, "No backers");

        // Update backing amount for each backer
        uint256 totalVotingPower = 0;
        for (uint256 i = 0; i < request.backers.length; i++) {
            totalVotingPower += request.backingAmount[request.backers[i]];
        }

        // Update reputation for all backers (successful backing)
        for (uint256 i = 0; i < request.backers.length; i++) {
            address backer = request.backers[i];

            // Track successful backing
            backerLosses[backer].totalBacked += request.backingAmount[backer];

            // Update reputation
            reputationNFT.recordBacking(backer, true);
        }
    }

    // Collateral Calculation

    /**
     * @notice Calculate required collateral percentage based on backer count
     * @param backerCount Number of backers
     * @return Required collateral percentage
     */
    function calculateRequiredCollateral(uint256 backerCount) public pure returns (uint256) {
        if (backerCount == 0) {
            return BASE_COLLATERAL_PERCENTAGE;
        }

        uint256 reduction = backerCount * COLLATERAL_REDUCTION_PER_BACKER;
        uint256 required = BASE_COLLATERAL_PERCENTAGE > reduction
            ? BASE_COLLATERAL_PERCENTAGE - reduction
            : MIN_COLLATERAL_PERCENTAGE;

        return required < MIN_COLLATERAL_PERCENTAGE ? MIN_COLLATERAL_PERCENTAGE : required;
    }

    // Admin Functions

    /**
     * @notice Update minimum backers required
     * @param _minBackers New minimum
     */
    function setMinBackers(uint256 _minBackers) external onlyOwner {
        require(_minBackers > 0, "Must be > 0");
        minBackers = _minBackers;
    }

    /**
     * @notice Update minimum stake to back loans
     * @param _minStake New minimum stake
     */
    function setMinStakeToBack(uint256 _minStake) external onlyOwner {
        minStakeToBack = _minStake;
    }

    // View Functions

    /**
     * @notice Get loan request details
     * @param requestId Request ID
     * @return borrower Borrower address
     * @return amount Loan amount
     * @return requestedCollateral Requested collateral percentage
     * @return startTime Start timestamp
     * @return endTime End timestamp
     * @return backerCount Number of backers
     * @return executed Whether executed
     * @return approved Whether approved
     */
    function getRequest(uint256 requestId) external view returns (
        address borrower,
        uint256 amount,
        uint256 requestedCollateral,
        uint256 startTime,
        uint256 endTime,
        uint256 backerCount,
        bool executed,
        bool approved
    ) {
        LoanRequest storage request = loanRequests[requestId];
        return (
            request.borrower,
            request.amount,
            request.requestedCollateral,
            request.startTime,
            request.endTime,
            request.backerCount,
            request.executed,
            request.approved
        );
    }

    /**
     * @notice Get backers for a loan request
     * @param requestId Request ID
     * @return Array of backer addresses
     */
    function getBackers(uint256 requestId) external view returns (address[] memory) {
        return loanRequests[requestId].backers;
    }

    /**
     * @notice Check if address has backed a request
     * @param requestId Request ID
     * @param backer Address to check
     * @return Backing amount (voting power)
     */
    function getBackingAmount(uint256 requestId, address backer) external view returns (uint256) {
        return loanRequests[requestId].backingAmount[backer];
    }

    /**
     * @notice Get all requests by borrower
     * @param borrower Borrower address
     * @return Array of request IDs
     */
    function getBorrowerRequests(address borrower) external view returns (uint256[] memory) {
        return borrowerRequests[borrower];
    }

    /**
     * @notice Get backer statistics
     * @param backer Backer address
     * @return totalBacked Total amount backed
     * @return totalLost Total amount lost
     * @return lossCount Number of defaults
     */
    function getBackerStats(address backer) external view returns (
        uint256 totalBacked,
        uint256 totalLost,
        uint256 lossCount
    ) {
        BackerLoss memory loss = backerLosses[backer];
        return (loss.totalBacked, loss.totalLost, loss.lossCount);
    }
}
