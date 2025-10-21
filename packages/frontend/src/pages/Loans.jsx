import { useState } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS, ABIS } from '../config/contracts';
import { Coins, Users, Clock } from 'lucide-react';

const LoanRequestCard = ({ request, requestId, onBack }) => {
  const { address } = useAccount();

  const requiredCollateral = request.backerCount
    ? 100 - Math.min(80, Number(request.backerCount) * 8)
    : 100;

  const isExecutable = request.backerCount >= 3 && !request.executed;
  const canBack = address && address !== request.borrower && !request.executed;
  const daysLeft = Math.ceil((Number(request.endTime) - Date.now() / 1000) / 86400);

  return (
    <div className="card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <div className="text-xs text-gray-500 font-mono">Request #{requestId}</div>
          <div className="text-xs text-gray-600 font-mono">
            {request.borrower.slice(0, 6)}...{request.borrower.slice(-4)}
          </div>
        </div>
        <div>
          {request.executed ? (
            request.approved ? (
              <span className="badge-success">Approved</span>
            ) : (
              <span className="badge-danger">Rejected</span>
            )
          ) : (
            <span className="badge-warning">Voting</span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-2xl font-semibold text-gray-100 tabular-nums">
          ${formatUnits(request.amount, 6)}
        </div>
        <div className="text-xs text-gray-500">USDT</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Backers</span>
          </div>
          <div className="text-lg font-semibold text-gray-100 tabular-nums">
            {request.backerCount.toString()}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-1.5">
            <Coins className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Collateral</span>
          </div>
          <div className="text-lg font-semibold text-gray-100 tabular-nums">
            {requiredCollateral}%
          </div>
        </div>
      </div>

      {!request.executed && (
        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
          <Clock className="w-3.5 h-3.5" />
          <span>Ends in {daysLeft} days</span>
        </div>
      )}

      {!request.executed && (
        <div className="flex space-x-2">
          {canBack && (
            <button onClick={() => onBack(requestId)} className="flex-1 btn-secondary">
              Back Loan
            </button>
          )}
          {isExecutable && (
            <button className="flex-1 btn-primary">
              Execute
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default function Loans() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [collateral, setCollateral] = useState('100');
  const [activeTab, setActiveTab] = useState('browse');

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const { data: requestCountData } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.sepolia.loanVoting,
        abi: ABIS.loanVoting,
        functionName: 'requestCount',
      },
    ],
    watch: true,
  });

  const requestCount = requestCountData?.[0]?.result
    ? Number(requestCountData[0].result)
    : 0;

  const requestContracts = Array.from({ length: requestCount }, (_, i) => ({
    address: CONTRACTS.sepolia.loanVoting,
    abi: ABIS.loanVoting,
    functionName: 'getRequest',
    args: [BigInt(i)],
  }));

  const { data: requestsData } = useReadContracts({
    contracts: requestContracts,
    watch: true,
  });

  const handleRequestLoan = async () => {
    if (!amount) return;

    try {
      writeContract({
        address: CONTRACTS.sepolia.loanVoting,
        abi: ABIS.loanVoting,
        functionName: 'requestLoan',
        args: [parseUnits(amount, 6), BigInt(collateral)],
      });
    } catch (error) {
      console.error('Error requesting loan:', error);
    }
  };

  const handleBackLoan = async (requestId) => {
    try {
      writeContract({
        address: CONTRACTS.sepolia.loanVoting,
        abi: ABIS.loanVoting,
        functionName: 'backLoan',
        args: [BigInt(requestId)],
      });
    } catch (error) {
      console.error('Error backing loan:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-100">Loans</h1>
        <p className="text-sm text-gray-500">
          Request loans with dynamic collateral or back other members
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-900">
        {['browse', 'request', 'myLoans'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-gray-100'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'browse' && 'Browse'}
            {tab === 'request' && 'Request Loan'}
            {tab === 'myLoans' && 'My Loans'}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-100">
              Active Requests ({requestCount})
            </h2>
          </div>

          {!isConnected ? (
            <div className="card text-center py-12">
              <Coins className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-400">
                Connect your wallet to view and back loan requests
              </p>
            </div>
          ) : requestCount === 0 ? (
            <div className="card text-center py-12">
              <Coins className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-400 mb-2">No active loan requests</p>
              <p className="text-xs text-gray-600">
                Be the first to request a loan
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requestsData?.map((result, i) => {
                if (!result.result) return null;
                const [borrower, amount, requestedCollateral, startTime, endTime, backerCount, executed, approved] = result.result;
                return (
                  <LoanRequestCard
                    key={i}
                    requestId={i}
                    request={{
                      borrower,
                      amount,
                      requestedCollateral,
                      startTime,
                      endTime,
                      backerCount,
                      executed,
                      approved,
                    }}
                    onBack={handleBackLoan}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Request Tab */}
      {activeTab === 'request' && (
        <div className="max-w-2xl">
          <div className="card-bordered">
            <h2 className="text-lg font-semibold text-gray-100 mb-6">Request a Loan</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Loan Amount (USDT)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10000"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Initial Collateral Percentage
                </label>
                <input
                  type="number"
                  value={collateral}
                  onChange={(e) => setCollateral(e.target.value)}
                  placeholder="100"
                  min="20"
                  max="100"
                  className="input"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Collateral decreases by 8% per backer (minimum 20%)
                </p>
              </div>

              <div className="card bg-zinc-950/30">
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  Collateral Formula
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>0 backers:</span>
                    <span className="text-red-400 font-mono">100%</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>3 backers:</span>
                    <span className="text-amber-400 font-mono">76%</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>5 backers:</span>
                    <span className="text-emerald-400 font-mono">60%</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>10+ backers:</span>
                    <span className="text-blue-400 font-mono">20%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRequestLoan}
                disabled={!amount || isConfirming || !isConnected}
                className="w-full btn-primary"
              >
                {isConfirming ? 'Confirming...' : 'Submit Request'}
              </button>

              {!isConnected && (
                <p className="text-sm text-center text-gray-600">
                  Connect wallet to request a loan
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* My Loans Tab */}
      {activeTab === 'myLoans' && (
        <div>
          {!isConnected ? (
            <div className="card text-center py-12">
              <Coins className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-400">
                Connect your wallet to view your loans
              </p>
            </div>
          ) : (
            <div className="card text-center py-12">
              <Coins className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-400">
                No active loans found
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
