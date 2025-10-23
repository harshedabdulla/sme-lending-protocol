import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNexus } from '../contexts/NexusContext';
import { createCrossChainIntent } from '../lib/nexus';
import { CHAIN_CONFIG } from '../config/contracts';
import { Fuel, Zap, Globe, ArrowRight, AlertTriangle } from 'lucide-react';

const GasManager = () => {
    const { address, isConnected } = useAccount();
    const { nexus } = useNexus();
    const [gasBalances, setGasBalances] = useState({});
    const [selectedChain, setSelectedChain] = useState('ethereum');
    const [refuelAmount, setRefuelAmount] = useState('');
    const [isRefueling, setIsRefueling] = useState(false);
    const [gasPrices, setGasPrices] = useState({});

    useEffect(() => {
        if (nexus && isConnected) {
            loadGasData();
        }
    }, [nexus, isConnected]);

    const loadGasData = async () => {
        try {
            // Mock gas balance data
            const mockGasBalances = {
                ethereum: { balance: '0.05', symbol: 'ETH', usd: 150 },
                polygon: { balance: '2.3', symbol: 'MATIC', usd: 2.1 },
                arbitrum: { balance: '0.12', symbol: 'ETH', usd: 360 },
            };

            const mockGasPrices = {
                ethereum: { gwei: 25, usd: 0.0015 },
                polygon: { gwei: 30, usd: 0.0001 },
                arbitrum: { gwei: 0.1, usd: 0.00005 },
            };

            setGasBalances(mockGasBalances);
            setGasPrices(mockGasPrices);
        } catch (error) {
            console.error("Failed to load gas data:", error);
        }
    };

    const handleGasRefuel = async () => {
        if (!refuelAmount || !nexus) return;

        setIsRefueling(true);
        try {
            const intentData = {
                type: 'gas_refuel',
                fromChain: 'ethereum',
                toChain: selectedChain,
                amount: parseFloat(refuelAmount),
                user: address,
                token: selectedChain === 'polygon' ? 'MATIC' : 'ETH',
                purpose: 'cross_chain_operations',
            };

            const intent = await createCrossChainIntent(intentData);
            console.log('Gas refuel intent created:', intent);

            // Simulate refuel completion
            setTimeout(() => {
                console.log('Gas refuel completed');
                setIsRefueling(false);
                setRefuelAmount('');
            }, 3000);
        } catch (error) {
            console.error('Failed to create gas refuel intent:', error);
            setIsRefueling(false);
        }
    };

    const getGasStatus = (chain) => {
        const balance = parseFloat(gasBalances[chain]?.balance || 0);
        if (balance < 0.01) return 'critical';
        if (balance < 0.05) return 'low';
        return 'good';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'critical': return 'text-red-400';
            case 'low': return 'text-amber-400';
            default: return 'text-emerald-400';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'critical': return <AlertTriangle className="w-4 h-4" />;
            case 'low': return <AlertTriangle className="w-4 h-4" />;
            default: return <Fuel className="w-4 h-4" />;
        }
    };

    if (!nexus) {
        return (
            <div className="card text-center py-12">
                <Globe className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-sm text-gray-400 mb-2">Nexus SDK Not Connected</p>
                <p className="text-xs text-gray-600">
                    Connect your wallet to enable cross-chain gas management
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-100 flex items-center space-x-2">
                    <Fuel className="w-5 h-5 text-blue-400" />
                    <span>Cross-Chain Gas Manager</span>
                </h2>
                <div className="flex items-center space-x-2 text-sm text-emerald-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Nexus Connected</span>
                </div>
            </div>

            {/* Gas Balances Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(gasBalances).map(([chain, data]) => {
                    const status = getGasStatus(chain);
                    return (
                        <div key={chain} className="card hover:border-gray-800">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                                    <span className="text-sm font-medium text-gray-300 capitalize">{chain}</span>
                                </div>
                                <div className={`flex items-center space-x-1 ${getStatusColor(status)}`}>
                                    {getStatusIcon(status)}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="text-lg font-semibold text-gray-100">
                                    {data.balance} {data.symbol}
                                </div>
                                <div className="text-xs text-gray-500">
                                    ≈ ${data.usd.toFixed(2)} USD
                                </div>
                                <div className="text-xs text-gray-600">
                                    Gas Price: {gasPrices[chain]?.gwei || 0} gwei
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Gas Refuel Interface */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Refuel Gas</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Target Chain
                        </label>
                        <select
                            value={selectedChain}
                            onChange={(e) => setSelectedChain(e.target.value)}
                            className="input"
                        >
                            <option value="ethereum">Ethereum</option>
                            <option value="polygon">Polygon</option>
                            <option value="arbitrum">Arbitrum</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Refuel Amount ({selectedChain === 'polygon' ? 'MATIC' : 'ETH'})
                        </label>
                        <input
                            type="number"
                            value={refuelAmount}
                            onChange={(e) => setRefuelAmount(e.target.value)}
                            placeholder="0.1"
                            step="0.001"
                            className="input"
                        />
                        <div className="flex space-x-2 mt-2">
                            <button
                                onClick={() => setRefuelAmount('0.01')}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                0.01
                            </button>
                            <button
                                onClick={() => setRefuelAmount('0.05')}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                0.05
                            </button>
                            <button
                                onClick={() => setRefuelAmount('0.1')}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                0.1
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleGasRefuel}
                        disabled={!refuelAmount || isRefueling}
                        className="w-full btn-primary flex items-center justify-center space-x-2"
                    >
                        {isRefueling ? (
                            <>
                                <div className="spinner" />
                                <span>Refueling Gas...</span>
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4" />
                                <span>Refuel Gas</span>
                            </>
                        )}
                    </button>

                    <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg">
                        <div className="flex items-center space-x-2 text-sm text-blue-400 mb-2">
                            <Globe className="w-4 h-4" />
                            <span>Cross-Chain Gas Optimization</span>
                        </div>
                        <ul className="text-xs text-gray-500 space-y-1">
                            <li>• Automatic gas price optimization</li>
                            <li>• Cross-chain gas bridging</li>
                            <li>• Smart gas allocation</li>
                            <li>• Transaction batching for efficiency</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Gas Usage Analytics */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Gas Usage Analytics</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-300">Recent Transactions</div>
                        <div className="space-y-2">
                            {[
                                { type: 'Loan Request', chain: 'Ethereum', gas: '0.0023 ETH', time: '2h ago' },
                                { type: 'Cross-Chain Deposit', chain: 'Polygon', gas: '0.0015 MATIC', time: '5h ago' },
                                { type: 'Gas Refuel', chain: 'Arbitrum', gas: '0.0008 ETH', time: '1d ago' },
                            ].map((tx, i) => (
                                <div key={i} className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
                                    <div>
                                        <div className="text-xs text-gray-300">{tx.type}</div>
                                        <div className="text-xs text-gray-500">{tx.chain}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400">{tx.gas}</div>
                                        <div className="text-xs text-gray-600">{tx.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-300">Gas Efficiency Tips</div>
                        <div className="space-y-2 text-xs text-gray-500">
                            <div className="flex items-start space-x-2">
                                <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                                <span>Use Polygon for lower fees on small transactions</span>
                            </div>
                            <div className="flex items-start space-x-2">
                                <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                                <span>Batch multiple operations to save gas</span>
                            </div>
                            <div className="flex items-start space-x-2">
                                <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                                <span>Monitor gas prices before large transactions</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GasManager;
