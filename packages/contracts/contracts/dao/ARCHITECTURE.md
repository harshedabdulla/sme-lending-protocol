# DAO Lending Protocol - System Architecture

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DAO LENDING PROTOCOL                                 │
│                    Social Trust + Partial Collateral                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  MEMBER LAYER - Governance & Identity                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐  │
│  │ GovernanceToken  │      │  ReputationNFT   │      │  DAOMembership   │  │
│  ├──────────────────┤      ├──────────────────┤      ├──────────────────┤  │
│  │ • ERC20 Token    │      │ • Soul-bound NFT │      │ • 2/3 Vote Rule  │  │
│  │ • Staking        │◄────►│ • Success Rate   │◄────►│ • New Members    │  │
│  │ • Voting Power   │      │ • Score (0-1000) │      │ • 7-day Period   │  │
│  │ • Slashing       │      │ • Backing History│      │ • Token Grants   │  │
│  └────────┬─────────┘      └──────────────────┘      └──────────────────┘  │
│           │                                                                  │
└───────────┼──────────────────────────────────────────────────────────────────┘
            │
            │ Voting Power
            │
┌───────────▼──────────────────────────────────────────────────────────────────┐
│  LENDING LAYER - Loan Management                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         LoanVoting (Core Contract)                      │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ • Dynamic Collateral: 100% - (8% × backers)                            │ │
│  │ • Minimum Collateral: 20%                                              │ │
│  │ • Minimum Backers: 3                                                   │ │
│  │ • Voting Period: 3 days                                                │ │
│  │ • Loss Distribution on Default                                         │ │
│  │ • Reputation Updates                                                   │ │
│  └───────┬──────────────────┬─────────────────┬──────────────────────────┘ │
│          │                  │                 │                            │
└──────────┼──────────────────┼─────────────────┼────────────────────────────┘
           │                  │                 │
           │                  │                 │
┌──────────▼──────────────────▼─────────────────▼────────────────────────────┐
│  SUPPORT LAYER - Risk Management & Yields                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐  │
│  │  YieldingPool    │      │  InsurancePool   │      │  LoanManager     │  │
│  ├──────────────────┤      ├──────────────────┤      ├──────────────────┤  │
│  │ • Passive Mode   │      │ • 1% Protocol Fee│      │ • Existing Core  │  │
│  │ • DeFi Yields    │      │ • 30% Coverage   │      │ • Interest Calc  │  │
│  │ • Share-based    │      │ • Backer Protect │      │ • Repayment      │  │
│  │ • Low Risk       │      │ • Claim Process  │      │ • Defaults       │  │
│  └──────────────────┘      └──────────────────┘      └──────────────────┘  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  BASE LAYER - Asset Management                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────┐                           ┌──────────────────┐        │
│  │  LendingPool     │                           │  CreditScore     │        │
│  ├──────────────────┤                           ├──────────────────┤        │
│  │ • Deposits       │                           │ • Score Oracle   │        │
│  │ • Withdrawals    │                           │ • 0-1000 Scale   │        │
│  │ • Liquidity      │                           │ • Access Control │        │
│  └──────────────────┘                           └──────────────────┘        │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

## User Journey Flows

### 1. New Member Admission

```
┌─────────┐
│Candidate│
└────┬────┘
     │
     ▼
┌────────────────────┐
│ 1. Apply           │
│    (off-chain)     │
└─────────┬──────────┘
          │
          ▼
     ┌────────────────────────┐
     │ DAOMembership          │
     │ proposeMembership()    │
     └──────┬─────────────────┘
            │
            ▼
     ┌─────────────────┐
     │ Voting Period   │
     │ (7 days)        │
     └──────┬──────────┘
            │
            ▼
     ┌─────────────────────────┐
     │ Members Vote            │
     │ (staked tokens = power) │
     └──────┬──────────────────┘
            │
            ▼
     ┌─────────────────────┐
     │ executeProposal()   │
     └──────┬──────────────┘
            │
            ├─── Approved (≥66.67%) ──┐
            │                          │
            │                          ▼
            │                   ┌──────────────────┐
            │                   │ ReputationNFT    │
            │                   │ mint()           │
            │                   └────────┬─────────┘
            │                            │
            │                            ▼
            │                   ┌──────────────────┐
            │                   │ GovernanceToken  │
            │                   │ grant 1000 tokens│
            │                   └────────┬─────────┘
            │                            │
            │                            ▼
            │                   ┌──────────────────┐
            │                   │ Status: ACTIVE   │
            │                   └──────────────────┘
            │
            └─── Rejected (<66.67%) ──┐
                                       │
                                       ▼
                              ┌────────────────┐
                              │ Status: NONE   │
                              └────────────────┘
```

### 2. Loan Request & Backing

