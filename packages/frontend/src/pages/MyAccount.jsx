import React, { useState, useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { CONTRACT_ADDRESSES, ABIS } from '../config/contracts';
import { useNexus } from '../contexts/NexusContext';
import {
  User,
  Coins,
  Shield,
  Globe,
  Wallet,
  Lock,
  Unlock,
  TrendingUp,
  Award,
  AlertCircle,
  Settings
} from 'lucide-react';

const StakeCard = ({ stakeInfo, onStake, onUnstake, onRequestUnstake, isProcessing, isSuccess }) => {
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState('stake');

  const stakedAmount = stakeInfo?.[0] || 0n;
  const unstakeAmount = stakeInfo?.[1] || 0n;
  const unstakeAvailableAt = stakeInfo?.[2] || 0n;

  const canUnstake = unstakeAvailableAt > 0n && Number(unstakeAvailableAt) <= Date.now() / 1000;

  return (
    <div className="card-bordered">
      <h3 className="text-lg font-semibold text-gray-100 mb-6 flex items-center space-x-2">
        <Lock className="w-5 h-5 text-gray-500" />
        <span>Staking</span>
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card">
          <span className="stat-label">Staked</span>
          <div className="stat-value text-xl">{formatUnits(stakedAmount, 18)}</div>
          <span className="text-xs text-gray-600 font-mono">SMEDAO</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Unstaking</span>
          <div className="stat-value text-xl text-amber-400">{formatUnits(unstakeAmount, 18)}</div>
          <span className="text-xs text-gray-600 font-mono">SMEDAO</span>
        </div>
      </div>

      {unstakeAmount > 0n && (
        <div className="mb-6 card-bordered border-amber-900/20 bg-amber-950/10">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-400 mb-1">Unstake Request Pending</p>
              <p className="text-xs text-gray-400">
                {canUnstake
                  ? 'Available for withdrawal now'
                  : `Available in ${Math.ceil((Number(unstakeAvailableAt) - Date.now() / 1000) / 60)} min`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-1 border-b border-gray-900 mb-6">
        <button
          onClick={() => setAction('stake')}
          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${action === 'stake'
            ? 'border-blue-500 text-gray-100'
            : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Stake
        </button>
        <button
          onClick={() => setAction('unstake')}
          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${action === 'unstake'
            ? 'border-blue-500 text-gray-100'
            : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Unstake
        </button>
      </div>

      <div className="space-y-4">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={action === 'stake' ? 'Amount to stake' : 'Amount to unstake'}
          className="input"
        />

        {action === 'stake' ? (
          <button
            onClick={() => onStake(amount)}
            disabled={!amount || isProcessing}
            className="w-full btn-primary"
          >
            {isProcessing ? 'Processing...' : 'Stake Tokens'}
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => onRequestUnstake(amount)}
              disabled={!amount || isProcessing}
              className="w-full btn-secondary"
            >
              {isProcessing ? 'Processing...' : 'Request Unstake'}
            </button>
            {canUnstake && (
              <button
                onClick={onUnstake}
                disabled={isProcessing}
                className="w-full btn-primary"
              >
                <Unlock className="w-4 h-4 inline mr-2" />
                {isProcessing ? 'Processing...' : 'Withdraw Unstaked Tokens'}
              </button>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="text-xs text-blue-400 text-center">
            Transaction pending... Check MetaMask
          </div>
        )}

        {isSuccess && (
          <div className="text-xs text-emerald-400 text-center">Transaction confirmed!</div>
        )}
      </div>
    </div>
  );
};

export default function MyAccount() {
  const { address, isConnected } = useAccount();
  const { nexus } = useNexus();

  const [unifiedBalances, setUnifiedBalances] = useState({});
  const [crossChainStats, setCrossChainStats] = useState({
    totalVotes: 0,
    crossChainProposals: 0,
    activeGovernance: 0,
  });
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: CONTRACT_ADDRESSES.governanceToken,
        abi: ABIS.governanceToken,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACT_ADDRESSES.governanceToken,
        abi: ABIS.governanceToken,
        functionName: 'getStakeInfo',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACT_ADDRESSES.governanceToken,
        abi: ABIS.governanceToken,
        functionName: 'getVotingPower',
        args: address ? [address] : undefined,
      },
    ],
    watch: true,
  });

  const tokenBalance = data?.[0]?.result ? formatUnits(data[0].result, 18) : '0';
  const stakeInfo = data?.[1]?.result;
  const votingPower = data?.[2]?.result ? formatUnits(data[2].result, 18) : '0';

  // --- Load Nexus Cross-Chain Data ---
  useEffect(() => {
    if (!nexus || !isConnected) return;

    const fetchCrossChain = async () => {
      setLoading(true);
      try {
        const balances = await nexus.getUnifiedBalances();
        const safeBalances = balances ?? {};
        setUnifiedBalances(safeBalances);
        setCrossChainStats({
          totalVotes: safeBalances.totalVotes ?? 0,
          crossChainProposals: safeBalances.crossChainProposals ?? 0,
          activeGovernance: safeBalances.activeGovernance ?? 0,
        });
      } catch (err) {
        console.error('Failed to load Nexus balances:', err);
        setUnifiedBalances({});
        setCrossChainStats({ totalVotes: 0, crossChainProposals: 0, activeGovernance: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchCrossChain();
  }, [nexus, isConnected]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card text-center max-w-md py-12">
          <User className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-100 mb-2">Connect Wallet</h2>
          <p className="text-sm text-gray-400">Connect your wallet to view your account details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-100">Account</h1>
        <p className="text-sm text-gray-500">Manage your DAO membership, staking, and cross-chain activity</p>
      </div>
      {/* Account Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-blue-400" />
            <span>Wallet Status</span>
          </h3>

          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm text-emerald-400">Connected</span>
              </div>
              <div className="text-sm text-gray-400 font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-sm text-gray-500">Not Connected</span>
              </div>
              <p className="text-sm text-gray-500">Connect your wallet to get started</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <span>Nexus Status</span>
          </h3>

          {nexus ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm text-emerald-400">Nexus Connected</span>
              </div>
              <p className="text-sm text-gray-500">Cross-chain features enabled</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-sm text-gray-500">Nexus Not Connected</span>
              </div>
              <p className="text-sm text-gray-500">Connect wallet to enable Nexus</p>
            </div>
          )}
        </div>
      </div>

      {/* Membership Status */}
      <div className="card-bordered">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100">Membership Status</h2>
          <span className="badge-success">Active Member</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card hover:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="stat-label">Reputation Score</span>
              <Award className="w-4 h-4 text-gray-600" />
            </div>
            <div className="stat-value">{/* pull from contracts or user profile */}850/1000</div>
          </div>

          <div className="stat-card hover:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="stat-label">Voting Power</span>
              <TrendingUp className="w-4 h-4 text-gray-600" />
            </div>
            <div className="stat-value text-gray-100">{parseFloat(votingPower).toFixed(2)}</div>
          </div>

          <div className="stat-card hover:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="stat-label">Member Since</span>
              <Shield className="w-4 h-4 text-gray-600" />
            </div>
            <div className="stat-value text-lg">Genesis</div>
          </div>
        </div>
      </div>

      {/* Balances & Staking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-100 mb-6 flex items-center space-x-2">
            <Coins className="w-5 h-5 text-gray-500" />
            <span>Token Balances</span>
          </h3>

          <div className="space-y-4">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="stat-label">Prism Token</span>
                <span className="text-xs text-gray-600 font-mono">Governance</span>
              </div>
              <div className="stat-value">
                {parseFloat(tokenBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="stat-label">Cross-Chain Votes</span>
              </div>
              <div className="stat-value">{crossChainStats.totalVotes}</div>
            </div>
          </div>
        </div>

        <StakeCard
          stakeInfo={stakeInfo}
          onStake={() => { }}
          onUnstake={() => { }}
          onRequestUnstake={() => { }}
          isProcessing={false}
          isSuccess={false}
        />
      </div>

      {/* Cross-Chain Activity */}
      {nexus && (
        <div className="card border-blue-900/20 bg-blue-950/10">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <span>Cross-Chain Activity</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-semibold text-gray-100">{crossChainStats.crossChainProposals}</div>
              <div className="text-xs text-gray-500 mt-1">Cross-Chain Proposals</div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-semibold text-gray-100">{crossChainStats.activeGovernance}</div>
              <div className="text-xs text-gray-500 mt-1">Active Governance</div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-semibold text-gray-100">{/* add volume if available */}0</div>
              <div className="text-xs text-gray-500 mt-1">Total Volume</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}