import { useState, useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useNexus } from '../contexts/NexusContext';
import { getUnifiedBalances } from '../lib/nexus';
import { CONTRACT_ADDRESSES, ABIS } from '../config/contracts';
import { TrendingUp, DollarSign, Clock, ArrowDownCircle, ArrowUpCircle, Shield, AlertCircle, Globe, Zap, Layers } from 'lucide-react';

export default function YieldPool() {
  const { address, isConnected } = useAccount();
  const { nexus } = useNexus();

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [activeTab, setActiveTab] = useState('deposit');
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [unifiedBalances, setUnifiedBalances] = useState(null);
  const [crossChainStats, setCrossChainStats] = useState({
    totalYield: 0,
    crossChainDeposits: 0,
    activeStrategies: 0,
  });

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (nexus) loadCrossChainData();
  }, [nexus]);

  const loadCrossChainData = async () => {
    try {
      const balances = await getUnifiedBalances();
      setUnifiedBalances(balances);

      setCrossChainStats({
        totalYield: balances?.totalYield || 0,
        crossChainDeposits: balances?.crossChainDeposits || 0,
        activeStrategies: Object.keys(balances?.strategies || {}).length || 0,
      });
    } catch (error) {
      console.error('Failed to load cross-chain data:', error);
    }
  };

  const { data } = useReadContracts({
    contracts: [
      {
        address: CONTRACT_ADDRESSES.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'getTotalValueLocked',
      },
      {
        address: CONTRACT_ADDRESSES.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'shares',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACT_ADDRESSES.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACT_ADDRESSES.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'withdrawalRequests',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACT_ADDRESSES.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'canWithdraw',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACT_ADDRESSES.mockUSDT,
        abi: ABIS.mockUSDT,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACT_ADDRESSES.mockUSDT,
        abi: ABIS.mockUSDT,
        functionName: 'allowance',
        args: address ? [address, CONTRACT_ADDRESSES.yieldingPool] : undefined,
      },
    ],
    watch: true,
  });

  const tvl = data?.[0]?.result ? formatUnits(data[0].result, 6) : '0';
  const userShares = data?.[1]?.result ? formatUnits(data[1].result, 6) : '0';
  const userBalance = data?.[2]?.result ? formatUnits(data[2].result, 6) : '0';
  const withdrawalRequestRaw = data?.[3]?.result;
  const withdrawalRequest = withdrawalRequestRaw
    ? { shares: withdrawalRequestRaw[0] || 0n, requestTime: withdrawalRequestRaw[1] || 0n }
    : { shares: 0n, requestTime: 0n };
  const canWithdraw = data?.[4]?.result ?? false;
  const usdtBalance = data?.[5]?.result ? formatUnits(data[5].result, 6) : '0';
  const allowance = data?.[6]?.result || 0n;

  const needsApproval = Number(allowance) === 0;

  const handleApprove = async () => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.mockUSDT,
        abi: ABIS.mockUSDT,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.yieldingPool, parseUnits('1000000', 6)],
        gas: 100000n,
      });
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;

    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'deposit',
        args: [parseUnits(depositAmount, 6)],
        gas: 500000n,
      });
      setDepositAmount('');
    } catch (error) {
      console.error('Error depositing:', error);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!withdrawShares) return;

    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'requestWithdrawal',
        args: [parseUnits(withdrawShares, 6)],
        gas: 300000n,
      });
      setWithdrawShares('');
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
    }
  };

  const handleWithdraw = async () => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'withdraw',
        gas: 300000n,
      });
    } catch (error) {
      console.error('Error withdrawing:', error);
    }
  };

  const handleCrossChainDeposit = async () => {
    if (!depositAmount || !nexus) {
      console.log('❌ Missing amount or Nexus not connected');
      return;
    }

    try {
      const intentData = {
        type: 'cross_chain_yield_deposit',
        fromChain: 'ethereum',
        toChain: selectedChain,
        amount: parseFloat(depositAmount) * 1000000,
        user: address,
        token: 'USDT',
        strategy: 'multi_chain_yield',
      };

      const intent = await nexus.createIntent(intentData);
      console.log('✅ Cross-chain yield farming intent created:', intent);

      setDepositAmount('');
    } catch (error) {
      console.error('❌ Error creating cross-chain deposit intent:', error);
      console.error('🔍 Error details:', error.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-100">Yield Pool</h1>
        <p className="text-sm text-gray-500">
          Earn passive yields by providing liquidity to the protocol
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card hover:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="stat-label">Total Value Locked</span>
            <DollarSign className="w-4 h-4 text-gray-600" />
          </div>
          <div className="stat-value">
            ${tvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="stat-card hover:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="stat-label">Your Deposit</span>
            <TrendingUp className="w-4 h-4 text-gray-600" />
          </div>
          <div className="stat-value">
            ${parseFloat(userBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="stat-card hover:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="stat-label">Cross-Chain Yield</span>
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <div className="stat-value">
            ${crossChainStats.totalYield.toLocaleString()}
          </div>
        </div>

        <div className="stat-card hover:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="stat-label">Active Strategies</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="stat-value">
            {crossChainStats.activeStrategies}
          </div>
        </div>
      </div>

      {/* Cross-Chain Status */}
      {nexus && (
        <div className="card border-blue-900/20 bg-blue-950/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-blue-400" />
              <span>Cross-Chain Yield Farming</span>
            </h3>
            <div className="flex items-center space-x-2 text-sm text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Nexus Connected</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-semibold text-gray-100">
                {crossChainStats.crossChainDeposits}
              </div>
              <div className="text-xs text-gray-500 mt-1">Cross-Chain Deposits</div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-semibold text-gray-100">
                {crossChainStats.activeStrategies}
              </div>
              <div className="text-xs text-gray-500 mt-1">Active Strategies</div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-semibold text-gray-100">
                ${crossChainStats.totalYield.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total Yield Earned</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deposit/Withdraw Interface */}
        <div className="lg:col-span-2">
          <div className="card-bordered">
            <div className="flex space-x-1 border-b border-gray-900 mb-6">
              {['deposit', 'withdraw'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                    ? 'border-blue-500 text-gray-100'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                >
                  {tab === 'deposit' ? (
                    <span className="flex items-center justify-center space-x-2">
                      <ArrowDownCircle className="w-4 h-4" />
                      <span>Deposit</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <ArrowUpCircle className="w-4 h-4" />
                      <span>Withdraw</span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'deposit' ? (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-400">
                      Deposit Amount (USDT)
                    </label>
                    <span className="text-xs text-gray-600 font-mono">
                      Balance: ${parseFloat(usdtBalance).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="1000"
                    className="input"
                  />
                  <button
                    onClick={() => setDepositAmount(usdtBalance)}
                    className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                  >
                    Max
                  </button>
                </div>

                {/* Cross-Chain Options */}
                {nexus && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-400">
                      Target Chain for Yield Farming
                    </label>
                    <select
                      value={selectedChain}
                      onChange={(e) => setSelectedChain(e.target.value)}
                      className="input"
                    >
                      <option value="ethereum">Ethereum (8.5% APY)</option>
                      <option value="polygon">Polygon (12.3% APY)</option>
                      <option value="arbitrum">Arbitrum (10.7% APY)</option>
                    </select>
                    <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm text-blue-400 mb-2">
                        <Zap className="w-4 h-4" />
                        <span>Cross-Chain Yield Optimization</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Your deposit will be automatically optimized across multiple chains for maximum yield
                      </p>
                    </div>
                  </div>
                )}

                {!isConnected ? (
                  <button disabled className="w-full btn-secondary">
                    Connect Wallet
                  </button>
                ) : (
                  <div className="space-y-3">
                    {nexus ? (
                      <div className="space-y-2">
                        <button
                          onClick={handleCrossChainDeposit}
                          disabled={!depositAmount}
                          className="w-full btn-primary flex items-center justify-center space-x-2"
                        >
                          <Globe className="w-4 h-4" />
                          <span>Cross-Chain Yield Deposit</span>
                        </button>
                        <button
                          onClick={handleDeposit}
                          disabled={!depositAmount}
                          className="w-full btn-secondary"
                        >
                          Single Chain Deposit
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleDeposit}
                        disabled={!depositAmount}
                        className="w-full btn-primary"
                      >
                        Deposit to Pool
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-400">
                      Withdraw Shares
                    </label>
                    <span className="text-xs text-gray-600 font-mono">
                      Available: {parseFloat(userShares).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={withdrawShares}
                    onChange={(e) => setWithdrawShares(e.target.value)}
                    placeholder="5000"
                    className="input"
                  />
                  <button
                    onClick={() => setWithdrawShares(userShares)}
                    className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                  >
                    Max ({parseFloat(userShares).toFixed(2)} shares)
                  </button>
                </div>

                <button
                  onClick={handleRequestWithdrawal}
                  disabled={!withdrawShares || !isConnected}
                  className="w-full btn-primary"
                >
                  Request Withdrawal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pool Information */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-100 mb-4">Pool Information</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-300">Share-Based System</div>
                  <div className="text-xs text-gray-500 mt-0.5">Fair yield distribution for all depositors</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-300">Withdrawal Lock</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Withdrawals may require waiting period depending on pool liquidity
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-300">Security & Audits</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Contract audited and protected by multi-sig governance
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Withdrawal Request Info */}
          {withdrawalRequest.shares > 0n && (
            <div className="card border-yellow-600/50 bg-yellow-950/10">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400 font-medium">Pending Withdrawal Request</span>
              </div>
              <div className="text-xs text-gray-400">
                Shares Requested: {formatUnits(withdrawalRequest.shares, 6)}
              </div>
              <div className="text-xs text-gray-400">
                Requested At: {new Date(Number(withdrawalRequest.requestTime) * 1000).toLocaleString()}
              </div>
              {canWithdraw && (
                <button
                  onClick={handleWithdraw}
                  className="mt-2 w-full btn-primary text-sm flex items-center justify-center space-x-2"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Withdraw Now</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
