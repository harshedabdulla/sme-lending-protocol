import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { CONTRACTS, ABIS } from '../config/contracts';
import { useState } from 'react';
import {
  User,
  Coins,
  Shield,
  TrendingUp,
  Award,
  Lock,
  Unlock,
  AlertCircle,
} from 'lucide-react';

const StakeCard = ({ stakeInfo, onStake, onUnstake, onRequestUnstake }) => {
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState('stake');

  const stakedAmount = stakeInfo?.[0] || 0n;
  const unstakeAmount = stakeInfo?.[1] || 0n;
  const unstakeAvailableAt = stakeInfo?.[2] || 0n;

  const canUnstake = unstakeAvailableAt > 0n &&
    Number(unstakeAvailableAt) <= Date.now() / 1000;

  return (
    <div className="card-bordered">
      <h3 className="text-lg font-semibold text-gray-100 mb-6 flex items-center space-x-2">
        <Lock className="w-5 h-5 text-gray-500" />
        <span>Staking</span>
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card">
          <span className="stat-label">Staked</span>
          <div className="stat-value text-xl">
            {formatUnits(stakedAmount, 18)}
          </div>
          <span className="text-xs text-gray-600 font-mono">SMEDAO</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Unstaking</span>
          <div className="stat-value text-xl text-amber-400">
            {formatUnits(unstakeAmount, 18)}
          </div>
          <span className="text-xs text-gray-600 font-mono">SMEDAO</span>
        </div>
      </div>

      {unstakeAmount > 0n && (
        <div className="mb-6 card-bordered border-amber-900/20 bg-amber-950/10">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-400 mb-1">
                Unstake Request Pending
              </p>
              <p className="text-xs text-gray-400">
                {canUnstake
                  ? 'Available for withdrawal now'
                  : `Available in ${Math.ceil((Number(unstakeAvailableAt) - Date.now() / 1000) / 86400)} days`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-1 border-b border-gray-900 mb-6">
        <button
          onClick={() => setAction('stake')}
          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            action === 'stake'
              ? 'border-blue-500 text-gray-100'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Stake
        </button>
        <button
          onClick={() => setAction('unstake')}
          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            action === 'unstake'
              ? 'border-blue-500 text-gray-100'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
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
            disabled={!amount}
            className="w-full btn-primary"
          >
            Stake Tokens
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => onRequestUnstake(amount)}
              disabled={!amount}
              className="w-full btn-secondary"
            >
              Request Unstake
            </button>
            {canUnstake && (
              <button
                onClick={onUnstake}
                className="w-full btn-primary"
              >
                <Unlock className="w-4 h-4 inline mr-2" />
                Withdraw Unstaked Tokens
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 card bg-zinc-950/30">
        <h4 className="text-sm font-medium text-gray-300 mb-3">
          Staking Info
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Minimum Stake:</span>
            <span className="text-gray-300 font-mono">100 SMEDAO</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Unstake Cooldown:</span>
            <span className="text-gray-300 font-mono">7 days</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Slash Penalty:</span>
            <span className="text-red-400 font-mono">10%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MyAccount() {
  const { address, isConnected } = useAccount();

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.sepolia.governanceToken,
        abi: ABIS.governanceToken,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.sepolia.governanceToken,
        abi: ABIS.governanceToken,
        functionName: 'getStakeInfo',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.sepolia.governanceToken,
        abi: ABIS.governanceToken,
        functionName: 'getVotingPower',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.sepolia.reputationNFT,
        abi: ABIS.reputationNFT,
        functionName: 'hasMembership',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.sepolia.reputationNFT,
        abi: ABIS.reputationNFT,
        functionName: 'getReputationScore',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.sepolia.mockUSDT,
        abi: ABIS.mockUSDT,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
      },
    ],
    watch: true,
  });

  const tokenBalance = data?.[0]?.result ? formatUnits(data[0].result, 18) : '0';
  const stakeInfo = data?.[1]?.result;
  const votingPower = data?.[2]?.result ? formatUnits(data[2].result, 18) : '0';
  const isMember = data?.[3]?.result ?? false;
  const reputationScore = data?.[4]?.result ? data[4].result.toString() : '0';
  const usdtBalance = data?.[5]?.result ? formatUnits(data[5].result, 6) : '0';

  const handleStake = async (amount) => {
    if (!amount) return;
    try {
      writeContract({
        address: CONTRACTS.sepolia.governanceToken,
        abi: ABIS.governanceToken,
        functionName: 'stake',
        args: [parseUnits(amount, 18)],
      });
    } catch (error) {
      console.error('Error staking:', error);
    }
  };

  const handleRequestUnstake = async (amount) => {
    if (!amount) return;
    try {
      writeContract({
        address: CONTRACTS.sepolia.governanceToken,
        abi: ABIS.governanceToken,
        functionName: 'requestUnstake',
        args: [parseUnits(amount, 18)],
      });
    } catch (error) {
      console.error('Error requesting unstake:', error);
    }
  };

  const handleUnstake = async () => {
    try {
      writeContract({
        address: CONTRACTS.sepolia.governanceToken,
        abi: ABIS.governanceToken,
        functionName: 'unstake',
      });
    } catch (error) {
      console.error('Error unstaking:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card text-center max-w-md py-12">
          <User className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-100 mb-2">Connect Wallet</h2>
          <p className="text-sm text-gray-400">
            Connect your wallet to view your account details
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-100">Account</h1>
        <p className="text-sm text-gray-500">
          Manage your DAO membership, staking, and reputation
        </p>
      </div>

      {/* Membership Status */}
      <div className="card-bordered">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100">Membership Status</h2>
          {isMember ? (
            <span className="badge-success">Active Member</span>
          ) : (
            <span className="badge-warning">Not a Member</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card hover:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="stat-label">Reputation Score</span>
              <Award className="w-4 h-4 text-gray-600" />
            </div>
            <div className="stat-value">{reputationScore}/1000</div>
          </div>

          <div className="stat-card hover:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="stat-label">Voting Power</span>
              <TrendingUp className="w-4 h-4 text-gray-600" />
            </div>
            <div className="stat-value">{parseFloat(votingPower).toFixed(2)}</div>
          </div>

          <div className="stat-card hover:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="stat-label">Member Since</span>
              <Shield className="w-4 h-4 text-gray-600" />
            </div>
            <div className="stat-value text-lg">{isMember ? 'Genesis' : 'N/A'}</div>
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
                <span className="stat-label">USDT</span>
                <span className="text-xs text-gray-600 font-mono">Stablecoin</span>
              </div>
              <div className="stat-value text-emerald-400">
                ${parseFloat(usdtBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <StakeCard
          stakeInfo={stakeInfo}
          onStake={handleStake}
          onUnstake={handleUnstake}
          onRequestUnstake={handleRequestUnstake}
        />
      </div>

      {/* Activity History */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Recent Activity</h3>
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No recent activity</p>
        </div>
      </div>
    </div>
  );
}