```
┌──────────┐
│ Borrower │
└────┬─────┘
     │
     ▼
┌────────────────────────┐
│ LoanVoting             │
│ requestLoan()          │
│ - Amount               │
│ - Collateral Offered   │
└──────┬─────────────────┘
       │
       ▼
┌──────────────────┐
│ Voting Period    │
│ (3 days)         │
└──────┬───────────┘
       │
       ▼
┌───────────────────────────┐
│ Members Back Loan         │
│ backLoan()                │
│ (min stake: 500 tokens)   │
└──────┬────────────────────┘
       │
       │ Backer Count: 0, 1, 2, 3+ ...
       │
       ▼
┌───────────────────────────────────────────┐
│ Calculate Required Collateral             │
│                                           │
│  0 backers  → 100%                        │
│  5 backers  → 60%  (100 - 5×8)           │
│  10 backers → 20%  (minimum)              │
│                                           │
└──────┬────────────────────────────────────┘
       │
       ▼
┌────────────────────┐
│ executeRequest()   │
└──────┬─────────────┘
       │
       ├─── APPROVED ───┐
       │                │
       │                ▼
       │         ┌──────────────────────┐
       │         │ InsurancePool        │
       │         │ collectFee(1%)       │
       │         └────────┬─────────────┘
       │                  │
       │                  ▼
       │         ┌──────────────────────┐
       │         │ LoanManager          │
       │         │ disburseLoan()       │
       │         └────────┬─────────────┘
       │                  │
       │                  ▼
       │         ┌──────────────────────┐
       │         │ Borrower Receives $$ │
       │         └──────────────────────┘
       │
       └─── REJECTED ───┐
                        │
                        ▼
                ┌───────────────────┐
                │ Insufficient:     │
                │ • Backers < 3, or │
                │ • Collateral low  │
                └───────────────────┘
```

### 3. Loan Repayment (Success)

```
┌──────────┐
│ Borrower │
│ repays   │
└────┬─────┘
     │
     ▼
┌────────────────────┐
│ LoanManager        │
│ repayLoan()        │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│ LoanVoting         │
│ handleRepayment()  │
└──────┬─────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Update All Backers           │
│                              │
│ For each backer:             │
│ • Reputation++               │
│ • Success count++            │
│ • Interest distributed       │
└──────────────────────────────┘
```

### 4. Loan Default (Failure)

```
┌──────────┐
│ Deadline │
│ passed   │
└────┬─────┘
     │
     ▼
┌────────────────────┐
│ LoanManager        │
│ markAsDefault()    │
└──────┬─────────────┘
       │
       ▼
┌────────────────────────────┐
│ LoanVoting                 │
│ handleDefault(lossAmount)  │
└──────┬─────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Calculate Backer Losses                  │
│                                          │
│ For each backer:                         │
│   loss = (lossAmount × votingPower)     │
│          ─────────────────────────       │
│           totalVotingPower               │
└──────┬───────────────────────────────────┘
       │
       ├────────────────────┬───────────────────┐
       │                    │                   │
       ▼                    ▼                   ▼
┌──────────────┐   ┌────────────────┐   ┌──────────────────┐
│ Reputation   │   │ InsurancePool  │   │ Slashing Check   │
│ Update       │   │ fileClaim()    │   │                  │
│              │   │                │   │ Loss rate > 30%? │
│ recordBacking│   │ Coverage: 30%  │   │ Defaults > 5?    │
│ (false)      │   │ of loss        │   │                  │
│              │   │                │   │ → slash(10%)     │
└──────────────┘   └────────┬───────┘   └──────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Pay Backers     │
                   │ Proportionally  │
                   └─────────────────┘
```

## Two Participation Modes

### Active Lending Mode (High Risk/Reward)

```
┌─────────────────────────────────────────────────────┐
│               ACTIVE LENDING                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Member → Stake Tokens → Back Loans                │
│                              │                      │
│                              ▼                      │
│                    ┌───────────────────┐           │
│                    │  Loan Approved    │           │
│                    └─────────┬─────────┘           │
│                              │                      │
│              ┌───────────────┴───────────────┐     │
│              │                               │     │
│              ▼                               ▼     │
│    ┌──────────────────┐           ┌──────────────┐│
│    │  REPAID          │           │  DEFAULT     ││
│    ├──────────────────┤           ├──────────────┤│
│    │   High Interest  │           │   Loss      ││
│    │   Reputation++   │           │   Insurance ││
│    │   Future Weight  │           │   Reputation││
│    └──────────────────┘           │    Slashing ││
│                                   └──────────────┘│
└─────────────────────────────────────────────────────┘
```

### Yielding Mode (Low Risk)

```
┌─────────────────────────────────────────────────────┐
│                YIELDING MODE                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Member → Deposit → YieldingPool                    │
│                        │                            │
│                        ▼                            │
│              ┌─────────────────┐                   │
│              │ Deploy to DeFi  │                   │
│              │ (Aave/Compound) │                   │
│              └────────┬────────┘                   │
│                       │                             │
│                       ▼                             │
│              ┌─────────────────┐                   │
│              │ Earn Steady APY │                   │
│              │ • 3-7% typical  │                   │
│              │ • Auto-compound │                   │
│              │ • Low risk      │                   │
│              └─────────────────┘                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Collateral Reduction Formula

```
Required Collateral (%) = max(100 - (backers × 8), 20)

