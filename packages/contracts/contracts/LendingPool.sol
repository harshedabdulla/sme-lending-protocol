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

    // Total deposited tokens in the pool
    uint256 public totalLiquidity;

    // Total tokens currently lent out
    uint256 public totalBorrowed;

    // Per-user deposited balances
    mapping(address => uint256) public deposits;

    // Outstanding loan principal per borrower
    mapping(address => uint256) public loans;

    // Events

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event LoanManagerUpdated(address indexed newManager);
    event LoanDisbursed(address indexed borrower, uint256 amount);
    event LoanRepaid(address indexed borrower, uint256 amount);

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
     *  Withdraw available liquidity (not currently lent out).
     *  Amount to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(deposits[msg.sender] >= amount, "Insufficient balance");

        // Ensure enough free liquidity (totalLiquidity - totalBorrowed)
        require(
            totalLiquidity - totalBorrowed >= amount,
            "Not enough free liquidity"
        );

        deposits[msg.sender] -= amount;
        totalLiquidity -= amount;

        stablecoin.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
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
}
