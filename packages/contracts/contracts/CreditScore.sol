// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CreditScore
 * @notice Manages credit scores for borrowers in the SME lending protocol
 * @dev Uses AccessControl for role-based permissions (oracle role for score updates)
 */
contract CreditScore is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // Mapping from user address to their credit score
    mapping(address => uint256) private creditScores;

    // Events
    event ScoreUpdated(address indexed user, uint256 newScore, uint256 timestamp);
    event OracleAdded(address indexed oracle);
    event OracleRemoved(address indexed oracle);

    /**
     * @notice Constructor sets up admin and initial oracle
     * @param _initialOracle Address of the initial oracle that can update scores
     */
    constructor(address _initialOracle) {
        require(_initialOracle != address(0), "Invalid oracle address");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, _initialOracle);

        emit OracleAdded(_initialOracle);
    }

    /**
     * @notice Updates the credit score for a user
     * @dev Only callable by addresses with ORACLE_ROLE
     * @param user Address of the user
     * @param score New credit score (0-1000 scale)
     */
    function updateScore(address user, uint256 score) external onlyRole(ORACLE_ROLE) {
        require(user != address(0), "Invalid user address");
        require(score <= 1000, "Score must be between 0 and 1000");

        creditScores[user] = score;
        emit ScoreUpdated(user, score, block.timestamp);
    }

    /**
     * @notice Batch update credit scores for multiple users
     * @dev Only callable by addresses with ORACLE_ROLE
     * @param users Array of user addresses
     * @param scores Array of credit scores corresponding to users
     */
    function updateScoresBatch(address[] calldata users, uint256[] calldata scores)
        external
        onlyRole(ORACLE_ROLE)
    {
        require(users.length == scores.length, "Arrays length mismatch");
        require(users.length > 0, "Empty arrays");

        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid user address");
            require(scores[i] <= 1000, "Score must be between 0 and 1000");

            creditScores[users[i]] = scores[i];
            emit ScoreUpdated(users[i], scores[i], block.timestamp);
        }
    }

    /**
     * @notice Gets the credit score for a user
     * @param user Address of the user
     * @return The user's credit score (0 if never set)
     */
    function getScore(address user) external view returns (uint256) {
        return creditScores[user];
    }

    /**
     * @notice Gets credit scores for multiple users
     * @param users Array of user addresses
     * @return Array of credit scores corresponding to users
     */
    function getScoresBatch(address[] calldata users) external view returns (uint256[] memory) {
        uint256[] memory scores = new uint256[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            scores[i] = creditScores[users[i]];
        }
        return scores;
    }

    /**
     * @notice Checks if a user has a minimum required credit score
     * @param user Address of the user
     * @param minScore Minimum required score
     * @return True if user's score >= minScore
     */
    function hasMinimumScore(address user, uint256 minScore) external view returns (bool) {
        return creditScores[user] >= minScore;
    }

    /**
     * @notice Adds a new oracle address
     * @dev Only callable by admin
     * @param oracle Address to grant oracle role
     */
    function addOracle(address oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(oracle != address(0), "Invalid oracle address");
        grantRole(ORACLE_ROLE, oracle);
        emit OracleAdded(oracle);
    }

    /**
     * @notice Removes an oracle address
     * @dev Only callable by admin
     * @param oracle Address to revoke oracle role
     */
    function removeOracle(address oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ORACLE_ROLE, oracle);
        emit OracleRemoved(oracle);
    }

    /**
     * @notice Checks if an address has oracle role
     * @param account Address to check
     * @return True if address is an oracle
     */
    function isOracle(address account) external view returns (bool) {
        return hasRole(ORACLE_ROLE, account);
    }
}
