// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InsurancePool
 * @notice Insurance fund to cover small loan defaults and protect backers
 * @dev Funded by protocol fees and used to cover partial losses on defaults
 *
 * Key Features:
 * - Accumulates protocol fees (0.5-1% of loan amounts)
 * - Covers partial losses on defaults (up to coverage limit)
 * - Protects active lenders and backers
 * - Transparent coverage calculations
 * - Emergency governance controls
 */
contract InsurancePool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public stablecoin;

    // Pool Configuration
    uint256 public constant PROTOCOL_FEE_PERCENTAGE = 100; // 1% in basis points
    uint256 public maxCoveragePercentage = 30; // Cover up to 30% of default loss
    uint256 public minPoolBalance = 10000 * 10**6; // Minimum balance before paying out

    // Pool State
    uint256 public totalCollected;
    uint256 public totalPaidOut;
    uint256 public claimCount;

    // Authorized contracts that can collect fees and file claims
    mapping(address => bool) public authorizedContracts;

    // Claim History
    struct Claim {
        address borrower;
        uint256 loanAmount;
        uint256 lossAmount;
        uint256 coverageAmount;
        uint256 timestamp;
        address[] backers;
    }

    Claim[] public claims;

    // Events
    event FeeCollected(uint256 amount, address indexed source);
    event ClaimFiled(
        uint256 indexed claimId,
        address indexed borrower,
        uint256 lossAmount,
        uint256 coverageAmount
    );
    event ClaimPaid(
        uint256 indexed claimId,
        address indexed recipient,
        uint256 amount
    );
    event MaxCoverageUpdated(uint256 newPercentage);
    event MinPoolBalanceUpdated(uint256 newBalance);
    event ContractAuthorized(address indexed contractAddress);
    event ContractRevoked(address indexed contractAddress);
    event EmergencyWithdrawal(address indexed to, uint256 amount);

    constructor(address _stablecoin) Ownable(msg.sender) {
        require(_stablecoin != address(0), "Invalid stablecoin");
        stablecoin = IERC20(_stablecoin);
    }

    // Modifiers
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized contract");
        _;
    }

    // Fee Collection

    /**
     * @notice Collect protocol fee from loan
     * @param loanAmount Loan principal amount
     */
    function collectFee(uint256 loanAmount) external onlyAuthorized nonReentrant {
        require(loanAmount > 0, "Invalid loan amount");

        uint256 feeAmount = (loanAmount * PROTOCOL_FEE_PERCENTAGE) / 10000;

        // Transfer fee from caller
        stablecoin.safeTransferFrom(msg.sender, address(this), feeAmount);

        totalCollected += feeAmount;

        emit FeeCollected(feeAmount, msg.sender);
    }

    /**
     * @notice Direct deposit to insurance pool
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");

        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        totalCollected += amount;

        emit FeeCollected(amount, msg.sender);
    }

    // Claims Management

    /**
     * @notice File insurance claim for defaulted loan
     * @param borrower Borrower who defaulted
     * @param loanAmount Original loan amount
     * @param lossAmount Total loss amount
     * @param backers Array of backer addresses to compensate
     * @return claimId The filed claim ID
     */
    function fileClaim(
        address borrower,
        uint256 loanAmount,
        uint256 lossAmount,
        address[] calldata backers
    ) external onlyAuthorized nonReentrant returns (uint256) {
        require(borrower != address(0), "Invalid borrower");
        require(lossAmount > 0, "Invalid loss amount");
        require(backers.length > 0, "No backers specified");

        // Calculate coverage amount
        uint256 coverageAmount = calculateCoverage(lossAmount);

        // Create claim
        Claim memory newClaim = Claim({
            borrower: borrower,
            loanAmount: loanAmount,
            lossAmount: lossAmount,
            coverageAmount: coverageAmount,
            timestamp: block.timestamp,
            backers: backers
        });

        claims.push(newClaim);
        uint256 claimId = claims.length - 1;
        claimCount++;

        emit ClaimFiled(claimId, borrower, lossAmount, coverageAmount);

        // Auto-pay if sufficient balance
        if (coverageAmount > 0 && getAvailableBalance() >= coverageAmount) {
            _payClaim(claimId);
        }

        return claimId;
    }

    /**
     * @notice Pay out insurance claim to backers
     * @param claimId ID of the claim to pay
     */
    function payClaim(uint256 claimId) external onlyOwner {
        _payClaim(claimId);
    }

    /**
     * @notice Internal function to pay claim
     * @param claimId Claim ID
     */
    function _payClaim(uint256 claimId) internal {
        require(claimId < claims.length, "Invalid claim ID");

        Claim storage claim = claims[claimId];
        require(claim.coverageAmount > 0, "No coverage for this claim");

        uint256 availableBalance = getAvailableBalance();
        require(availableBalance >= claim.coverageAmount, "Insufficient pool balance");

        // Distribute coverage proportionally to backers
        uint256 amountPerBacker = claim.coverageAmount / claim.backers.length;

        for (uint256 i = 0; i < claim.backers.length; i++) {
            address backer = claim.backers[i];
            stablecoin.safeTransfer(backer, amountPerBacker);
            emit ClaimPaid(claimId, backer, amountPerBacker);
        }

        totalPaidOut += claim.coverageAmount;

        // Mark as paid by setting coverage to 0
        claim.coverageAmount = 0;
    }

    // Coverage Calculation

    /**
     * @notice Calculate coverage amount for a loss
     * @param lossAmount Total loss amount
     * @return Coverage amount pool will pay
     */
    function calculateCoverage(uint256 lossAmount) public view returns (uint256) {
        // Check if pool has minimum balance
        if (getAvailableBalance() < minPoolBalance) {
            return 0;
        }

        // Calculate coverage based on percentage
        uint256 coverage = (lossAmount * maxCoveragePercentage) / 100;

        // Cap at available balance
        uint256 available = getAvailableBalance();
        return coverage > available ? available : coverage;
    }

    // Admin Functions

    /**
     * @notice Authorize contract to collect fees and file claims
     * @param contractAddress Address to authorize
     */
    function authorizeContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Invalid address");
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress);
    }

    /**
     * @notice Revoke contract authorization
     * @param contractAddress Address to revoke
     */
    function revokeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = false;
        emit ContractRevoked(contractAddress);
    }

    /**
     * @notice Update maximum coverage percentage
     * @param percentage New percentage (0-100)
     */
    function setMaxCoveragePercentage(uint256 percentage) external onlyOwner {
        require(percentage <= 100, "Percentage cannot exceed 100");
        maxCoveragePercentage = percentage;
        emit MaxCoverageUpdated(percentage);
    }

    /**
     * @notice Update minimum pool balance
     * @param balance New minimum balance
     */
    function setMinPoolBalance(uint256 balance) external onlyOwner {
        minPoolBalance = balance;
        emit MinPoolBalanceUpdated(balance);
    }

    /**
     * @notice Emergency withdrawal (governance only)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(amount <= stablecoin.balanceOf(address(this)), "Insufficient balance");

        stablecoin.safeTransfer(to, amount);
        emit EmergencyWithdrawal(to, amount);
    }

    // View Functions

    /**
     * @notice Get available balance (after minimum reserve)
     * @return Available balance for payouts
     */
    function getAvailableBalance() public view returns (uint256) {
        uint256 balance = stablecoin.balanceOf(address(this));
        return balance;
    }

    /**
     * @notice Get total pool balance
     * @return Total balance in pool
     */
    function getTotalBalance() external view returns (uint256) {
        return stablecoin.balanceOf(address(this));
    }

    /**
     * @notice Get pool utilization rate
     * @return Utilization in basis points (0-10000)
     */
    function getUtilizationRate() external view returns (uint256) {
        if (totalCollected == 0) return 0;
        return (totalPaidOut * 10000) / totalCollected;
    }

    /**
     * @notice Get claim details
     * @param claimId Claim ID
     * @return borrower Borrower address
     * @return loanAmount Original loan amount
     * @return lossAmount Total loss
     * @return coverageAmount Coverage provided
     * @return timestamp Claim timestamp
     * @return backers Array of backers
     */
    function getClaim(uint256 claimId) external view returns (
        address borrower,
        uint256 loanAmount,
        uint256 lossAmount,
        uint256 coverageAmount,
        uint256 timestamp,
        address[] memory backers
    ) {
        require(claimId < claims.length, "Invalid claim ID");
        Claim storage claim = claims[claimId];
        return (
            claim.borrower,
            claim.loanAmount,
            claim.lossAmount,
            claim.coverageAmount,
            claim.timestamp,
            claim.backers
        );
    }

    /**
     * @notice Get total number of claims
     * @return Number of claims
     */
    function getClaimCount() external view returns (uint256) {
        return claims.length;
    }

    /**
     * @notice Check if pool is healthy (above minimum balance)
     * @return True if pool is healthy
     */
    function isHealthy() external view returns (bool) {
        return getAvailableBalance() >= minPoolBalance;
    }
}
