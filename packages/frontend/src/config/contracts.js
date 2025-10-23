/**
 * Deployed Contract Addresses and ABIs
 * Network: Sepolia Testnet
 * All addresses are loaded from environment variables
 */

export const CHAIN_ID = {
  SEPOLIA: Number(import.meta.env.VITE_CHAIN_ID) || 11155111,
};

// Contract addresses and ABIs
export const CONTRACT_ADDRESSES = {
  // Base Protocol Contracts
  mockUSDT: import.meta.env.VITE_MOCK_USDT_ADDRESS,
  creditScore: import.meta.env.VITE_CREDIT_SCORE_ADDRESS,
  lendingPool: import.meta.env.VITE_LENDING_POOL_ADDRESS,
  loanManager: import.meta.env.VITE_LOAN_MANAGER_ADDRESS,

  // DAO Governance Contracts
  governanceToken: import.meta.env.VITE_GOVERNANCE_TOKEN_ADDRESS,
  reputationNFT: import.meta.env.VITE_REPUTATION_NFT_ADDRESS,
  daoMembership: import.meta.env.VITE_DAO_MEMBERSHIP_ADDRESS,
  yieldingPool: import.meta.env.VITE_YIELDING_POOL_ADDRESS,
  insurancePool: import.meta.env.VITE_INSURANCE_POOL_ADDRESS,
  loanVoting: import.meta.env.VITE_LOAN_VOTING_ADDRESS,
};

