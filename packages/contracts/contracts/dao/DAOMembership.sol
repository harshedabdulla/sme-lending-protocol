// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./GovernanceToken.sol";
import "./ReputationNFT.sol";

/**
 * @title DAOMembership
 * @notice Manages DAO member admission through 2/3 majority voting
 * @dev Members vote to admit new members, who receive governance tokens and reputation NFTs
 *
 * Key Features:
 * - 2/3 majority vote required for new member admission
 * - Voting period with configurable duration
 * - Integration with GovernanceToken for voting power
 * - Automatic reputation NFT minting on admission
 * - Member status tracking
 */
contract DAOMembership is Ownable {

    GovernanceToken public governanceToken;
    ReputationNFT public reputationNFT;

    // Voting Configuration
    uint256 public constant VOTING_PERIOD = 5 minutes;
    uint256 public constant APPROVAL_THRESHOLD = 6667; // 66.67% (2/3 in basis points)
    uint256 public newMemberTokenGrant = 1000 * 10**18; // Tokens granted to new members

    // Membership Status
    enum MemberStatus {
        None,
        Pending,
        Active,
        Suspended
    }

    // Membership Proposal
    struct MembershipProposal {
        address candidate;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        bool approved;
        string reason; // Reason for admission
        mapping(address => bool) hasVoted;
    }

    // State Variables
    mapping(uint256 => MembershipProposal) public proposals;
    uint256 public proposalCount;

    mapping(address => MemberStatus) public memberStatus;
    address[] public members;
    uint256 public activeMemberCount;

    // Events
    event MembershipProposed(
        uint256 indexed proposalId,
        address indexed candidate,
        address indexed proposer,
        string reason
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votingPower
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed candidate,
        bool approved
    );
    event MemberAdmitted(address indexed member, uint256 tokenId);
    event MemberSuspended(address indexed member);
    event MemberReinstated(address indexed member);
    event NewMemberTokenGrantUpdated(uint256 newAmount);

    constructor(
        address _governanceToken,
        address _reputationNFT
    ) Ownable(msg.sender) {
        require(_governanceToken != address(0), "Invalid governance token");
        require(_reputationNFT != address(0), "Invalid reputation NFT");

        governanceToken = GovernanceToken(_governanceToken);
        reputationNFT = ReputationNFT(_reputationNFT);

        // Add contract deployer as first member
        memberStatus[msg.sender] = MemberStatus.Active;
        members.push(msg.sender);
        activeMemberCount = 1;
    }

    // Modifiers
    modifier onlyActiveMember() {
        require(memberStatus[msg.sender] == MemberStatus.Active, "Not an active member");
        _;
    }

    // Proposal Functions

    /**
     * @notice Propose a new member for admission
     * @param candidate Address of the candidate
     * @param reason Reason for proposing this member
     * @return proposalId The created proposal ID
     */
    function proposeMembership(
        address candidate,
        string calldata reason
    ) external onlyActiveMember returns (uint256) {
        require(candidate != address(0), "Invalid candidate address");
        require(memberStatus[candidate] == MemberStatus.None, "Candidate already member or pending");
        require(bytes(reason).length > 0, "Reason required");

        uint256 proposalId = proposalCount++;
        MembershipProposal storage proposal = proposals[proposalId];

        proposal.candidate = candidate;
        proposal.proposer = msg.sender;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + VOTING_PERIOD;
        proposal.reason = reason;

        // Proposer automatically votes yes
        uint256 proposerVotingPower = governanceToken.getVotingPower(msg.sender);
        require(proposerVotingPower > 0, "Must have staked tokens to propose");

        proposal.votesFor = proposerVotingPower;
        proposal.hasVoted[msg.sender] = true;

        // Mark candidate as pending
        memberStatus[candidate] = MemberStatus.Pending;

        emit MembershipProposed(proposalId, candidate, msg.sender, reason);
        emit VoteCast(proposalId, msg.sender, true, proposerVotingPower);

        return proposalId;
    }

    /**
     * @notice Vote on a membership proposal
     * @param proposalId ID of the proposal
     * @param support True to vote for, false to vote against
     */
    function vote(uint256 proposalId, bool support) external onlyActiveMember {
        MembershipProposal storage proposal = proposals[proposalId];

        require(block.timestamp <= proposal.endTime, "Voting period ended");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        uint256 votingPower = governanceToken.getVotingPower(msg.sender);
        require(votingPower > 0, "Must have staked tokens to vote");

        proposal.hasVoted[msg.sender] = true;

        if (support) {
            proposal.votesFor += votingPower;
        } else {
            proposal.votesAgainst += votingPower;
        }

        emit VoteCast(proposalId, msg.sender, support, votingPower);
    }

    /**
     * @notice Execute a membership proposal after voting period
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external {
        MembershipProposal storage proposal = proposals[proposalId];

        require(block.timestamp > proposal.endTime, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");

        proposal.executed = true;

        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        require(totalVotes > 0, "No votes cast");

        // Check if 2/3 approval threshold met
        uint256 approvalPercentage = (proposal.votesFor * 10000) / totalVotes;
        bool approved = approvalPercentage >= APPROVAL_THRESHOLD;

        proposal.approved = approved;

        if (approved) {
            // Admit member
            memberStatus[proposal.candidate] = MemberStatus.Active;
            members.push(proposal.candidate);
            activeMemberCount++;

            // Mint reputation NFT
            uint256 tokenId = reputationNFT.mintReputation(proposal.candidate);

            // Grant governance tokens
            if (newMemberTokenGrant > 0) {
                governanceToken.mint(proposal.candidate, newMemberTokenGrant);
            }

            emit MemberAdmitted(proposal.candidate, tokenId);
        } else {
            // Rejection - reset status
            memberStatus[proposal.candidate] = MemberStatus.None;
        }

        emit ProposalExecuted(proposalId, proposal.candidate, approved);
    }

    // Admin Functions

    /**
     * @notice Suspend a member (emergency action)
     * @param member Address to suspend
     */
    function suspendMember(address member) external onlyOwner {
        require(memberStatus[member] == MemberStatus.Active, "Member not active");
        memberStatus[member] = MemberStatus.Suspended;
        activeMemberCount--;
        emit MemberSuspended(member);
    }

    /**
     * @notice Reinstate a suspended member
     * @param member Address to reinstate
     */
    function reinstateMember(address member) external onlyOwner {
        require(memberStatus[member] == MemberStatus.Suspended, "Member not suspended");
        memberStatus[member] = MemberStatus.Active;
        activeMemberCount++;
        emit MemberReinstated(member);
    }

    /**
     * @notice Update token grant amount for new members
     * @param amount New token grant amount
     */
    function setNewMemberTokenGrant(uint256 amount) external onlyOwner {
        newMemberTokenGrant = amount;
        emit NewMemberTokenGrantUpdated(amount);
    }

    // View Functions

    /**
     * @notice Get proposal details
     * @param proposalId ID of the proposal
     * @return candidate Candidate address
     * @return proposer Proposer address
     * @return startTime Start timestamp
     * @return endTime End timestamp
     * @return votesFor Votes in favor
     * @return votesAgainst Votes against
     * @return executed Whether proposal was executed
     * @return approved Whether proposal was approved
     * @return reason Reason for admission
     */
    function getProposal(uint256 proposalId) external view returns (
        address candidate,
        address proposer,
        uint256 startTime,
        uint256 endTime,
        uint256 votesFor,
        uint256 votesAgainst,
        bool executed,
        bool approved,
        string memory reason
    ) {
        MembershipProposal storage proposal = proposals[proposalId];
        return (
            proposal.candidate,
            proposal.proposer,
            proposal.startTime,
            proposal.endTime,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.executed,
            proposal.approved,
            proposal.reason
        );
    }

    /**
     * @notice Check if address has voted on a proposal
     * @param proposalId Proposal ID
     * @param voter Address to check
     * @return True if voter has voted
     */
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }

    /**
     * @notice Get all members
     * @return Array of member addresses
     */
    function getMembers() external view returns (address[] memory) {
        return members;
    }

    /**
     * @notice Get active member count
     * @return Count of active members
     */
    function getActiveMemberCount() external view returns (uint256) {
        return activeMemberCount;
    }

    /**
     * @notice Check if address is an active member
     * @param account Address to check
     * @return True if active member
     */
    function isActiveMember(address account) external view returns (bool) {
        return memberStatus[account] == MemberStatus.Active;
    }

    /**
     * @notice Calculate current approval percentage for a proposal
     * @param proposalId Proposal ID
     * @return Approval percentage in basis points
     */
    function getApprovalPercentage(uint256 proposalId) external view returns (uint256) {
        MembershipProposal storage proposal = proposals[proposalId];
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        if (totalVotes == 0) return 0;
        return (proposal.votesFor * 10000) / totalVotes;
    }
}
