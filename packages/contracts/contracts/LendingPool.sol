// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * LendingPool
 * liquidity pool for undercollateralized SME lending.
 *
 * Responsibilities:
 *  - Accept and track deposits from lenders.
 *  - Allow withdrawals (only if pool has free liquidity).
 *  - Disburse loans to borrowers via authorized LoanManager.
 *  - Receive repayments and update outstanding balances.
 *
 * Security:
 *  - Uses SafeERC20 for token transfers.
 *  - Uses ReentrancyGuard for deposit/withdraw safety.
 *  - Restricted loan disbursement to LoanManager role.
 */

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LendingPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    //The stablecoin used for deposits and loans (e.g., MockUSDT)
    IERC20 public stablecoin;

    // Address with permission to disburse loans
    address public loanManager;

    // Total deposited tokens in the pool (principal only)
    uint256 public totalLiquidity;

    // Total tokens currently lent out
    uint256 public totalBorrowed;

    // Total interest earned by the pool
    uint256 public totalInterestEarned;

    // Per-user deposited balances (principal only)
    mapping(address => uint256) public deposits;

    // Outstanding loan principal per borrower
    mapping(address => uint256) public loans;

    // Events

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event LoanManagerUpdated(address indexed newManager);
    event LoanDisbursed(address indexed borrower, uint256 amount);
    event LoanRepaid(address indexed borrower, uint256 amount);
    event InterestReceived(address indexed borrower, uint256 amount);

    // Constructor

    /**
     * Address of ERC20 stablecoin used for lending (e.g., MockUSDT)
     */
    constructor(address _stablecoin) Ownable(msg.sender) {
        require(_stablecoin != address(0), "Invalid token address");
        stablecoin = IERC20(_stablecoin);
    }

    // Modifiers

    modifier onlyLoanManager() {
        require(msg.sender == loanManager, "Unauthorized: not loan manager");
        _;
    }

    // Admin Functions

    /**
     *  Set the address authorized to disburse loans.
     *  Address of the new loan manager
     */
    function setLoanManager(address _manager) external onlyOwner {
        require(_manager != address(0), "Invalid address");
        loanManager = _manager;
        emit LoanManagerUpdated(_manager);
    }

    // Core Functions

    /**
     *  Deposit stablecoins into the pool.
     *  Amount of tokens to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);

        deposits[msg.sender] += amount;
        totalLiquidity += amount;

        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw deposit plus earned interest
     * @dev Calculates proportional share of interest earned and withdraws principal + interest
     * @param amount Amount of principal to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(deposits[msg.sender] >= amount, "Insufficient balance");

        // Calculate user's share of interest earned
        // Share = (user deposit / total deposits) * total interest
        uint256 userInterestShare = 0;
        if (totalLiquidity > 0 && totalInterestEarned > 0) {
            userInterestShare = (deposits[msg.sender] * totalInterestEarned) / totalLiquidity;
        }

        // Calculate total amount to withdraw (principal + proportional interest)
        uint256 totalWithdrawAmount = amount + ((amount * userInterestShare) / deposits[msg.sender]);

        // Ensure enough free liquidity (totalLiquidity + interest - totalBorrowed)
        uint256 availableLiquidity = (totalLiquidity + totalInterestEarned) - totalBorrowed;
        require(availableLiquidity >= totalWithdrawAmount, "Not enough free liquidity");

        // Update state
        deposits[msg.sender] -= amount;
        totalLiquidity -= amount;

        // Reduce interest proportionally
        if (userInterestShare > 0 && totalWithdrawAmount > amount) {
            uint256 interestWithdrawn = totalWithdrawAmount - amount;
            totalInterestEarned -= interestWithdrawn;
        }

        // Transfer total amount (principal + interest)
        stablecoin.safeTransfer(msg.sender, totalWithdrawAmount);

        emit Withdrawn(msg.sender, totalWithdrawAmount);
    }

    /**
     *  LoanManager disburses loan to borrower.
     *  Address of borrower
     *  Loan amount to disburse
     */
    function disburseLoan(
        address borrower,
        uint256 amount
    ) external onlyLoanManager nonReentrant {
        require(borrower != address(0), "Invalid borrower");
        require(amount > 0, "Invalid amount");
        require(
            totalLiquidity - totalBorrowed >= amount,
            "Insufficient pool liquidity"
        );

        loans[borrower] += amount;
        totalBorrowed += amount;

        stablecoin.safeTransfer(borrower, amount);

        emit LoanDisbursed(borrower, amount);
    }

    /**
     *  Borrower (or anyone) repays part/all of a loan.
     *  Borrower's address
     *  Repayment amount
     */
    function receiveRepayment(address borrower, uint256 amount) external nonReentrant {
        require(borrower != address(0), "Invalid borrower");
        require(amount > 0, "Invalid amount");
        require(loans[borrower] >= amount, "Repay exceeds loan");

        stablecoin.safeTransferFrom(msg.sender, address(this), amount);

        loans[borrower] -= amount;
        totalBorrowed -= amount;

        emit LoanRepaid(borrower, amount);
    }

    /**
     * @notice Receive interest payment from borrowers
     * @dev Only callable by LoanManager. Interest is distributed to all lenders proportionally
     * @param borrower Address of the borrower paying interest
     * @param interestAmount Amount of interest being paid
     */
    function receiveInterest(address borrower, uint256 interestAmount) external onlyLoanManager nonReentrant {
        require(borrower != address(0), "Invalid borrower");
        require(interestAmount > 0, "Invalid interest amount");

        // Transfer interest from LoanManager to this contract
        stablecoin.safeTransferFrom(msg.sender, address(this), interestAmount);

        // Add to total interest earned (increases value for all lenders proportionally)
        totalInterestEarned += interestAmount;

        emit InterestReceived(borrower, interestAmount);
    }

    // View Helpers
    /**
     *  Returns the actual token balance held by the pool
     */
    function getPoolBalance() external view returns (uint256) {
        return stablecoin.balanceOf(address(this));
    }

    /**
     *  Returns free liquidity available for new loans or withdrawals
     */
    function getAvailableLiquidity() external view returns (uint256) {
        return totalLiquidity - totalBorrowed;
    }

    /**
     * @notice Get user's total balance including earned interest
     * @param user Address of the user
     * @return principal User's deposited principal
     * @return interest User's earned interest
     * @return total Total balance (principal + interest)
     */
    function getUserBalance(address user) external view returns (
        uint256 principal,
        uint256 interest,
        uint256 total
    ) {
        principal = deposits[user];

        // Calculate proportional interest
        if (totalLiquidity > 0 && totalInterestEarned > 0 && principal > 0) {
            interest = (principal * totalInterestEarned) / totalLiquidity;
        } else {
            interest = 0;
        }

        total = principal + interest;
        return (principal, interest, total);
    }
}
