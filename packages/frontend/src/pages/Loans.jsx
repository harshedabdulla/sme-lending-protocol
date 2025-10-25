import { useState } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS, ABIS } from '../config/contracts';
import { Coins, Users, Clock } from 'lucide-react';

const LoanRequestCard = ({ request, requestId, onBack, onExecute, userVotingPower, userAddress, isMember }) => {
  const requiredCollateral = request.backerCount
    ? 100 - Math.min(80, Number(request.backerCount) * 8)
    : 100;

  const isExecutable = request.backerCount >= 3 && !request.executed;
  const isOwnLoan = userAddress && userAddress.toLowerCase() === request.borrower.toLowerCase();
  const votingPeriodEnded = Number(request.endTime) <= Date.now() / 1000;
  const hasEnoughStake = userVotingPower >= 500; // MIN_STAKE_TO_BACK = 500 tokens
  const canBack = userAddress && !isOwnLoan && !request.executed && !votingPeriodEnded;
  const secondsLeft = Math.max(0, Number(request.endTime) - Date.now() / 1000);
  const minutesLeft = Math.ceil(secondsLeft / 60);
  const timeLeftDisplay = minutesLeft > 0 ? `${minutesLeft} min` : 'Ended';

  // Debug log
  console.log(`Loan ${requestId} - Backing checks:`, {
    userAddress,
    borrower: request.borrower,
    isMember,
    isOwnLoan,
    hasEnoughStake,
    votingPower: userVotingPower,
    votingPeriodEnded,
    executed: request.executed
  });

  // Detailed reason why user can't back
  let backingBlockedReason = '';
  if (!userAddress) backingBlockedReason = 'Connect wallet';
  else if (!isMember) backingBlockedReason = 'Not a DAO member';
  else if (isOwnLoan) backingBlockedReason = 'Cannot back own loan';
  else if (votingPeriodEnded) backingBlockedReason = 'Voting period ended';
  else if (request.executed) backingBlockedReason = 'Already executed';
  else if (!hasEnoughStake) backingBlockedReason = `Need 500 staked (have ${userVotingPower.toFixed(0)})`;

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
          <span>Ends in {timeLeftDisplay}</span>
        </div>
      )}

      {!request.executed && (
        <div className="space-y-2">
          {backingBlockedReason && (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">
              ⚠️ {backingBlockedReason}
            </div>
          )}
          <div className="flex space-x-2">
            {userAddress && !isOwnLoan && (
              <button
                onClick={() => onBack(requestId)}
                disabled={!canBack || !hasEnoughStake || !isMember}
                className="flex-1 btn-secondary"
              >
                Back Loan
              </button>
            )}
            {isExecutable && (
              <button
                onClick={() => onExecute(requestId)}
                className="flex-1 btn-primary"
              >
                Execute Loan
              </button>
            )}
          </div>
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
  const [error, setError] = useState('');

  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Log transaction state for debugging
  if (writeError) {
    console.error('=== WRITE CONTRACT ERROR ===');
    console.error('Error:', writeError);
    console.error('Message:', writeError?.message);
  }
  if (hash) {
    console.log('Transaction hash:', hash);
  }

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

  // Check if user is an active member, eligible for loan, and get credit score
  const { data: eligibilityData } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.sepolia.daoMembership,
        abi: ABIS.daoMembership,
        functionName: 'isActiveMember',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.sepolia.loanManager,
        abi: ABIS.loanManager,
        functionName: 'checkEligibility',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.sepolia.creditScore,
        abi: [
          {
            "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
            "name": "getScore",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'getScore',
        args: address ? [address] : undefined,
      },
    ],
    watch: true,
  });

  const isActiveMember = eligibilityData?.[0]?.result ?? false;
  const eligibilityResult = eligibilityData?.[1]?.result;
  const isEligible = eligibilityResult?.[0] ?? false;
  const eligibilityReason = eligibilityResult?.[1] ?? '';
  const creditScore = eligibilityData?.[2]?.result ? Number(eligibilityData[2].result) : 0;

  // Debug membership status
  console.log('Membership status for', address, ':', {
    isActiveMember,
    rawResult: eligibilityData?.[0]?.result,
    isEligible,
    eligibilityReason,
    creditScore
  });

  // Get user's voting power for backing loans
  const { data: votingPowerData } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.sepolia.governanceToken,
        abi: ABIS.governanceToken,
        functionName: 'getVotingPower',
        args: address ? [address] : undefined,
      },
    ],
    watch: true,
  });

  const votingPower = votingPowerData?.[0]?.result
    ? Number(formatUnits(votingPowerData[0].result, 18))
    : 0;

  const handleRequestLoan = async () => {
    if (!amount || !collateral) return;

    setError('');

    try {
      const amountInWei = parseUnits(amount, 6);
      const collateralPct = BigInt(collateral);

      console.log('Requesting loan with params:', {
        amount,
        amountInWei: amountInWei.toString(),
        collateral,
        collateralPct: collateralPct.toString(),
        address,
        isActiveMember,
        isEligible,
        eligibilityReason
      });

      writeContract({
        address: CONTRACTS.sepolia.loanVoting,
        abi: ABIS.loanVoting,
        functionName: 'requestLoan',
        args: [amountInWei, collateralPct],
        gas: 500000n, // Set explicit gas limit
      });
    } catch (err) {
      console.error('Error requesting loan:', err);
      setError(err.message || 'Failed to request loan');
    }
  };

  const handleBackLoan = async (requestId) => {
    try {
      console.log('Backing loan with params:', {
        requestId,
        address,
        votingPower,
        isActiveMember,
      });

      writeContract({
        address: CONTRACTS.sepolia.loanVoting,
        abi: ABIS.loanVoting,
        functionName: 'backLoan',
        args: [BigInt(requestId)],
        gas: 500000n,
      });
    } catch (error) {
      console.error('Error backing loan:', error);
    }
  };

  const handleExecuteLoan = async (requestId) => {
    console.log('=== EXECUTING LOAN ===');
    console.log('Request ID:', requestId);
    console.log('Contract:', CONTRACTS.sepolia.loanVoting);

    try {
      const result = writeContract({
        address: CONTRACTS.sepolia.loanVoting,
        abi: ABIS.loanVoting,
        functionName: 'executeRequest',
        args: [BigInt(requestId)],
        gas: 800000n,
      });
      console.log('Transaction initiated:', result);
    } catch (error) {
      console.error('=== EXECUTION ERROR ===');
      console.error('Error:', error);
      console.error('Message:', error?.message);
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
          {/* Transaction Status */}
          {writeError && (
            <div className="mb-4 p-4 bg-red-950/20 border border-red-900/30 rounded-lg">
              <p className="text-sm text-red-300 font-medium mb-2">Transaction Error</p>
              <p className="text-xs text-gray-400">{writeError.message}</p>
            </div>
          )}

          {isPending && (
            <div className="mb-4 p-4 bg-blue-950/20 border border-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-300">Waiting for wallet confirmation...</p>
            </div>
          )}

          {isConfirming && hash && (
            <div className="mb-4 p-4 bg-amber-950/20 border border-amber-900/30 rounded-lg">
              <p className="text-sm text-amber-300">Transaction confirming...</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">
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

          {isSuccess && (
            <div className="mb-4 p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-lg">
              <p className="text-sm text-emerald-300">Transaction confirmed!</p>
            </div>
          )}

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
                    onExecute={handleExecuteLoan}
                    userVotingPower={votingPower}
                    userAddress={address}
                    isMember={isActiveMember}
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

            {!isConnected && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-6">
                <p className="text-sm text-blue-400">
                  Please connect your wallet to request a loan
                </p>
              </div>
            )}

            {isConnected && !isActiveMember && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6">
                <p className="text-sm text-amber-400 mb-2">⚠️ You are not an active DAO member</p>
                <p className="text-xs text-gray-400">
                  Only active DAO members can request loans. Ask an existing member to propose you in the Members tab.
                </p>
              </div>
            )}

            {isConnected && isActiveMember && !isEligible && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 mb-6">
                <p className="text-sm text-red-400 mb-2">Not eligible for loan</p>
                <p className="text-xs text-gray-400 mb-3">
                  Reason: {eligibilityReason}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Your Credit Score:</span>
                  <span className={`font-mono font-medium ${creditScore >= 600 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {creditScore} / 1000
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-500">Minimum Required:</span>
                  <span className="font-mono font-medium text-gray-400">600 / 1000</span>
                </div>
                {creditScore < 600 && (
                  <div className="mt-3 p-2 rounded bg-gray-900/50">
                    <p className="text-xs text-gray-400">
                      Needs to fetch credit score:
                    </p>
                  </div>
                )}
              </div>
            )}

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
                disabled={!amount || !collateral || isConfirming || !isConnected || !isActiveMember || !isEligible}
                className="w-full btn-primary"
              >
                {isConfirming ? 'Confirming...' : 'Submit Loan Request'}
              </button>

              {!isConnected && (
                <p className="text-sm text-center text-gray-600">
                  Connect wallet to request a loan
                </p>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {writeError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">
                    Transaction failed: {writeError.message}
                  </p>
                </div>
              )}

              {isSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-emerald-400">
                    Loan request submitted successfully!
                  </p>
                </div>
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
