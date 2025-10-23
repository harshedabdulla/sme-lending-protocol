import { useState, useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES, LOAN_CONFIG, CHAIN_CONFIG } from '../config/contracts';
import { createCrossChainIntent, getUnifiedBalances } from '../lib/nexus';
import { Coins, Users, Clock, Globe, Zap, ArrowRight } from 'lucide-react';
import { useNexus } from '../contexts/NexusContext';

// LoanRequestCard component
const LoanRequestCard = ({ request, requestId, onBack, nexus }) => {
  const { address } = useAccount();

  const requiredCollateral = request.backerCount
    ? 100 - Math.min(80, Number(request.backerCount) * 8)
    : 100;

  const isExecutable = request.backerCount >= 3 && !request.executed;
  const canBack = address && address !== request.borrower && !request.executed;
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
            <button onClick={handleNexusBack} className="flex-1 btn-secondary">
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

// Cross-chain loan request component
const CrossChainLoanRequest = ({ onRequestLoan, nexus }) => {
  const [amount, setAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [collateral, setCollateral] = useState('100');
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);

  const handleCrossChainRequest = async () => {
    if (!amount || !nexus) {
      console.log('❌ Missing amount or Nexus not connected');
      return;
    }

    console.log('🚀 Starting cross-chain loan request...');
    console.log('📊 Request details:', {
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

      console.log('🔗 Creating cross-chain intent with data:', intentData);

      const intent = await createCrossChainIntent(intentData);
      console.log('✅ Cross-chain loan intent created successfully:', intent);
      console.log('🎯 Intent ID:', intent.id);
      console.log('📈 Intent Status:', intent.status);
      console.log('⏰ Created at:', new Date(intent.timestamp).toLocaleString());

      // Call the original request function
      await onRequestLoan(amount, collateral, intent);
      console.log('🎉 Cross-chain loan request submitted successfully!');
    } catch (error) {
      console.error('❌ Failed to create cross-chain loan intent:', error);
      console.error('🔍 Error details:', error.message);
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

// Loans page component
export default function Loans() {
  const { address, isConnected } = useAccount();
  const { nexus } = useNexus();
  const [amount, setAmount] = useState('');
  const [collateral, setCollateral] = useState('100');
  const [activeTab, setActiveTab] = useState('browse');
  const [unifiedBalances, setUnifiedBalances] = useState(null);

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  // Load unified balances
  useEffect(() => {
    if (nexus && isConnected) {
      loadUnifiedBalances();
    }
  }, [nexus, isConnected]);

  const loadUnifiedBalances = async () => {
    try {
      const balances = await getUnifiedBalances();
      setUnifiedBalances(balances);
    } catch (error) {
      console.error("Failed to load unified balances:", error);
    }
  };

  // Mock data for demonstration
  const mockRequests = [
    {
      borrower: "0x1234...5678",
      amount: parseUnits("5000", 6),
      requestedCollateral: 100n,
      startTime: Math.floor(Date.now() / 1000) - 86400,
      endTime: Math.floor(Date.now() / 1000) + 604800,
      backerCount: 2n,
      executed: false,
      approved: false,
    },
    {
      borrower: "0x8765...4321",
      amount: parseUnits("15000", 6),
      requestedCollateral: 80n,
      startTime: Math.floor(Date.now() / 1000) - 172800,
      endTime: Math.floor(Date.now() / 1000) + 432000,
      backerCount: 5n,
      executed: false,
      approved: false,
    },
  ];

  // Request loan via contract
  const handleRequestLoan = async (loanAmount, loanCollateral, intent = null) => {
    if (!loanAmount) return;

    try {
      // If we have a cross-chain intent, log it
      if (intent) {
        console.log('Processing loan with cross-chain intent:', intent);
      }

      // Mock contract interaction
      console.log('Requesting loan:', {
        amount: loanAmount,
        collateral: loanCollateral,
        borrower: address,
        intent: intent?.id,
      });

      // Simulate transaction
      setTimeout(() => {
        console.log('Loan request submitted successfully');
      }, 2000);
    } catch (error) {
      console.error('Error requesting loan:', error);
    }
  };

  // Back loan via contract
  const handleBackLoan = async (requestId) => {
    try {
      console.log('Backing loan request:', requestId);
      // Mock transaction
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
        {['browse', 'request', 'crossChain', 'myLoans'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
              ? 'border-blue-500 text-gray-100'
              : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
          >
            {tab === 'browse' && 'Browse'}
            {tab === 'request' && 'Request Loan'}
            {tab === 'crossChain' && 'Cross-Chain'}
            {tab === 'myLoans' && 'My Loans'}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-100">
              Active Requests ({mockRequests.length})
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
          ) : mockRequests.length === 0 ? (
            <div className="card text-center py-12">
              <Coins className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-400 mb-2">No active loan requests</p>
              <p className="text-xs text-gray-600">
                Be the first to request a loan
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockRequests.map((request, i) => (
                <LoanRequestCard
                  key={i}
                  requestId={i}
                  request={request}
                  onBack={handleBackLoan}
                  nexus={nexus}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cross-Chain Tab */}
      {activeTab === 'crossChain' && (
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

              {/* Unified Balances */}
              {unifiedBalances && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-100 mb-4">Unified Balances</h3>
                  <div className="space-y-3">
                    {Object.entries(unifiedBalances.balances || {}).map(([chain, balance]) => (
                      <div key={chain} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                          <span className="text-sm text-gray-300 capitalize">{chain}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-100">
                            {balance.USDT ? `$${balance.USDT.toLocaleString()}` : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">USDT</div>
                        </div>
                      </div>
                    ))}
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
