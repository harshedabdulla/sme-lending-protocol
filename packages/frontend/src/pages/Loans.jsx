import { useState } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES, ABIS, LOAN_CONFIG, CHAIN_CONFIG } from '../config/contracts';
import { Coins, Users, Clock, Globe, Zap, ArrowRight } from 'lucide-react';
import { createCrossChainIntent, getUnifiedBalances } from '../lib/nexus';
import { useNexus } from '../contexts/NexusContext';

// Helper to support both nested and flat contract address objects
const getContractAddress = (key) => {
  return CONTRACT_ADDRESSES?.sepolia?.[key] || CONTRACT_ADDRESSES?.[key];
};


const LoanRequestCard = ({ request, requestId, onBack, userVotingPower, userAddress, isMember, nexus }) => {
  const { address } = useAccount();

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
  const daysLeft = Math.ceil((Number(request.endTime) - Date.now() / 1000) / 86400);

  const handleNexusBack = async () => {
    if (!nexus) return;
    try {
      // Example Nexus interaction: log backing action
      await nexus.intent('backLoan', {
        requestId,
        backer: address,
        collateral: requiredCollateral,
      });
      onBack(requestId);
    } catch (err) {
      console.error('Nexus backLoan failed', err);
    }
  };


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
        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
          <Clock className="w-3.5 h-3.5" />
          <span>Ends in {daysLeft} days</span>
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
            {userAddress && !isOwnLoan && canBack && (
              <button
                onClick={handleNexusBack || (() => onBack(requestId))}
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

// Cross-chain loan request component
const CrossChainLoanRequest = ({ onRequestLoan, nexus }) => {
  const [amount, setAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [collateral, setCollateral] = useState('100');
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);

  const handleCrossChainRequest = async () => {
    if (!amount || !nexus) {
      console.log('Missing amount or Nexus not connected');
      return;
    }

    console.log('Starting cross-chain loan request...');
    console.log('Request details:', {
      amount,
      selectedChain,
      collateral,
      timestamp: new Date().toISOString()
    });

    setIsCreatingIntent(true);
    try {
      // Create cross-chain intent for loan request
      const intentData = {
        type: 'loan_request',
        fromChain: 'ethereum',
        toChain: selectedChain,
        amount: parseUnits(amount, 6),
        borrower: address,
        collateral: BigInt(collateral),
        token: 'USDT',
      };

      console.log('Creating cross-chain intent with data:', intentData);

      const intent = await createCrossChainIntent(intentData);
      console.log('Cross-chain loan intent created successfully:', intent);
      console.log('Intent ID:', intent.id);
      console.log('Intent Status:', intent.status);
      console.log('Created at:', new Date(intent.timestamp).toLocaleString());

      // Call the original request function
      await onRequestLoan(amount, collateral, intent);
      console.log('Cross-chain loan request submitted successfully!');
    } catch (error) {
      console.error('Failed to create cross-chain loan intent:', error);
      console.error('Error details:', error.message);
    } finally {
      setIsCreatingIntent(false);
    }
  };

  return (
    <div className="card-bordered">
      <div className="flex items-center space-x-2 mb-4">
        <Globe className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-100">Cross-Chain Loan Request</h3>
      </div>

      <div className="space-y-4">
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
            Target Chain
          </label>
          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
            className="input"
          >
            <option value="ethereum">Ethereum (8.5% APY)</option>
            <option value="polygon">Polygon (12.3% APY)</option>
            <option value="arbitrum">Arbitrum (10.7% APY)</option>
            <option value="base">Base (9.2% APY)</option>
            <option value="optimism">Optimism (11.1% APY)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Initial Collateral (%)
          </label>
          <input
            type="number"
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            min="20"
            max="100"
            className="input"
          />
        </div>

        <button
          onClick={handleCrossChainRequest}
          disabled={!amount || isCreatingIntent || !nexus}
          className="w-full btn-primary flex items-center justify-center space-x-2"
        >
          {isCreatingIntent ? (
            <>
              <div className="spinner" />
              <span>Creating Cross-Chain Intent...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Request Cross-Chain Loan</span>
            </>
          )}
        </button>

        {nexus && (
          <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-blue-400">
              <Globe className="w-4 h-4" />
              <span>Nexus SDK Connected</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your loan will be processed across multiple chains for optimal liquidity
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Loans() {
  const { address, isConnected } = useAccount();
  const { nexus } = useNexus();

  const [amount, setAmount] = useState("");
  const [collateral, setCollateral] = useState("100");
  const [activeTab, setActiveTab] = useState("browse");
  const [error, setError] = useState("");
  const [unifiedBalances, setUnifiedBalances] = useState(null);

  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // // 🔹 Load Unified Balances from Nexus
  // useEffect(() => {
  //   if (nexus && isConnected) {
  //     loadUnifiedBalances();
  //   }
  // }, [nexus, isConnected]);

  // const loadUnifiedBalances = async () => {
  //   try {
  //     const balances = await getUnifiedBalances();
  //     setUnifiedBalances(balances);
  //   } catch (error) {
  //     console.error("Failed to load unified balances:", error);
  //   }
  // };
  const loadUnifiedBalances = async () => {
    if (!nexus) {
      console.warn("Nexus not initialized yet");
      return;
    }
    try {
      const balances = await nexus.getUnifiedBalances();
      setUnifiedBalances(balances);
    } catch (err) {
      console.error("Failed to load unified balances:", err);
    }
  };

  // 🔹 Get Loan Request Data
  const { data: requestCountData } = useReadContracts({
    contracts: [
      {
        address: getContractAddress("loanVoting"),
        abi: ABIS.loanVoting,
        functionName: "requestCount",
      },
    ],
    watch: true,
  });

  const requestCount = requestCountData?.[0]?.result ? Number(requestCountData[0].result) : 0;

  const requestContracts = Array.from({ length: requestCount }, (_, i) => ({
    address: getContractAddress("loanVoting"),
    abi: ABIS.loanVoting,
    functionName: "getRequest",
    args: [BigInt(i)],
  }));

  const { data: requestsData } = useReadContracts({
    contracts: requestContracts,
    watch: true,
  });

  // 🔹 Eligibility + Credit Score
  const { data: eligibilityData } = useReadContracts({
    contracts: [
      {
        address: getContractAddress("daoMembership"),
        abi: ABIS.daoMembership,
        functionName: "isActiveMember",
        args: address ? [address] : undefined,
      },
      {
        address: getContractAddress("loanManager"),
        abi: ABIS.loanManager,
        functionName: "checkEligibility",
        args: address ? [address] : undefined,
      },
      {
        address: getContractAddress("creditScore"),
        abi: [
          {
            inputs: [{ internalType: "address", name: "user", type: "address" }],
            name: "getScore",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "getScore",
        args: address ? [address] : undefined,
      },
    ],
    watch: true,
  });

  const isActiveMember = eligibilityData?.[0]?.result ?? false;
  const eligibilityResult = eligibilityData?.[1]?.result;
  const isEligible = eligibilityResult?.[0] ?? false;
  const eligibilityReason = eligibilityResult?.[1] ?? "";
  const creditScore = eligibilityData?.[2]?.result ? Number(eligibilityData[2].result) : 0;

  // 🔹 Voting Power for Backing Loans
  const { data: votingPowerData } = useReadContracts({
    contracts: [
      {
        address: getContractAddress("governanceToken"),
        abi: ABIS.governanceToken,
        functionName: "getVotingPower",
        args: address ? [address] : undefined,
      },
    ],
    watch: true,
  });

  const votingPower = votingPowerData?.[0]?.result
    ? Number(formatUnits(votingPowerData[0].result, 18))
    : 0;

  // 🔹 Request Loan
  const handleRequestLoan = async (loanAmount = amount, loanCollateral = collateral, intent = null) => {
    if (!loanAmount || !loanCollateral) return;
    setError("");

    try {
      const amountInWei = parseUnits(loanAmount, 6);
      const collateralPct = BigInt(loanCollateral);

      console.log("Requesting loan:", {
        amount: loanAmount,
        amountInWei: amountInWei.toString(),
        collateral: loanCollateral,
        borrower: address,
        intent: intent?.id || null,
      });

      writeContract({
        address: getContractAddress("loanVoting"),
        abi: ABIS.loanVoting,
        functionName: "requestLoan",
        args: [amountInWei, collateralPct],
        gas: 500000n,
      });
    } catch (err) {
      console.error("Error requesting loan:", err);
      setError(err.message || "Failed to request loan");
    }
  };

  // 🔹 Back Loan
  const handleBackLoan = async (requestId) => {
    try {
      console.log("Backing loan request:", requestId);
      writeContract({
        address: getContractAddress("loanVoting"),
        abi: ABIS.loanVoting,
        functionName: "backLoan",
        args: [BigInt(requestId)],
        gas: 500000n,
      });
    } catch (error) {
      console.error("Error backing loan:", error);
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
        {["browse", "request", "crossChain", "myLoans"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
              ? "border-blue-500 text-gray-100"
              : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
          >
            {tab === "browse" && "Browse"}
            {tab === "request" && "Request Loan"}
            {tab === "crossChain" && "Cross-Chain"}
            {tab === "myLoans" && "My Loans"}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {activeTab === "browse" && (
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
            {nexus && (
              <div className="flex items-center space-x-2 text-sm text-blue-400">
                <Globe className="w-4 h-4" />
                <span>Cross-Chain Enabled</span>
              </div>
            )}
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
              <p className="text-xs text-gray-600">Be the first to request a loan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requestsData?.map((result, i) => {
                if (!result.result) return null;
                const [
                  borrower,
                  amount,
                  requestedCollateral,
                  startTime,
                  endTime,
                  backerCount,
                  executed,
                  approved,
                ] = result.result;

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
                    nexus={nexus}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cross-Chain Tab */}
      {activeTab === "crossChain" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-blue-400" />
              <span>Cross-Chain Lending</span>
            </h2>
            {nexus && (
              <div className="flex items-center space-x-2 text-sm text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Nexus Connected</span>
              </div>
            )}
          </div>

          {!nexus ? (
            <div className="card text-center py-12">
              <Globe className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-400 mb-2">Nexus SDK Not Connected</p>
              <p className="text-xs text-gray-600">
                Connect your wallet to enable cross-chain lending
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CrossChainLoanRequest onRequestLoan={handleRequestLoan} nexus={nexus} />

              {unifiedBalances && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-100 mb-4">
                    Unified Balances
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(unifiedBalances.balances || {}).map(
                      ([chain, balance]) => (
                        <div
                          key={chain}
                          className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                            <span className="text-sm text-gray-300 capitalize">
                              {chain}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-100">
                              {balance.USDT
                                ? `$${balance.USDT.toLocaleString()}`
                                : "N/A"}
                            </div>
                            <div className="text-xs text-gray-500">USDT</div>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm text-blue-400">
                      <Zap className="w-4 h-4" />
                      <span>Cross-Chain Features</span>
                    </div>
                    <ul className="text-xs text-gray-500 mt-2 space-y-1">
                      <li>• Bridge & Execute loan disbursements</li>
                      <li>• Unified balance tracking</li>
                      <li>• Cross-chain repayment flows</li>
                      <li>• Gas optimization across chains</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Request Loan Tab */}
      {activeTab === "request" && (
        <div className="max-w-2xl">
          <div className="card-bordered">
            <h2 className="text-lg font-semibold text-gray-100 mb-6">
              Request a Loan
            </h2>

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

              <button
                onClick={handleRequestLoan}
                disabled={!amount || !collateral || isConfirming || !isConnected}
                className="w-full btn-primary"
              >
                {isConfirming ? "Confirming..." : "Submit Loan Request"}
              </button>

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

      {/* My Loans */}
      {activeTab === "myLoans" && (
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
              <p className="text-sm text-gray-400">No active loans found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}