import { useState } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS, ABIS } from '../config/contracts';
import { TrendingUp, DollarSign, Clock, ArrowDownCircle, ArrowUpCircle, Shield, AlertCircle } from 'lucide-react';

export default function YieldPool() {
  const { address, isConnected } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [activeTab, setActiveTab] = useState('deposit');

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.sepolia.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'getTotalValueLocked',
      },
      {
        address: CONTRACTS.sepolia.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'shares',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.sepolia.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.sepolia.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'withdrawalRequests',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.sepolia.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'canWithdraw',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.sepolia.mockUSDT,
        abi: ABIS.mockUSDT,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.sepolia.mockUSDT,
        abi: ABIS.mockUSDT,
        functionName: 'allowance',
        args: address ? [address, CONTRACTS.sepolia.yieldingPool] : undefined,
      },
    ],
    watch: true,
  });

  const tvl = data?.[0]?.result ? formatUnits(data[0].result, 6) : '0';
  const userShares = data?.[1]?.result ? formatUnits(data[1].result, 18) : '0';
  const userBalance = data?.[2]?.result ? formatUnits(data[2].result, 6) : '0';
  const withdrawalRequest = data?.[3]?.result || { shares: 0n, requestTime: 0n };
  const canWithdraw = data?.[4]?.result ?? false;
  const usdtBalance = data?.[5]?.result ? formatUnits(data[5].result, 6) : '0';
  const allowance = data?.[6]?.result || 0n;

  const handleApprove = async () => {
    try {
      writeContract({
        address: CONTRACTS.sepolia.mockUSDT,
        abi: ABIS.mockUSDT,
        functionName: 'approve',
        args: [CONTRACTS.sepolia.yieldingPool, parseUnits('1000000', 6)],
      });
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;

    try {
      writeContract({
        address: CONTRACTS.sepolia.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'deposit',
        args: [parseUnits(depositAmount, 6)],
      });
      setDepositAmount('');
    } catch (error) {
      console.error('Error depositing:', error);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!withdrawShares) return;

    try {
      writeContract({
        address: CONTRACTS.sepolia.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'requestWithdrawal',
        args: [parseUnits(withdrawShares, 18)],
      });
      setWithdrawShares('');
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
    }
  };

  const handleWithdraw = async () => {
    try {
      writeContract({
        address: CONTRACTS.sepolia.yieldingPool,
        abi: ABIS.yieldingPool,
        functionName: 'withdraw',
      });
    } catch (error) {
      console.error('Error withdrawing:', error);
    }
  };

  const needsApproval = Number(allowance) === 0;

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
            {isLoading ? <div className="spinner" /> : `$${parseFloat(tvl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
            <span className="stat-label">Your Shares</span>
            <Shield className="w-4 h-4 text-gray-600" />
          </div>
          <div className="stat-value">
            {parseFloat(userShares).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="stat-card hover:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="stat-label">USDT Balance</span>
            <DollarSign className="w-4 h-4 text-gray-600" />
          </div>
          <div className="stat-value">
            ${parseFloat(usdtBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

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
                  className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
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

                {!isConnected ? (
                  <button disabled className="w-full btn-secondary">
                    Connect Wallet
                  </button>
                ) : needsApproval ? (
                  <button
                    onClick={handleApprove}
                    disabled={isConfirming}
                    className="w-full btn-secondary"
                  >
                    {isConfirming ? 'Approving...' : 'Approve USDT'}
                  </button>
                ) : (
                  <button
                    onClick={handleDeposit}
                    disabled={!depositAmount || isConfirming}
                    className="w-full btn-primary"
                  >
                    {isConfirming ? 'Depositing...' : 'Deposit to Pool'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Pending Withdrawal Request */}
                {withdrawalRequest.shares > 0n && (
                  <div className="card-bordered border-amber-900/20 bg-amber-950/10">
                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-amber-400 mb-1">
                          Pending Withdrawal
                        </h4>
                        <p className="text-xs text-gray-400 font-mono mb-3">
                          Shares: {formatUnits(withdrawalRequest.shares, 18)}
                        </p>
                        {canWithdraw ? (
                          <button
                            onClick={handleWithdraw}
                            disabled={isConfirming}
                            className="btn-primary text-sm"
                          >
                            {isConfirming ? 'Processing...' : 'Complete Withdrawal'}
                          </button>
                        ) : (
                          <p className="text-xs text-gray-500">
                            Available after cooldown period
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-400">
                      Withdraw Shares
                    </label>
                    <span className="text-xs text-gray-600 font-mono">
                      Shares: {parseFloat(userShares).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={withdrawShares}
                    onChange={(e) => setWithdrawShares(e.target.value)}
                    placeholder="100"
                    className="input"
                  />
                  <button
                    onClick={() => setWithdrawShares(userShares)}
                    className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                  >
                    Max
                  </button>
                </div>

                <button
                  onClick={handleRequestWithdrawal}
                  disabled={!withdrawShares || isConfirming || !isConnected || withdrawalRequest.shares > 0n}
                  className="w-full btn-primary"
                >
                  {isConfirming ? 'Processing...' : 'Request Withdrawal'}
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
                  <div className="text-sm font-medium text-gray-300">2-Day Cooldown</div>
                  <div className="text-xs text-gray-500 mt-0.5">Security measure for withdrawals</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-300">DeFi Integration</div>
                  <div className="text-xs text-gray-500 mt-0.5">Deployed to vetted protocols</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-100 mb-4">Risks</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-300">Smart Contract Risk</div>
                  <div className="text-xs text-gray-500 mt-0.5">Inherent to DeFi protocols</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-300">Market Volatility</div>
                  <div className="text-xs text-gray-500 mt-0.5">Yields may fluctuate</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-300">Not Insured</div>
                  <div className="text-xs text-gray-500 mt-0.5">Crypto-native risk profile</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-blue-950/10 border-blue-900/20">
            <h3 className="text-sm font-medium text-blue-400 mb-2">Withdrawal Process</h3>
            <ol className="space-y-2 text-xs text-gray-400">
              <li className="flex space-x-2">
                <span className="text-blue-400">1.</span>
                <span>Request withdrawal (starts 2-day cooldown)</span>
              </li>
              <li className="flex space-x-2">
                <span className="text-blue-400">2.</span>
                <span>Wait for cooldown to complete</span>
              </li>
              <li className="flex space-x-2">
                <span className="text-blue-400">3.</span>
                <span>Complete withdrawal to receive USDT</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