Graph:

100% ┤●
     │ ╲
 80% ┤  ╲
     │   ╲
 60% ┤    ●────── 5 backers = 60%
     │     ╲
 40% ┤      ╲
     │       ╲
 20% ┤        ●━━━━━━━━━━━━━ 10+ backers = 20% (floor)
     │
  0% └─────────────────────────────────
     0    5    10   15   20  (backers)
```

## Economic Flows

```
┌─────────────────────────────────────────────────────────┐
│              PROTOCOL ECONOMICS                          │
└─────────────────────────────────────────────────────────┘

INFLOWS:
┌──────────────────────┐
│ 1% Protocol Fee      │──┐
│ (on loan disburse)   │  │
└──────────────────────┘  │
                          ├──► ┌──────────────────┐
┌──────────────────────┐  │    │ InsurancePool    │
│ 0.5% Withdrawal Fee  │──┤    │                  │
│ (YieldingPool)       │  │    │ • Default cover  │
└──────────────────────┘  │    │ • Backer protect │
                          │    └──────────────────┘
┌──────────────────────┐  │
│ 10% Performance Fee  │──┘
│ (DeFi yields)        │
└──────────────────────┘

OUTFLOWS:
┌──────────────────────┐
│ Insurance Payouts    │
│ (up to 30% of loss)  │
└──────────────────────┘

┌──────────────────────┐
│ Interest to Backers  │
│ (successful loans)   │
└──────────────────────┘

┌──────────────────────┐
│ Yields to Depositors │
│ (YieldingPool)       │
└──────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 ACCESS CONTROL MATRIX                    │
├──────────────┬──────────────────────────────────────────┤
│ Contract     │ Authorized Actions                        │
├──────────────┼──────────────────────────────────────────┤
│ LoanVoting   │ • Update reputations (ReputationNFT)    │
│              │ • Slash stakes (GovernanceToken)         │
│              │ • Collect fees (InsurancePool)           │
│              │ • File claims (InsurancePool)            │
├──────────────┼──────────────────────────────────────────┤
│ DAOMembership│ • Mint reputation NFTs (ReputationNFT)  │
│              │ • Mint governance tokens                 │
├──────────────┼──────────────────────────────────────────┤
│ Owner        │ • Emergency functions                    │
│              │ • Parameter updates                      │
│              │ • Authorization management               │
└──────────────┴──────────────────────────────────────────┘

PROTECTION MECHANISMS:
┌─────────────────────────────────────────────────────────┐
│ ✓ ReentrancyGuard on all state-changing functions       │
│ ✓ SafeERC20 for token transfers                        │
│ ✓ Checks-Effects-Interactions pattern                   │
│ ✓ Soul-bound NFTs (prevent reputation trading)          │
│ ✓ Cooldown periods (unstaking, withdrawals)             │
│ ✓ Minimum thresholds (voting, backing)                  │
└─────────────────────────────────────────────────────────┘
```

## Deployment Sequence

```
Step 1: GovernanceToken
   │
   ▼
Step 2: ReputationNFT
   │
   ▼
Step 3: DAOMembership
   │
   ├──► Authorize as ReputationNFT updater
   │
   ▼
Step 4: YieldingPool
   │
   ▼
Step 5: InsurancePool
   │
   ▼
Step 6: LoanVoting
   │
   ├──► Authorize as ReputationNFT updater
   ├──► Authorize as GovernanceToken slasher
   └──► Authorize as InsurancePool contract
   │
   ▼
Step 7: Configuration
   │
   ├──► Mint initial reputation NFT (deployer)
   ├──► Set yield strategy (YieldingPool)
   └──► Fund insurance pool
```

## Key Metrics Dashboard

```
┌─────────────────────────────────────────────────────────┐
│                 PROTOCOL METRICS                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  MEMBERSHIP                                              │
│  • Total Members: ___                                    │
│  • Active Members: ___                                   │
│  • Pending Proposals: ___                                │
│                                                          │
│  LENDING                                                 │
│  • Total Loans: ___                                      │
│  • Active Loans: ___                                     │
│  • Default Rate: ___%                                    │
│  • Avg Collateral: ___%                                  │
│                                                          │
│  BACKING                                                 │
│  • Total Backers: ___                                    │
│  • Avg Backers/Loan: ___                                 │
│  • Success Rate: ___%                                    │
│                                                          │
│  ECONOMICS                                               │
│  • TVL: $___                                             │
│  • Insurance Pool: $___                                  │
│  • Yielding Pool: $___                                   │
│  • Protocol Fees: $___                                   │
│                                                          │
│  GOVERNANCE                                              │
│  • Total Staked: ___ tokens                              │
│  • Avg Reputation: ___/1000                              │
│  • Slashing Events: ___                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Testing**: Comprehensive test suite for all contracts
2. **Integration**: Connect with frontend and off-chain systems
3. **Audit**: Professional security audit before mainnet
4. **Optimization**: Gas optimization and UX improvements
5. **Monitoring**: Set up analytics and alerting

---

For detailed function documentation, see [README.md](./README.md)
