// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DAOMembership.sol";

/**
 * @title YieldingPool
 * @notice Passive investment pool for DAO members earning steady DeFi yields
 * @dev Integrates with external DeFi protocols (Aave, Compound) for yield generation
 *
 * Key Features:
 * - Low-risk passive investment option
 * - Integration with battle-tested DeFi protocols
 * - Automatic yield compounding
 * - Share-based accounting (similar to vault patterns)
 * - Withdrawal queue for liquidity management
 */
contract YieldingPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public stablecoin;
    DAOMembership public membership;

    // Share accounting
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    // Pool state
    uint256 public totalDeposits;
    uint256 public totalYieldEarned;

    // Yield strategy configuration
    address public yieldStrategy; // Address of yield-generating contract (Aave, Compound, etc.)
    uint256 public constant WITHDRAWAL_FEE = 50; // 0.5% in basis points
    uint256 public constant PERFORMANCE_FEE = 1000; // 10% of yield

    // Withdrawal queue
    struct WithdrawalRequest {
        uint256 shares;
        uint256 requestTime;
    }
    mapping(address => WithdrawalRequest) public withdrawalRequests;
    uint256 public constant WITHDRAWAL_DELAY = 2 days;

    // Events
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event WithdrawalRequested(address indexed user, uint256 shares, uint256 availableAt);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event YieldHarvested(uint256 amount, uint256 performanceFee);
    event YieldStrategyUpdated(address indexed newStrategy);

    constructor(
        address _stablecoin,
        address _membership
    ) Ownable(msg.sender) {
        require(_stablecoin != address(0), "Invalid stablecoin");
        require(_membership != address(0), "Invalid membership");

        stablecoin = IERC20(_stablecoin);
        membership = DAOMembership(_membership);
    }

    // Modifiers
    modifier onlyActiveMember() {
        require(membership.isActiveMember(msg.sender), "Not an active DAO member");
        _;
    }

    // Deposit Functions

    /**
     * @notice Deposit stablecoins to earn passive yields
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) external onlyActiveMember nonReentrant {
        require(amount > 0, "Amount must be > 0");

        // Calculate shares to mint
        uint256 sharesToMint;
        if (totalShares == 0) {
            sharesToMint = amount;
        } else {
            sharesToMint = (amount * totalShares) / totalDeposits;
        }

        // Transfer tokens from user
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);

        // Update state
        shares[msg.sender] += sharesToMint;
        totalShares += sharesToMint;
        totalDeposits += amount;

        // Deploy to yield strategy if set
        if (yieldStrategy != address(0)) {
            _deployToStrategy(amount);
        }

        emit Deposited(msg.sender, amount, sharesToMint);
    }

    /**
     * @notice Request withdrawal (starts delay period)
     * @param shareAmount Number of shares to withdraw
     */
    function requestWithdrawal(uint256 shareAmount) external {
        require(shareAmount > 0, "Share amount must be > 0");
        require(shares[msg.sender] >= shareAmount, "Insufficient shares");
        require(withdrawalRequests[msg.sender].shares == 0, "Pending withdrawal exists");

        withdrawalRequests[msg.sender] = WithdrawalRequest({
            shares: shareAmount,
            requestTime: block.timestamp
        });

        uint256 availableAt = block.timestamp + WITHDRAWAL_DELAY;
        emit WithdrawalRequested(msg.sender, shareAmount, availableAt);
    }

    /**
     * @notice Complete withdrawal after delay period
     */
    function withdraw() external nonReentrant {
        WithdrawalRequest memory request = withdrawalRequests[msg.sender];

        require(request.shares > 0, "No pending withdrawal");
        require(
            block.timestamp >= request.requestTime + WITHDRAWAL_DELAY,
            "Withdrawal delay not passed"
        );

        // Calculate withdrawal amount
        uint256 withdrawalAmount = (request.shares * totalDeposits) / totalShares;

        // Apply withdrawal fee
        uint256 fee = (withdrawalAmount * WITHDRAWAL_FEE) / 10000;
        uint256 amountAfterFee = withdrawalAmount - fee;

        // Ensure liquidity
        uint256 availableLiquidity = stablecoin.balanceOf(address(this));
        if (availableLiquidity < amountAfterFee) {
            // Withdraw from strategy if needed
            _withdrawFromStrategy(amountAfterFee - availableLiquidity);
        }

        // Update state
        shares[msg.sender] -= request.shares;
        totalShares -= request.shares;
        totalDeposits -= withdrawalAmount;
        delete withdrawalRequests[msg.sender];

        // Transfer tokens
        stablecoin.safeTransfer(msg.sender, amountAfterFee);

        emit Withdrawn(msg.sender, amountAfterFee, request.shares);
    }

    /**
     * @notice Cancel pending withdrawal request
     */
    function cancelWithdrawal() external {
        require(withdrawalRequests[msg.sender].shares > 0, "No pending withdrawal");
        delete withdrawalRequests[msg.sender];
    }

    // Yield Management

    /**
     * @notice Harvest yields from strategy and compound
     */
    function harvestYield() external onlyOwner {
        require(yieldStrategy != address(0), "No yield strategy set");

        uint256 balanceBefore = stablecoin.balanceOf(address(this));

        // Harvest yield from strategy
        _harvestFromStrategy();

        uint256 balanceAfter = stablecoin.balanceOf(address(this));
        uint256 yieldEarned = balanceAfter - balanceBefore;

        if (yieldEarned > 0) {
            // Take performance fee
            uint256 performanceFee = (yieldEarned * PERFORMANCE_FEE) / 10000;
            uint256 netYield = yieldEarned - performanceFee;

            // Add net yield to total deposits (compounds for users)
            totalDeposits += netYield;
            totalYieldEarned += netYield;

            emit YieldHarvested(yieldEarned, performanceFee);

            // Redeploy to strategy
            _deployToStrategy(netYield);
        }
    }

    // Strategy Integration (Placeholder functions)

    /**
     * @notice Deploy funds to yield strategy
     * @dev Override this function to integrate with specific DeFi protocol
     * @param amount Amount to deploy
     */
    function _deployToStrategy(uint256 amount) internal virtual {
        // Placeholder for Aave/Compound integration
        // Example: aToken.deposit(amount);
    }

    /**
     * @notice Withdraw funds from yield strategy
     * @dev Override this function to integrate with specific DeFi protocol
     * @param amount Amount to withdraw
     */
    function _withdrawFromStrategy(uint256 amount) internal virtual {
        // Placeholder for Aave/Compound integration
        // Example: aToken.withdraw(amount);
    }

    /**
     * @notice Harvest yield from strategy
     * @dev Override this function to integrate with specific DeFi protocol
     */
    function _harvestFromStrategy() internal virtual {
        // Placeholder for yield harvesting
        // Example: aToken.claimRewards();
    }

    // Admin Functions

    /**
     * @notice Set yield strategy address
     * @param _strategy Address of yield strategy contract
     */
    function setYieldStrategy(address _strategy) external onlyOwner {
        yieldStrategy = _strategy;
        emit YieldStrategyUpdated(_strategy);
    }

    /**
     * @notice Emergency withdraw all funds from strategy
     */
    function emergencyWithdrawFromStrategy() external onlyOwner {
        require(yieldStrategy != address(0), "No strategy set");
        _withdrawFromStrategy(type(uint256).max);
    }

    // View Functions

    /**
     * @notice Get user's balance in underlying tokens
     * @param user Address to check
     * @return Balance in underlying tokens
     */
    function balanceOf(address user) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[user] * totalDeposits) / totalShares;
    }

    /**
     * @notice Get current APY (approximate, based on last harvest)
     * @return APY in basis points
     */
    function getCurrentAPY() external view returns (uint256) {
        // Simplified APY calculation
        // In production, would track yield over time periods
        if (totalDeposits == 0) return 0;
        return (totalYieldEarned * 10000) / totalDeposits;
    }

    /**
     * @notice Check if user can withdraw
     * @param user Address to check
     * @return True if withdrawal delay has passed
     */
    function canWithdraw(address user) external view returns (bool) {
        WithdrawalRequest memory request = withdrawalRequests[user];
        if (request.shares == 0) return false;
        return block.timestamp >= request.requestTime + WITHDRAWAL_DELAY;
    }

    /**
     * @notice Get total value locked in pool
     * @return Total deposits in underlying tokens
     */
    function getTotalValueLocked() external view returns (uint256) {
        return totalDeposits;
    }

    /**
     * @notice Calculate withdrawal amount for shares
     * @param user User address
     * @return amount Amount user would receive (after fees)
     */
    function previewWithdrawal(address user) external view returns (uint256) {
        WithdrawalRequest memory request = withdrawalRequests[user];
        if (request.shares == 0) return 0;

        uint256 withdrawalAmount = (request.shares * totalDeposits) / totalShares;
        uint256 fee = (withdrawalAmount * WITHDRAWAL_FEE) / 10000;
        return withdrawalAmount - fee;
    }
}
