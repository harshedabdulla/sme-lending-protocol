import { useAccount, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { Link } from 'react-router-dom';
import { CONTRACTS, ABIS } from '../config/contracts';
import {
  TrendingUp,
  Users,
  Coins,
  Shield,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, loading }) => (
  <div className="stat-card hover:border-gray-800 group">
    <div className="flex items-center justify-between">
      <span className="stat-label">{label}</span>
      <Icon className="w-4 h-4 text-gray-600 group-hover:text-gray-500 transition-colors" />
    </div>
    <div className="stat-value">
      {loading ? (
        <div className="spinner" />
      ) : (
        value
      )}
    </div>
  </div>
);

const InfoCard = ({ title, items }) => (
  <div className="card-hover">
    <h3 className="text-sm font-semibold text-gray-100 mb-4">{title}</h3>
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex items-start space-x-3">
          <div className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-gray-300">{item.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function Dashboard() {
  const { address, isConnected } = useAccount();

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.sepolia.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'getTotalValueLocked',
      },
      {
        address: CONTRACTS.sepolia.reputationNFT,
        abi: ABIS.reputationNFT,
        functionName: 'totalSupply',
      },
      {
        address: CONTRACTS.sepolia.loanManager,
        abi: ABIS.loanManager,
        functionName: 'totalActiveLoans',
      },
      {
        address: CONTRACTS.sepolia.loanManager,
        abi: ABIS.loanManager,
        functionName: 'totalLoansDisbursed',
      },
      {
        address: CONTRACTS.sepolia.insurancePool,
        abi: ABIS.insurancePool,
        functionName: 'getTotalBalance',
      },
      {
        address: CONTRACTS.sepolia.insurancePool,
        abi: ABIS.insurancePool,
        functionName: 'isHealthy',
      },
      {
        address: CONTRACTS.sepolia.reputationNFT,
        abi: ABIS.reputationNFT,
        functionName: 'hasMembership',
        args: address ? [address] : undefined,
      },
    ],
    watch: true,
  });

  const tvl = data?.[0]?.result ? formatUnits(data[0].result, 6) : '0';
  const memberCount = data?.[1]?.result ? data[1].result.toString() : '0';
  const activeLoans = data?.[2]?.result ? data[2].result.toString() : '0';
  const totalLoans = data?.[3]?.result ? data[3].result.toString() : '0';
  const insuranceBalance = data?.[4]?.result ? formatUnits(data[4].result, 6) : '0';
  const insuranceHealthy = data?.[5]?.result ?? true;
  const isMember = data?.[6]?.result ?? false;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-100">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Monitor protocol metrics and activity
        </p>
      </div>

      {/* Onboarding Banners */}
      {!isConnected && (
        <div className="card-bordered border-blue-900/20 bg-blue-950/10">
          <div className="flex items-start space-x-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2" />
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-400">Step 1: Connect Wallet</div>
              <div className="text-sm text-gray-500 mt-1">
                Click "Connect Wallet" in the top right to get started
              </div>
            </div>
          </div>
        </div>
      )}

      {isConnected && !isMember && (
        <div className="card-bordered border-amber-900/20 bg-amber-950/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start space-x-3 flex-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2" />
              <div>
                <div className="text-sm font-medium text-amber-400 mb-2">Step 2: Become a Member</div>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>You're not a DAO member yet. To participate:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs mt-2 ml-2">
                    <li>Share your address with an existing member</li>
                    <li>They'll propose you in the Members tab</li>
                    <li>DAO members vote on your membership</li>
                    <li>Once approved, you can access loans and governance</li>
                  </ol>
                </div>
              </div>
            </div>
            <Link to="/members" className="btn-secondary text-sm whitespace-nowrap">
              View Members
            </Link>
          </div>
        </div>
      )}

      {isConnected && isMember && (
        <div className="card-bordered border-emerald-900/20 bg-emerald-950/10">
          <div className="flex items-start space-x-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
            <div>
              <div className="text-sm font-medium text-emerald-400">Active Member</div>
              <div className="text-sm text-gray-400 mt-1">
                You're a DAO member! Request loans, earn yields, back other members, and vote on proposals.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Value Locked"
          value={`$${parseFloat(tvl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          loading={isLoading}
        />
        <StatCard
          label="Active Members"
          value={memberCount}
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          label="Active Loans"
          value={`${activeLoans}/${totalLoans}`}
          icon={Coins}
          loading={isLoading}
        />
        <StatCard
          label="Insurance Pool"
          value={`$${parseFloat(insuranceBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Shield}
          loading={isLoading}
        />
      </div>

      {/* Pool Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100">Protocol Status</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${insuranceHealthy ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-sm text-gray-500">
              {insuranceHealthy ? 'Healthy' : 'Needs Attention'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Utilization Rate
            </div>
            <div className="text-2xl font-semibold text-gray-100 tabular-nums">
              {totalLoans > 0 ? ((activeLoans / totalLoans) * 100).toFixed(1) : '0.0'}%
            </div>
            <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${totalLoans > 0 ? (activeLoans / totalLoans) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Insurance Coverage
            </div>
            <div className="text-2xl font-semibold text-gray-100 tabular-nums">
              {((parseFloat(insuranceBalance) / (parseFloat(tvl) || 1)) * 100).toFixed(1)}%
            </div>
            <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((parseFloat(insuranceBalance) / (parseFloat(tvl) || 1)) * 100), 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              DAO Members
            </div>
            <div className="text-2xl font-semibold text-gray-100 tabular-nums">
              {memberCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Total members with governance rights
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoCard
          title="How It Works"
          items={[
            {
              title: 'Join the Community',
              description: 'Get proposed by an existing member and receive votes from the DAO',
            },
            {
              title: 'Request Loans',
              description: 'Reduce collateral from 100% to 20% through social backing',
            },
            {
              title: 'Earn Yields',
              description: 'Deposit USDT to earn passive yields from DeFi protocols',
            },
            {
              title: 'Build Reputation',
              description: 'Back successful loans to increase your on-chain reputation',
            },
          ]}
        />

        <InfoCard
          title="Protocol Features"
          items={[
            {
              title: 'Dynamic Collateral',
              description: '8% reduction per backer, minimum 20% collateral required',
            },
            {
              title: 'Insurance Protection',
              description: '30% coverage on loan defaults through the insurance pool',
            },
            {
              title: 'Governance Voting',
              description: 'Stake tokens to participate in DAO governance decisions',
            },
            {
              title: 'Reputation System',
              description: 'Non-transferable NFTs track member reputation and history',
            },
          ]}
        />
      </div>
    </div>
  );
}
