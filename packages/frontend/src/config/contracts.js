/**
 * Deployed Contract Addresses and ABIs
 * Network: Sepolia Testnet
 * All addresses are loaded from environment variables
 */

export const CHAIN_ID = {
  SEPOLIA: Number(import.meta.env.VITE_CHAIN_ID) || 11155111,
};

export const CONTRACTS = {
  sepolia: {
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
  },
};

// Simplified ABIs (only the functions we need for the frontend)
export const ABIS = {
  governanceToken: [
    "function balanceOf(address) view returns (uint256)",
    "function stake(uint256 amount)",
    "function requestUnstake(uint256 amount)",
    "function unstake()",
    "function getStakeInfo(address user) view returns (uint256 stakedAmount, uint256 unstakeAmount, uint256 unstakeAvailableAt)",
    "function getVotingPower(address user) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "event Staked(address indexed user, uint256 amount, uint256 totalStaked)",
    "event Unstaked(address indexed user, uint256 amount)",
  ],

  reputationNFT: [
    {
      "inputs": [{"internalType": "address", "name": "member", "type": "address"}],
      "name": "getReputation",
      "outputs": [{
        "components": [
          {"internalType": "uint256", "name": "totalBacked", "type": "uint256"},
          {"internalType": "uint256", "name": "successfulBacked", "type": "uint256"},
          {"internalType": "uint256", "name": "defaultedBacked", "type": "uint256"},
          {"internalType": "uint256", "name": "memberSince", "type": "uint256"},
          {"internalType": "uint256", "name": "reputationScore", "type": "uint256"}
        ],
        "internalType": "struct ReputationNFT.Reputation",
        "name": "",
        "type": "tuple"
      }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "member", "type": "address"}],
      "name": "getReputationScore",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "member", "type": "address"}],
      "name": "hasMembership",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ],

  daoMembership: [
    {
      "inputs": [
        {"internalType": "address", "name": "candidate", "type": "address"},
        {"internalType": "string", "name": "reason", "type": "string"}
      ],
      "name": "proposeMembership",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "proposalId", "type": "uint256"},
        {"internalType": "bool", "name": "support", "type": "bool"}
      ],
      "name": "vote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "uint256", "name": "proposalId", "type": "uint256"}],
      "name": "executeProposal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "uint256", "name": "proposalId", "type": "uint256"}],
      "name": "getProposal",
      "outputs": [
        {"internalType": "address", "name": "candidate", "type": "address"},
        {"internalType": "address", "name": "proposer", "type": "address"},
        {"internalType": "uint256", "name": "startTime", "type": "uint256"},
        {"internalType": "uint256", "name": "endTime", "type": "uint256"},
        {"internalType": "uint256", "name": "votesFor", "type": "uint256"},
        {"internalType": "uint256", "name": "votesAgainst", "type": "uint256"},
        {"internalType": "bool", "name": "executed", "type": "bool"},
        {"internalType": "bool", "name": "approved", "type": "bool"},
        {"internalType": "string", "name": "reason", "type": "string"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
      "name": "isActiveMember",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getActiveMemberCount",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "proposalCount",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ],

  loanVoting: [
    "function requestLoan(uint256 amount, uint256 collateralPercentage) returns (uint256)",
    "function backLoan(uint256 requestId)",
    "function executeRequest(uint256 requestId)",
    "function getRequest(uint256 requestId) view returns (address borrower, uint256 amount, uint256 requestedCollateral, uint256 startTime, uint256 endTime, uint256 backerCount, bool executed, bool approved)",
    "function getBackers(uint256 requestId) view returns (address[])",
    "function calculateRequiredCollateral(uint256 backerCount) pure returns (uint256)",
    "function requestCount() view returns (uint256)",
    "event LoanRequested(uint256 indexed requestId, address indexed borrower, uint256 amount, uint256 requestedCollateral)",
    "event LoanBacked(uint256 indexed requestId, address indexed backer, uint256 votingPower)",
    "event LoanApproved(uint256 indexed requestId, address indexed borrower, uint256 amount, uint256 requiredCollateral, uint256 backerCount)",
  ],

  yieldingPool: [
    "function deposit(uint256 amount)",
    "function requestWithdrawal(uint256 shareAmount)",
    "function withdraw()",
    "function balanceOf(address user) view returns (uint256)",
    "function shares(address user) view returns (uint256)",
    "function getTotalValueLocked() view returns (uint256)",
    "function withdrawalRequests(address user) view returns (uint256 shares, uint256 requestTime)",
    "function canWithdraw(address user) view returns (bool)",
    "event Deposited(address indexed user, uint256 amount, uint256 shares)",
    "event Withdrawn(address indexed user, uint256 amount, uint256 shares)",
  ],

  insurancePool: [
    "function getTotalBalance() view returns (uint256)",
    "function getAvailableBalance() view returns (uint256)",
    "function isHealthy() view returns (bool)",
    "function totalCollected() view returns (uint256)",
    "function totalPaidOut() view returns (uint256)",
  ],

  loanManager: [
    "function loans(address borrower) view returns (uint256 principal, uint256 interestRate, uint256 totalOwed, uint256 amountRepaid, uint256 startTime, uint256 deadline, uint8 status)",
    "function getRemainingDebt(address borrower) view returns (uint256)",
    "function checkEligibility(address borrower) view returns (bool eligible, string reason)",
    "function totalActiveLoans() view returns (uint256)",
    "function totalLoansDisbursed() view returns (uint256)",
  ],

  mockUSDT: [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
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

// Protocol parameters
export const PROTOCOL_PARAMS = {
  minStakeToVote: "100", // 100 tokens
  minStakeToBack: "500", // 500 tokens
  unstakeCooldown: 7 * 24 * 60 * 60, // 7 days in seconds
  slashPercentage: 10, // 10%
  membershipVotePeriod: 7 * 24 * 60 * 60, // 7 days
  loanVotePeriod: 3 * 24 * 60 * 60, // 3 days
  minBackers: 3,
  protocolFee: 1, // 1%
  insuranceCoverage: 30, // 30%
  withdrawalFee: 0.5, // 0.5%
  performanceFee: 10, // 10%
};

export default CONTRACTS;
