import { useState, useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES, DAO_CONFIG } from '../config/contracts';
import { createCrossChainIntent, getUnifiedBalances } from '../lib/nexus';
import { useNexus } from '../contexts/NexusContext';
import { Users, UserPlus, Vote, CheckCircle, XCircle, Clock, Globe, Zap, Shield } from 'lucide-react';

const ProposalCard = ({ proposal, proposalId, onVote }) => {
  const { address } = useAccount();

  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = totalVotes > 0n ? Number((proposal.votesFor * 10000n) / totalVotes) / 100 : 0;
  const againstPercentage = 100 - forPercentage;

  const isActive = !proposal.executed && Number(proposal.endTime) > Date.now() / 1000;
  const daysLeft = Math.ceil((Number(proposal.endTime) - Date.now() / 1000) / 86400);

  return (
    <div className="card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <div className="text-xs text-gray-500 font-mono">Proposal #{proposalId}</div>
          <div className="text-xs text-gray-600 font-mono">
            Candidate: {proposal.candidate.slice(0, 6)}...{proposal.candidate.slice(-4)}
          </div>
          <div className="text-xs text-gray-600 font-mono">
            By: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
          </div>
        </div>
        <div>
          {proposal.executed ? (
            proposal.approved ? (
              <span className="badge-success">Approved</span>
            ) : (
              <span className="badge-danger">Rejected</span>
            )
          ) : (
            <span className="badge-warning">Active</span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm font-medium text-gray-300 mb-1">Reason</div>
        <p className="text-sm text-gray-500">{proposal.reason}</p>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">For</span>
            <span className="text-xs text-emerald-400 font-mono">{forPercentage.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${forPercentage}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Against</span>
            <span className="text-xs text-red-400 font-mono">{againstPercentage.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
              style={{ width: `${againstPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {isActive && (
        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
          <Clock className="w-3.5 h-3.5" />
          <span>Ends in {daysLeft} days</span>
        </div>
      )}

      {isActive && (
        <div className="flex space-x-2">
          <button onClick={() => onVote(proposalId, true)} className="flex-1 btn-secondary text-sm">
            <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />
            For
          </button>
          <button onClick={() => onVote(proposalId, false)} className="flex-1 btn-danger text-sm">
            <XCircle className="w-3.5 h-3.5 inline mr-1.5" />
            Against
          </button>
        </div>
      )}

      {proposal.executed && (
        <div className="text-center p-3 rounded-lg bg-zinc-950/30 border border-gray-900">
          <p className="text-sm text-gray-400">
            {proposal.approved ? '✓ Member admitted to DAO' : '✗ Proposal rejected'}
          </p>
        </div>
      )}
    </div>
  );
};

export default function Members() {
  const { address, isConnected } = useAccount();
  const { nexus } = useNexus();
  const [candidateAddress, setCandidateAddress] = useState('');
  const [reason, setReason] = useState('');
  const [activeTab, setActiveTab] = useState('proposals');
  const [unifiedBalances, setUnifiedBalances] = useState(null);
  const [crossChainStats, setCrossChainStats] = useState({
    totalVotes: 0,
    crossChainProposals: 0,
    activeGovernance: 0,
  });

  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Load cross-chain data
  useEffect(() => {
    if (nexus && isConnected) {
      loadCrossChainData();
    }
  }, [nexus, isConnected]);

  const loadCrossChainData = async () => {
    try {
      const balances = await getUnifiedBalances();
      setUnifiedBalances(balances);

      setCrossChainStats({
        totalVotes: balances?.totalVotes || 0,
        crossChainProposals: balances?.crossChainProposals || 0,
        activeGovernance: balances?.activeGovernance || 0,
      });
    } catch (error) {
      console.error("Failed to load cross-chain data:", error);
    }
  };

  // Mock data for demonstration
  const mockData = {
    memberCount: "156",
    proposalCount: 3,
    totalNFTs: "156",
  };

  const memberCount = mockData.memberCount;
  const proposalCount = mockData.proposalCount;
  const totalNFTs = mockData.totalNFTs;

  // Mock proposals data
  const mockProposals = [
    {
      candidate: "0x1234567890123456789012345678901234567890",
      proposer: "0x9876543210987654321098765432109876543210",
      startTime: Math.floor(Date.now() / 1000) - 86400,
      endTime: Math.floor(Date.now() / 1000) + 518400,
      votesFor: 15n,
      votesAgainst: 3n,
      executed: false,
      approved: false,
      reason: "Experienced DeFi developer with strong reputation in the community",
    },
    {
      candidate: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      proposer: "0xfedcbafedcbafedcbafedcbafedcbafedcbafedc",
      startTime: Math.floor(Date.now() / 1000) - 172800,
      endTime: Math.floor(Date.now() / 1000) + 432000,
      votesFor: 8n,
      votesAgainst: 12n,
      executed: false,
      approved: false,
      reason: "Active contributor to lending protocols and governance systems",
    },
    {
      candidate: "0x1111222233334444555566667777888899990000",
      proposer: "0x0000999988887777666655554444333322221111",
      startTime: Math.floor(Date.now() / 1000) - 259200,
      endTime: Math.floor(Date.now() / 1000) + 345600,
      votesFor: 25n,
      votesAgainst: 5n,
      executed: true,
      approved: true,
      reason: "Long-time community member with excellent track record",
    },
  ];

  const handlePropose = async () => {
    if (!candidateAddress || !reason) return;

    try {
      // Create cross-chain intent for proposal
      if (nexus) {
        const intentData = {
          type: 'dao_proposal',
          fromChain: 'ethereum',
          toChain: 'ethereum', // Same chain for now
          candidate: candidateAddress,
          proposer: address,
          reason: reason,
          proposalType: 'membership',
        };

        const intent = await createCrossChainIntent(intentData);
        console.log('Cross-chain DAO proposal intent created:', intent);
      }

      // Mock proposal creation
      console.log('Creating proposal:', {
        candidate: candidateAddress,
        reason: reason,
        proposer: address,
      });

      setCandidateAddress('');
      setReason('');
    } catch (error) {
      console.error('Error proposing member:', error);
    }
  };

  const handleVote = async (proposalId, support) => {
    try {
      // Create cross-chain intent for voting
      if (nexus) {
        const intentData = {
          type: 'dao_vote',
          fromChain: 'ethereum',
          toChain: 'ethereum',
          proposalId: proposalId,
          voter: address,
          support: support,
          votingPower: 1000, // Mock voting power
        };

        const intent = await createCrossChainIntent(intentData);
        console.log('Cross-chain DAO vote intent created:', intent);
      }

      // Mock voting
      console.log('Voting on proposal:', {
        proposalId: proposalId,
        support: support,
        voter: address,
      });
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-100">Members</h1>
        <p className="text-sm text-gray-500">
          Propose new members and vote on membership proposals
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card hover:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="stat-label">Active Members</span>
            <Users className="w-4 h-4 text-gray-600" />
          </div>
          <div className="stat-value">{memberCount}</div>
        </div>

        <div className="stat-card hover:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="stat-label">Total Proposals</span>
            <Vote className="w-4 h-4 text-gray-600" />
          </div>
          <div className="stat-value">{proposalCount}</div>
        </div>

        <div className="stat-card hover:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="stat-label">Reputation NFTs</span>
            <UserPlus className="w-4 h-4 text-gray-600" />
          </div>
          <div className="stat-value">{totalNFTs}</div>
        </div>
      </div>

      {/* Cross-Chain DAO Status */}
      {nexus && (
        <div className="card border-blue-900/20 bg-blue-950/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-blue-400" />
              <span>Cross-Chain DAO Governance</span>
            </h3>
            <div className="flex items-center space-x-2 text-sm text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Nexus Connected</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-semibold text-gray-100">
                {crossChainStats.totalVotes}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total Cross-Chain Votes</div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-semibold text-gray-100">
                {crossChainStats.crossChainProposals}
              </div>
              <div className="text-xs text-gray-500 mt-1">Cross-Chain Proposals</div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-semibold text-gray-100">
                {crossChainStats.activeGovernance}
              </div>
              <div className="text-xs text-gray-500 mt-1">Active Governance</div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-blue-400 mb-2">
              <Shield className="w-4 h-4" />
              <span>Cross-Chain DAO Features</span>
            </div>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Multi-chain proposal creation and voting</li>
              <li>• Unified governance across chains</li>
              <li>• Cross-chain reputation tracking</li>
              <li>• Decentralized decision making</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-900">
        {['proposals', 'members', 'propose'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                ? 'border-blue-500 text-gray-100'
                : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
          >
            {tab === 'proposals' && 'Proposals'}
            {tab === 'members' && 'All Members'}
            {tab === 'propose' && 'Propose Member'}
          </button>
        ))}
      </div>

      {/* Proposals Tab */}
      {activeTab === 'proposals' && (
        <div>
          {!isConnected ? (
            <div className="card text-center py-12">
              <Vote className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-400">
                Connect your wallet to view and vote on proposals
              </p>
            </div>
          ) : proposalCount === 0 ? (
            <div className="card text-center py-12">
              <Vote className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-400 mb-2">No membership proposals yet</p>
              <p className="text-xs text-gray-600">
                Be the first to propose a new member
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockProposals.map((proposal, i) => (
                <ProposalCard
                  key={i}
                  proposalId={i}
                  proposal={proposal}
                  onVote={handleVote}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-sm text-gray-400 mb-2">
            {memberCount} Active Members
          </p>
          <p className="text-xs text-gray-600">
            Member directory coming soon
          </p>
        </div>
      )}

      {/* Propose Tab */}
      {activeTab === 'propose' && (
        <div className="max-w-2xl">
          <div className="card-bordered">
            <h2 className="text-lg font-semibold text-gray-100 mb-6">Propose New Member</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Candidate Address
                </label>
                <input
                  type="text"
                  value={candidateAddress}
                  onChange={(e) => setCandidateAddress(e.target.value)}
                  placeholder="0x..."
                  className="input font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Reason for Membership
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why should this address be granted DAO membership?"
                  rows={4}
                  className="input resize-none"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Provide a clear reason for the membership proposal
                </p>
              </div>

              <div className="card bg-zinc-950/30">
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  Voting Requirements
                </h3>
                <ul className="space-y-2 text-xs text-gray-400">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400">•</span>
                    <span>2/3 majority (66.67%) required for approval</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400">•</span>
                    <span>7-day voting period</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400">•</span>
                    <span>Must stake governance tokens to vote</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400">•</span>
                    <span>Approved members receive Reputation NFT</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handlePropose}
                disabled={!candidateAddress || !reason || isPending || isConfirming || !isConnected}
                className="w-full btn-primary"
              >
                {isPending && 'Waiting for signature...'}
                {isConfirming && 'Confirming transaction...'}
                {!isPending && !isConfirming && 'Submit Proposal'}
              </button>

              {hash && (
                <div className="text-center space-y-2">
                  {isConfirming && (
                    <p className="text-sm text-amber-400">
                      ⏳ Transaction submitted, waiting for confirmation...
                    </p>
                  )}
                  {isConfirmed && (
                    <p className="text-sm text-emerald-400">
                      ✅ Proposal created successfully! Check the Proposals tab.
                    </p>
                  )}
                  <p className="text-xs text-gray-600 font-mono">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-400"
                    >
                      View on Etherscan ↗
                    </a>
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm text-center text-red-400">
                  ❌ Error: {error.message}
                </p>
              )}

              {!isConnected && (
                <p className="text-sm text-center text-gray-600">
                  Connect wallet to propose a new member
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