// ABIs (only the functions we need for the frontend)
export const ABIS = {
  governanceToken: [
    {
      "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
      "name": "balanceOf",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
      "name": "stake",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
      "name": "requestUnstake",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unstake",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
      "name": "getStakeInfo",
      "outputs": [
        { "internalType": "uint256", "name": "stakedAmount", "type": "uint256" },
        { "internalType": "uint256", "name": "unstakeAmount", "type": "uint256" },
        { "internalType": "uint256", "name": "unstakeAvailableAt", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
      "name": "getVotingPower",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "spender", "type": "address" },
        { "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "approve",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],

  reputationNFT: [
    {
      "inputs": [{ "internalType": "address", "name": "member", "type": "address" }],
      "name": "getReputation",
      "outputs": [{
        "components": [
          { "internalType": "uint256", "name": "totalBacked", "type": "uint256" },
          { "internalType": "uint256", "name": "successfulBacked", "type": "uint256" },
          { "internalType": "uint256", "name": "defaultedBacked", "type": "uint256" },
          { "internalType": "uint256", "name": "memberSince", "type": "uint256" },
          { "internalType": "uint256", "name": "reputationScore", "type": "uint256" }
        ],
        "internalType": "struct ReputationNFT.Reputation",
        "name": "",
        "type": "tuple"
      }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "member", "type": "address" }],
      "name": "getReputationScore",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "member", "type": "address" }],
      "name": "hasMembership",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    }
  ],

  daoMembership: [
    {
      "inputs": [
        { "internalType": "address", "name": "candidate", "type": "address" },
        { "internalType": "string", "name": "reason", "type": "string" }
      ],
      "name": "proposeMembership",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "proposalId", "type": "uint256" },
        { "internalType": "bool", "name": "support", "type": "bool" }
      ],
      "name": "vote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "proposalId", "type": "uint256" }],
      "name": "executeProposal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "proposalId", "type": "uint256" }],
      "name": "getProposal",
      "outputs": [
        { "internalType": "address", "name": "candidate", "type": "address" },
        { "internalType": "address", "name": "proposer", "type": "address" },
        { "internalType": "uint256", "name": "startTime", "type": "uint256" },
        { "internalType": "uint256", "name": "endTime", "type": "uint256" },
        { "internalType": "uint256", "name": "votesFor", "type": "uint256" },
        { "internalType": "uint256", "name": "votesAgainst", "type": "uint256" },
        { "internalType": "bool", "name": "executed", "type": "bool" },
        { "internalType": "bool", "name": "approved", "type": "bool" },
        { "internalType": "string", "name": "reason", "type": "string" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
      "name": "isActiveMember",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getActiveMemberCount",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "proposalCount",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    }
  ],

  loanVoting: [
    {
      "inputs": [
        { "internalType": "uint256", "name": "amount", "type": "uint256" },
        { "internalType": "uint256", "name": "collateralPercentage", "type": "uint256" }
      ],
      "name": "requestLoan",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "requestId", "type": "uint256" }],
      "name": "backLoan",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "requestId", "type": "uint256" }],
      "name": "executeRequest",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "requestId", "type": "uint256" }],
      "name": "getRequest",
      "outputs": [
        { "internalType": "address", "name": "borrower", "type": "address" },
        { "internalType": "uint256", "name": "amount", "type": "uint256" },
        { "internalType": "uint256", "name": "requestedCollateral", "type": "uint256" },
        { "internalType": "uint256", "name": "startTime", "type": "uint256" },
        { "internalType": "uint256", "name": "endTime", "type": "uint256" },
        { "internalType": "uint256", "name": "backerCount", "type": "uint256" },
        { "internalType": "bool", "name": "executed", "type": "bool" },
        { "internalType": "bool", "name": "approved", "type": "bool" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "requestId", "type": "uint256" }],
      "name": "getBackers",
      "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "backerCount", "type": "uint256" }],
      "name": "calculateRequiredCollateral",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "requestCount",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    }
  ],

  yieldingPool: [
    {
      "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
      "name": "deposit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "shareAmount", "type": "uint256" }],
      "name": "requestWithdrawal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
      "name": "balanceOf",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "name": "shares",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalValueLocked",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "name": "withdrawalRequests",
      "outputs": [
        { "internalType": "uint256", "name": "shares", "type": "uint256" },
        { "internalType": "uint256", "name": "requestTime", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
      "name": "canWithdraw",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    }
  ],

  insurancePool: [
    {
      "inputs": [],
      "name": "getTotalBalance",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAvailableBalance",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "isHealthy",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalCollected",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalPaidOut",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    }
  ],

  loanManager: [
    {
      "inputs": [{ "internalType": "address", "name": "borrower", "type": "address" }],
      "name": "loans",
      "outputs": [
        { "internalType": "uint256", "name": "principal", "type": "uint256" },
        { "internalType": "uint256", "name": "interestRate", "type": "uint256" },
        { "internalType": "uint256", "name": "totalOwed", "type": "uint256" },
        { "internalType": "uint256", "name": "amountRepaid", "type": "uint256" },
        { "internalType": "uint256", "name": "startTime", "type": "uint256" },
        { "internalType": "uint256", "name": "deadline", "type": "uint256" },
        { "internalType": "uint8", "name": "status", "type": "uint8" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "borrower", "type": "address" }],
      "name": "getRemainingDebt",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "borrower", "type": "address" }],
      "name": "checkEligibility",
      "outputs": [
        { "internalType": "bool", "name": "eligible", "type": "bool" },
        { "internalType": "string", "name": "reason", "type": "string" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalActiveLoans",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalLoansDisbursed",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    }
  ],

  mockUSDT: [
    {
      "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
      "name": "balanceOf",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "spender", "type": "address" },
        { "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "approve",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "owner", "type": "address" },
        { "internalType": "address", "name": "spender", "type": "address" }
      ],
      "name": "allowance",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
      "stateMutability": "view",
      "type": "function"
    }
  ],
};

// Contract metadata
export const CONTRACT_INFO = {
  governanceToken: {
    name: "Prism Governance Token",
    symbol: "SMEDAO",
    decimals: 18,
  },
  mockUSDT: {
    name: "Mock USDT",
    symbol: "MUSDT",
    decimals: 6,
  },
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

// Protocol parameters (UPDATED FOR DEMO - 5 minutes instead of days)
export const PROTOCOL_PARAMS = {
  minStakeToVote: "100", // 100 tokens
  minStakeToBack: "500", // 500 tokens
  unstakeCooldown: 5 * 60, // 5 minutes in seconds (was 7 days)
  slashPercentage: 10, // 10%
  membershipVotePeriod: 5 * 60, // 5 minutes in seconds (was 7 days)
  loanVotePeriod: 5 * 60, // 5 minutes in seconds (was 3 days)
  minBackers: 3,
  protocolFee: 1, // 1%
  insuranceCoverage: 30, // 30%
  withdrawalFee: 0.5, // 0.5%
  performanceFee: 10, // 10%
};
