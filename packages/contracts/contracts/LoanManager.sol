// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LoanManager
 * @notice Manages loan requests, approvals, and repayments for the SME lending protocol
 * @dev Integrates with CreditScore for borrower eligibility and LendingPool for fund management
 *
 * Responsibilities:
 *  - Validate borrower credit scores before loan approval
 *  - Calculate interest rates based on credit scores (risk-based pricing)
 *  - Track loan terms including principal, interest, and deadlines
 *  - Facilitate loan disbursement via LendingPool
 *  - Process loan repayments with interest calculations
 *  - Manage loan lifecycle and defaults
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./LendingPool.sol";
import "./CreditScore.sol";

contract LoanManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State Variables
    LendingPool public lendingPool;
    CreditScore public creditScore;
    IERC20 public stablecoin;
    address public loanVoting;

    // Minimum credit score required to request a loan (0-1000 scale)
    uint256 public minCreditScore;

    // Maximum loan amount a borrower can request
    uint256 public maxLoanAmount;

    // Default loan duration in seconds (e.g., 30 days = 2592000 seconds)
    uint256 public defaultLoanDuration;

    // Base interest rate in basis points (e.g., 500 = 5%)
    uint256 public baseInterestRate;

    // Loan status enumeration
    enum LoanStatus {
        None,        // No loan exists
        Active,      // Loan is active and ongoing
        Repaid,      // Loan has been fully repaid
        Defaulted    // Loan has passed deadline without full repayment
    }

    // Struct to store loan details
    struct Loan {
        uint256 principal;           // Original loan amount borrowed
        uint256 interestRate;        // Interest rate in basis points (e.g., 800 = 8%)
        uint256 totalOwed;           // Total amount owed (principal + interest)
        uint256 amountRepaid;        // Amount repaid so far
        uint256 startTime;           // Timestamp when loan was disbursed
        uint256 deadline;            // Timestamp when loan must be repaid
        LoanStatus status;           // Current status of the loan
    }

    // Mapping from borrower address to their loan details
    mapping(address => Loan) public loans;

    // Total number of active loans in the system
    uint256 public totalActiveLoans;

    // Total amount of loans disbursed (all time)
    uint256 public totalLoansDisbursed;

    // Events

    event LoanRequested(
        address indexed borrower,
        uint256 amount,
        uint256 interestRate,
        uint256 deadline
    );

    event LoanDisbursed(
        address indexed borrower,
        uint256 principal,
        uint256 totalOwed,
        uint256 deadline
    );

    event LoanRepayment(
        address indexed borrower,
        uint256 amount,
        uint256 remainingDebt
    );

    event LoanFullyRepaid(address indexed borrower, uint256 totalPaid);

    event LoanDefaulted(address indexed borrower, uint256 outstandingDebt);

    event MinCreditScoreUpdated(uint256 newMinScore);

    event MaxLoanAmountUpdated(uint256 newMaxAmount);

    event LoanDurationUpdated(uint256 newDuration);

    event BaseInterestRateUpdated(uint256 newRate);

    // Constructor

    /**
     * @notice Initialize the LoanManager with required contract addresses and parameters
     * @param _lendingPool Address of the LendingPool contract
     * @param _creditScore Address of the CreditScore contract
     * @param _minCreditScore Minimum credit score required (0-1000)
     * @param _maxLoanAmount Maximum loan amount allowed
     * @param _defaultLoanDuration Default loan duration in seconds
     * @param _baseInterestRate Base interest rate in basis points
     */
    constructor(
        address _lendingPool,
        address _creditScore,
        uint256 _minCreditScore,
        uint256 _maxLoanAmount,
        uint256 _defaultLoanDuration,
        uint256 _baseInterestRate
    ) Ownable(msg.sender) {
        require(_lendingPool != address(0), "Invalid lending pool address");
        require(_creditScore != address(0), "Invalid credit score address");
        require(_minCreditScore <= 1000, "Min credit score must be <= 1000");
        require(_maxLoanAmount > 0, "Max loan amount must be > 0");
        require(_defaultLoanDuration > 0, "Loan duration must be > 0");
        require(_baseInterestRate > 0 && _baseInterestRate <= 10000, "Invalid interest rate");

        lendingPool = LendingPool(_lendingPool);
        creditScore = CreditScore(_creditScore);
        stablecoin = lendingPool.stablecoin();
        minCreditScore = _minCreditScore;
        maxLoanAmount = _maxLoanAmount;
        defaultLoanDuration = _defaultLoanDuration;
        baseInterestRate = _baseInterestRate;
    }

    // Modifiers

    /**
     * @notice Restricts function access to only the LoanVoting contract
     */
    modifier onlyLoanVoting() {
        require(msg.sender == loanVoting, "Caller is not LoanVoting contract");
        _;
    }

    // Core Functions

    /**
     * @notice Request and receive a loan if eligibility criteria are met
     * @dev Checks credit score, calculates interest rate, and disburses loan from LendingPool
     * @param amount The loan amount requested
     */
    function requestLoan(uint256 amount) external nonReentrant {
        require(amount > 0, "Loan amount must be > 0");
        require(amount <= maxLoanAmount, "Amount exceeds maximum loan");
        require(loans[msg.sender].status == LoanStatus.None ||
                loans[msg.sender].status == LoanStatus.Repaid,
                "Active loan already exists");

        // Check borrower's credit score
        uint256 borrowerScore = creditScore.getScore(msg.sender);
        require(borrowerScore >= minCreditScore, "Credit score too low");

        // Calculate interest rate based on credit score (lower score = higher rate)
        uint256 interestRate = calculateInterestRate(borrowerScore);

        // Calculate total amount owed (principal + interest)
        uint256 interest = (amount * interestRate) / 10000;
        uint256 totalOwed = amount + interest;

        // Set loan deadline
        uint256 deadline = block.timestamp + defaultLoanDuration;

        // Create loan record
        loans[msg.sender] = Loan({
            principal: amount,
            interestRate: interestRate,
            totalOwed: totalOwed,
            amountRepaid: 0,
            startTime: block.timestamp,
            deadline: deadline,
            status: LoanStatus.Active
        });

        // Update statistics
        totalActiveLoans++;
        totalLoansDisbursed += amount;

        emit LoanRequested(msg.sender, amount, interestRate, deadline);

        // Disburse loan from LendingPool
        lendingPool.disburseLoan(msg.sender, amount);

        emit LoanDisbursed(msg.sender, amount, totalOwed, deadline);
    }

    /**
     * @notice Make a repayment towards an active loan
     * @dev Processes repayment through LendingPool and updates loan status
     * @param amount The repayment amount (includes both principal and interest)
     */
    function repayLoan(uint256 amount) external nonReentrant {
        Loan storage loan = loans[msg.sender];

        require(loan.status == LoanStatus.Active, "No active loan");
        require(amount > 0, "Repayment amount must be > 0");

        uint256 remainingDebt = loan.totalOwed - loan.amountRepaid;
        require(amount <= remainingDebt, "Amount exceeds remaining debt");

        // Calculate how much of this payment goes towards principal and interest
        uint256 principalPayment;
        uint256 interestPayment;

        if (amount >= remainingDebt) {
            // Final payment - calculate remaining principal and interest
            uint256 principalRepaid = (loan.amountRepaid * loan.principal) / loan.totalOwed;
            principalPayment = loan.principal - principalRepaid;
            interestPayment = remainingDebt - principalPayment;
        } else {
            // Partial payment - split proportionally between principal and interest
            principalPayment = (amount * loan.principal) / loan.totalOwed;
            interestPayment = amount - principalPayment;
        }

        // Transfer entire payment from borrower to this contract
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);

        // Send principal to LendingPool
        if (principalPayment > 0) {
            // Approve LendingPool to spend the principal
            stablecoin.forceApprove(address(lendingPool), principalPayment);

            // Process principal repayment through LendingPool
            lendingPool.receiveRepayment(msg.sender, principalPayment);

            // Reset approval to 0 for security
            stablecoin.forceApprove(address(lendingPool), 0);
        }

        // Send interest to LendingPool
        if (interestPayment > 0) {
            // Approve LendingPool to spend the interest
            stablecoin.forceApprove(address(lendingPool), interestPayment);

            // Process interest payment through LendingPool
            lendingPool.receiveInterest(msg.sender, interestPayment);

            // Reset approval to 0 for security
            stablecoin.forceApprove(address(lendingPool), 0);
        }

        // Update loan repayment tracking
        loan.amountRepaid += amount;

        emit LoanRepayment(msg.sender, amount, remainingDebt - amount);

        // Check if loan is fully repaid
        if (loan.amountRepaid >= loan.totalOwed) {
            loan.status = LoanStatus.Repaid;
            totalActiveLoans--;
            emit LoanFullyRepaid(msg.sender, loan.amountRepaid);
        }
    }

    /**
     * @notice Approve and create a loan from LoanVoting contract
     * @dev Only callable by LoanVoting contract after DAO approval
     * @param borrower The approved borrower address
     * @param amount The approved loan amount
     */
    function approveLoanFromVoting(address borrower, uint256 amount) external onlyLoanVoting {
        require(amount > 0, "Loan amount must be > 0");
        require(amount <= maxLoanAmount, "Amount exceeds maximum loan");
        require(loans[borrower].status == LoanStatus.None ||
                loans[borrower].status == LoanStatus.Repaid,
                "Active loan already exists");

        // Check borrower's credit score
        uint256 borrowerScore = creditScore.getScore(borrower);
        require(borrowerScore >= minCreditScore, "Credit score too low");

        // Calculate interest rate based on credit score
        uint256 interestRate = calculateInterestRate(borrowerScore);

        // Calculate total amount owed (principal + interest)
        uint256 interest = (amount * interestRate) / 10000;
        uint256 totalOwed = amount + interest;

        // Set loan deadline
        uint256 deadline = block.timestamp + defaultLoanDuration;

        // Create loan record
        loans[borrower] = Loan({
            principal: amount,
            interestRate: interestRate,
            totalOwed: totalOwed,
            amountRepaid: 0,
            startTime: block.timestamp,
            deadline: deadline,
            status: LoanStatus.Active
        });

        // Update statistics
        totalActiveLoans++;
        totalLoansDisbursed += amount;

        emit LoanRequested(borrower, amount, interestRate, deadline);

        // Disburse loan from LendingPool
        lendingPool.disburseLoan(borrower, amount);

        emit LoanDisbursed(borrower, amount, totalOwed, deadline);
    }

    /**
     * @notice Mark a loan as defaulted if past deadline and not fully repaid
     * @dev Can be called by anyone to mark overdue loans as defaulted
     * @param borrower Address of the borrower whose loan to check
     */
    function markAsDefault(address borrower) external {
        Loan storage loan = loans[borrower];

        require(loan.status == LoanStatus.Active, "Loan is not active");
        require(block.timestamp > loan.deadline, "Loan deadline not passed");
        require(loan.amountRepaid < loan.totalOwed, "Loan already repaid");

        loan.status = LoanStatus.Defaulted;
        totalActiveLoans--;

        uint256 outstandingDebt = loan.totalOwed - loan.amountRepaid;
        emit LoanDefaulted(borrower, outstandingDebt);
    }

    // Interest Rate Calculation

    /**
     * @notice Calculate interest rate based on borrower's credit score
     * @dev Lower credit score results in higher interest rate (risk-based pricing)
     * @param score The borrower's credit score (0-1000)
     * @return The calculated interest rate in basis points
     *
     * Interest Rate Tiers:
     * - Score 900-1000: baseRate (best rate)
     * - Score 800-899:  baseRate + 200 bps
     * - Score 700-799:  baseRate + 400 bps
     * - Score 600-699:  baseRate + 600 bps
     * - Score <600:     baseRate + 800 bps (if minScore allows)
     */
    function calculateInterestRate(uint256 score) public view returns (uint256) {
        if (score >= 900) {
            return baseInterestRate;
        } else if (score >= 800) {
            return baseInterestRate + 200;
        } else if (score >= 700) {
            return baseInterestRate + 400;
        } else if (score >= 600) {
            return baseInterestRate + 600;
        } else {
            return baseInterestRate + 800;
        }
    }

    // Admin Functions

    /**
     * @notice Update the minimum credit score requirement
     * @dev Only callable by contract owner
     * @param _minCreditScore New minimum credit score (0-1000)
     */
    function setMinCreditScore(uint256 _minCreditScore) external onlyOwner {
        require(_minCreditScore <= 1000, "Score must be <= 1000");
        minCreditScore = _minCreditScore;
        emit MinCreditScoreUpdated(_minCreditScore);
    }

    /**
     * @notice Update the maximum loan amount
     * @dev Only callable by contract owner
     * @param _maxLoanAmount New maximum loan amount
     */
    function setMaxLoanAmount(uint256 _maxLoanAmount) external onlyOwner {
        require(_maxLoanAmount > 0, "Amount must be > 0");
        maxLoanAmount = _maxLoanAmount;
        emit MaxLoanAmountUpdated(_maxLoanAmount);
    }

    /**
     * @notice Update the default loan duration
     * @dev Only callable by contract owner
     * @param _duration New loan duration in seconds
     */
    function setLoanDuration(uint256 _duration) external onlyOwner {
        require(_duration > 0, "Duration must be > 0");
        defaultLoanDuration = _duration;
        emit LoanDurationUpdated(_duration);
    }

    /**
     * @notice Update the base interest rate
     * @dev Only callable by contract owner
     * @param _rate New base interest rate in basis points
     */
    function setBaseInterestRate(uint256 _rate) external onlyOwner {
        require(_rate > 0 && _rate <= 10000, "Invalid rate");
        baseInterestRate = _rate;
        emit BaseInterestRateUpdated(_rate);
    }

    /**
     * @notice Set the LoanVoting contract address
     * @dev Only callable by contract owner. Must be called after deployment to authorize LoanVoting
     * @param _loanVoting Address of the LoanVoting contract
     */
    function setLoanVoting(address _loanVoting) external onlyOwner {
        require(_loanVoting != address(0), "Invalid LoanVoting address");
        loanVoting = _loanVoting;
    }

    // View Functions

    /**
     * @notice Get complete loan details for a borrower
     * @param borrower Address of the borrower
     * @return Loan struct containing all loan information
     */
    function getLoanDetails(address borrower) external view returns (Loan memory) {
        return loans[borrower];
    }

    /**
     * @notice Get the remaining debt for a borrower
     * @param borrower Address of the borrower
     * @return The remaining amount owed
     */
    function getRemainingDebt(address borrower) external view returns (uint256) {
        Loan memory loan = loans[borrower];
        if (loan.status != LoanStatus.Active) {
            return 0;
        }
        return loan.totalOwed - loan.amountRepaid;
    }

    /**
     * @notice Check if a borrower's loan is overdue
     * @param borrower Address of the borrower
     * @return True if loan is active and past deadline
     */
    function isLoanOverdue(address borrower) external view returns (bool) {
        Loan memory loan = loans[borrower];
        return loan.status == LoanStatus.Active && block.timestamp > loan.deadline;
    }

    /**
     * @notice Check if a borrower is eligible for a loan
     * @param borrower Address to check
     * @return eligible True if borrower can request a loan
     * @return reason String explaining eligibility status
     */
    function checkEligibility(address borrower) external view returns (bool eligible, string memory reason) {
        // Check if borrower has an active loan
        if (loans[borrower].status == LoanStatus.Active) {
            return (false, "Active loan already exists");
        }

        // Check credit score
        uint256 score = creditScore.getScore(borrower);
        if (score < minCreditScore) {
            return (false, "Credit score too low");
        }

        return (true, "Eligible for loan");
    }
}
