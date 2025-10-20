// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GovernanceToken
 * @notice ERC20 token used for DAO governance and staking
 * @dev Members stake tokens to participate in voting. Slashing mechanism for bad actors.
 *
 * Key Features:
 * - Staking mechanism for voting participation
 * - Slashing for backers who support defaulting borrowers
 * - Voting power based on staked amount
 * - Cooldown period for unstaking
 */
contract GovernanceToken is ERC20, Ownable, ReentrancyGuard {

    // Staking Configuration
    uint256 public constant UNSTAKE_COOLDOWN = 7 days;
    uint256 public constant SLASH_PERCENTAGE = 10; // 10% slash on bad backing
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 10**18; // 100 tokens minimum

    // Authorized contracts that can slash stakes
    mapping(address => bool) public authorizedSlashers;

    // Staking Data
    struct StakeInfo {
        uint256 stakedAmount;
        uint256 unstakeRequestTime;
        uint256 unstakeAmount;
    }

    mapping(address => StakeInfo) public stakes;

    // Total staked in the system
    uint256 public totalStaked;

    // Events
    event Staked(address indexed user, uint256 amount, uint256 totalStaked);
    event UnstakeRequested(address indexed user, uint256 amount, uint256 availableAt);
    event Unstaked(address indexed user, uint256 amount);
    event Slashed(address indexed user, uint256 amount, string reason);
    event SlasherAuthorized(address indexed slasher);
    event SlasherRevoked(address indexed slasher);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    // Modifiers
    modifier onlyAuthorizedSlasher() {
        require(authorizedSlashers[msg.sender], "Not authorized to slash");
        _;
    }

    // Staking Functions

    /**
     * @notice Stake tokens to participate in governance
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum stake");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Transfer tokens from user to this contract
        _transfer(msg.sender, address(this), amount);

        // Update stake info
        stakes[msg.sender].stakedAmount += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount, stakes[msg.sender].stakedAmount);
    }

    /**
     * @notice Request to unstake tokens (starts cooldown period)
     * @param amount Amount of tokens to unstake
     */
    function requestUnstake(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(stakes[msg.sender].stakedAmount >= amount, "Insufficient staked balance");
        require(stakes[msg.sender].unstakeAmount == 0, "Pending unstake request exists");

        stakes[msg.sender].unstakeAmount = amount;
        stakes[msg.sender].unstakeRequestTime = block.timestamp;

        uint256 availableAt = block.timestamp + UNSTAKE_COOLDOWN;
        emit UnstakeRequested(msg.sender, amount, availableAt);
    }

    /**
     * @notice Complete unstaking after cooldown period
     */
    function unstake() external nonReentrant {
        StakeInfo storage stakeInfo = stakes[msg.sender];

        require(stakeInfo.unstakeAmount > 0, "No pending unstake request");
        require(
            block.timestamp >= stakeInfo.unstakeRequestTime + UNSTAKE_COOLDOWN,
            "Cooldown period not finished"
        );

        uint256 amount = stakeInfo.unstakeAmount;

        // Update stake info
        stakeInfo.stakedAmount -= amount;
        totalStaked -= amount;
        stakeInfo.unstakeAmount = 0;
        stakeInfo.unstakeRequestTime = 0;

        // Return tokens to user
        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Cancel a pending unstake request
     */
    function cancelUnstake() external {
        require(stakes[msg.sender].unstakeAmount > 0, "No pending unstake request");

        stakes[msg.sender].unstakeAmount = 0;
        stakes[msg.sender].unstakeRequestTime = 0;
    }

    // Slashing Functions

    /**
     * @notice Slash a user's stake for supporting defaulting borrowers
     * @dev Only callable by authorized contracts (LoanVoting)
     * @param user Address to slash
     * @param reason Reason for slashing
     */
    function slash(address user, string calldata reason) external onlyAuthorizedSlasher {
        uint256 stakedAmount = stakes[user].stakedAmount;
        require(stakedAmount > 0, "User has no stake");

        uint256 slashAmount = (stakedAmount * SLASH_PERCENTAGE) / 100;

        // Reduce staked amount
        stakes[user].stakedAmount -= slashAmount;
        totalStaked -= slashAmount;

        // Burn slashed tokens
        _burn(address(this), slashAmount);

        emit Slashed(user, slashAmount, reason);
    }

    // Admin Functions

    /**
     * @notice Authorize a contract to slash stakes
     * @param slasher Address of the contract (e.g., LoanVoting)
     */
    function authorizeSlasher(address slasher) external onlyOwner {
        require(slasher != address(0), "Invalid address");
        authorizedSlashers[slasher] = true;
        emit SlasherAuthorized(slasher);
    }

    /**
     * @notice Revoke slashing authorization
     * @param slasher Address to revoke
     */
    function revokeSlasher(address slasher) external onlyOwner {
        authorizedSlashers[slasher] = false;
        emit SlasherRevoked(slasher);
    }

    /**
     * @notice Mint new tokens (for rewards, etc.)
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // View Functions

    /**
     * @notice Get voting power of a user (based on staked amount)
     * @param user Address to check
     * @return Voting power
     */
    function getVotingPower(address user) external view returns (uint256) {
        return stakes[user].stakedAmount;
    }

    /**
     * @notice Get stake info for a user
     * @param user Address to check
     * @return stakedAmount Current staked amount
     * @return unstakeAmount Amount pending unstake
     * @return unstakeAvailableAt Timestamp when unstake becomes available
     */
    function getStakeInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 unstakeAmount,
        uint256 unstakeAvailableAt
    ) {
        StakeInfo memory info = stakes[user];
        stakedAmount = info.stakedAmount;
        unstakeAmount = info.unstakeAmount;
        unstakeAvailableAt = info.unstakeRequestTime > 0
            ? info.unstakeRequestTime + UNSTAKE_COOLDOWN
            : 0;
    }

    /**
     * @notice Check if user can unstake
     * @param user Address to check
     * @return True if cooldown period has passed
     */
    function canUnstake(address user) external view returns (bool) {
        StakeInfo memory info = stakes[user];
        if (info.unstakeAmount == 0) return false;
        return block.timestamp >= info.unstakeRequestTime + UNSTAKE_COOLDOWN;
    }
}
