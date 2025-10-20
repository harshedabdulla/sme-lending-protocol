// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReputationNFT
 * @notice Soul-bound NFT that tracks member reputation in the DAO
 * @dev Non-transferable NFT that records backing history and success rate
 *
 * Key Features:
 * - Soul-bound (non-transferable) reputation tracking
 * - Records backing success/failure counts
 * - Reputation score calculation
 * - Used for governance weight and member status
 */
contract ReputationNFT is ERC721, Ownable {

    // Token ID counter
    uint256 private _nextTokenId;

    // Reputation Data
    struct Reputation {
        uint256 totalBacked;          // Total loans backed
        uint256 successfulBacked;     // Loans successfully repaid
        uint256 defaultedBacked;      // Loans that defaulted
        uint256 memberSince;          // Timestamp when member joined
        uint256 reputationScore;      // Calculated reputation score (0-1000)
    }

    // Mapping from token ID to reputation data
    mapping(uint256 => Reputation) public reputations;

    // Mapping from address to token ID (one NFT per address)
    mapping(address => uint256) public addressToTokenId;

    // Authorized contracts that can update reputation
    mapping(address => bool) public authorizedUpdaters;

    // Events
    event ReputationMinted(address indexed member, uint256 tokenId);
    event ReputationUpdated(address indexed member, uint256 tokenId, uint256 newScore);
    event BackingRecorded(address indexed member, bool successful);
    event UpdaterAuthorized(address indexed updater);
    event UpdaterRevoked(address indexed updater);

    constructor() ERC721("DAO Reputation", "DAOREP") Ownable(msg.sender) {
        _nextTokenId = 1; // Start token IDs at 1
    }

    // Modifiers
    modifier onlyAuthorizedUpdater() {
        require(authorizedUpdaters[msg.sender], "Not authorized to update reputation");
        _;
    }

    // Core Functions

    /**
     * @notice Mint a reputation NFT for a new DAO member
     * @param member Address of the new member
     * @return tokenId The minted token ID
     */
    function mintReputation(address member) external onlyAuthorizedUpdater returns (uint256) {
        require(member != address(0), "Invalid address");
        require(addressToTokenId[member] == 0, "Member already has reputation NFT");

        uint256 tokenId = _nextTokenId++;
        _safeMint(member, tokenId);

        reputations[tokenId] = Reputation({
            totalBacked: 0,
            successfulBacked: 0,
            defaultedBacked: 0,
            memberSince: block.timestamp,
            reputationScore: 500 // Start with neutral score
        });

        addressToTokenId[member] = tokenId;

        emit ReputationMinted(member, tokenId);
        return tokenId;
    }

    /**
     * @notice Record a backing action (loan backed by member)
     * @param member Address of the member
     * @param successful True if loan was repaid, false if defaulted
     */
    function recordBacking(address member, bool successful) external onlyAuthorizedUpdater {
        uint256 tokenId = addressToTokenId[member];
        require(tokenId != 0, "Member has no reputation NFT");

        Reputation storage rep = reputations[tokenId];
        rep.totalBacked++;

        if (successful) {
            rep.successfulBacked++;
        } else {
            rep.defaultedBacked++;
        }

        // Recalculate reputation score
        rep.reputationScore = calculateReputationScore(tokenId);

        emit BackingRecorded(member, successful);
        emit ReputationUpdated(member, tokenId, rep.reputationScore);
    }

    /**
     * @notice Calculate reputation score based on backing history
     * @param tokenId Token ID to calculate score for
     * @return score Reputation score (0-1000)
     */
    function calculateReputationScore(uint256 tokenId) public view returns (uint256) {
        Reputation memory rep = reputations[tokenId];

        // If no backing history, return starting score
        if (rep.totalBacked == 0) {
            return 500;
        }

        // Calculate success rate (0-1000 scale)
        uint256 successRate = (rep.successfulBacked * 1000) / rep.totalBacked;

        // Weight by total experience
        // More experience = score approaches success rate
        // Less experience = score stays closer to neutral (500)
        uint256 experienceWeight = rep.totalBacked > 50 ? 50 : rep.totalBacked;
        uint256 score = ((successRate * experienceWeight) + (500 * (50 - experienceWeight))) / 50;

        return score;
    }

    // Admin Functions

    /**
     * @notice Authorize a contract to update reputations
     * @param updater Address of the contract (e.g., DAOMembership, LoanVoting)
     */
    function authorizeUpdater(address updater) external onlyOwner {
        require(updater != address(0), "Invalid address");
        authorizedUpdaters[updater] = true;
        emit UpdaterAuthorized(updater);
    }

    /**
     * @notice Revoke updater authorization
     * @param updater Address to revoke
     */
    function revokeUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
        emit UpdaterRevoked(updater);
    }

    // Override Transfer Functions (Soul-bound)

    /**
     * @notice Override transfer to make NFT non-transferable
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0)) but prevent transfers
        require(from == address(0), "Reputation NFT is soul-bound and cannot be transferred");

        return super._update(to, tokenId, auth);
    }

    // View Functions

    /**
     * @notice Get reputation data for a member
     * @param member Address of the member
     * @return reputation Reputation struct
     */
    function getReputation(address member) external view returns (Reputation memory) {
        uint256 tokenId = addressToTokenId[member];
        require(tokenId != 0, "Member has no reputation NFT");
        return reputations[tokenId];
    }

    /**
     * @notice Get reputation score for a member
     * @param member Address of the member
     * @return score Reputation score (0-1000)
     */
    function getReputationScore(address member) external view returns (uint256) {
        uint256 tokenId = addressToTokenId[member];
        if (tokenId == 0) return 0;
        return reputations[tokenId].reputationScore;
    }

    /**
     * @notice Get success rate for a member
     * @param member Address of the member
     * @return successRate Success rate in basis points (0-10000)
     */
    function getSuccessRate(address member) external view returns (uint256) {
        uint256 tokenId = addressToTokenId[member];
        require(tokenId != 0, "Member has no reputation NFT");

        Reputation memory rep = reputations[tokenId];
        if (rep.totalBacked == 0) return 5000; // 50% for new members

        return (rep.successfulBacked * 10000) / rep.totalBacked;
    }

    /**
     * @notice Check if address has a reputation NFT
     * @param member Address to check
     * @return True if member has NFT
     */
    function hasMembership(address member) external view returns (bool) {
        return addressToTokenId[member] != 0;
    }

    /**
     * @notice Get total number of reputation NFTs minted
     * @return Total count
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}
