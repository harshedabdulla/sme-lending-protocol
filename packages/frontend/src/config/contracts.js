// Contract addresses and ABIs
export const CONTRACT_ADDRESSES = {
  // Main contracts
  LENDING_POOL: import.meta.env.VITE_LENDING_POOL_ADDRESS || "0x...",
  LOAN_MANAGER: import.meta.env.VITE_LOAN_MANAGER_ADDRESS || "0x...",
  CREDIT_SCORE: import.meta.env.VITE_CREDIT_SCORE_ADDRESS || "0x...",

  // DAO contracts
  DAO_MEMBERSHIP: import.meta.env.VITE_DAO_MEMBERSHIP_ADDRESS || "0x...",
  GOVERNANCE_TOKEN: import.meta.env.VITE_GOVERNANCE_TOKEN_ADDRESS || "0x...",
  REPUTATION_NFT: import.meta.env.VITE_REPUTATION_NFT_ADDRESS || "0x...",
  INSURANCE_POOL: import.meta.env.VITE_INSURANCE_POOL_ADDRESS || "0x...",
  YIELDING_POOL: import.meta.env.VITE_YIELDING_POOL_ADDRESS || "0x...",

  // Token contracts
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Mainnet USDT
  USDC: "0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C4", // Mainnet USDC
};

// Chain configurations for cross-chain operations
export const CHAIN_CONFIG = {
  ethereum: {
    chainId: 1,
    name: "Ethereum",
    rpcUrl: "https://eth.llamarpc.com",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  polygon: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon.llamarpc.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: "https://arbitrum.llamarpc.com",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/your_key",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  },
};

// Nexus SDK configuration
export const NEXUS_CONFIG = {
  network: import.meta.env.VITE_NEXUS_NETWORK || "testnet",
  rpcUrl: import.meta.env.VITE_NEXUS_RPC_URL || "https://rpc.avail.tools",
  supportedChains: [1, 137, 42161, 11155111], // Ethereum, Polygon, Arbitrum, Sepolia
};

// Loan configuration
export const LOAN_CONFIG = {
  MIN_LOAN_AMOUNT: 1000, // $1000 minimum
  MAX_LOAN_AMOUNT: 100000, // $100,000 maximum
  INTEREST_RATE_RANGE: {
    min: 5, // 5% APR
    max: 25, // 25% APR
  },
  LOAN_TERMS: [30, 60, 90, 180, 365], // Days
  COLLATERAL_RATIO: 0.1, // 10% collateral required
};

// DAO configuration
export const DAO_CONFIG = {
  MIN_VOTING_POWER: 1000, // Minimum tokens to vote
  VOTING_PERIOD: 7 * 24 * 60 * 60, // 7 days in seconds
  EXECUTION_DELAY: 24 * 60 * 60, // 24 hours in seconds
  QUORUM_THRESHOLD: 0.1, // 10% of total supply
};

// Credit score configuration
export const CREDIT_CONFIG = {
  MIN_SCORE: 300,
  MAX_SCORE: 850,
  SCORE_FACTORS: {
    repayment_history: 0.35,
    credit_utilization: 0.30,
    credit_length: 0.15,
    new_credit: 0.10,
    credit_mix: 0.10,
  },
};