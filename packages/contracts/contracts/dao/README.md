# DAO Lending Protocol - Smart Contracts

## Overview

This DAO-based protocol scheme combines social trust with partial collateral to provide undercollateralized loans to SMEs. The protocol operates as a member-based DAO where existing members vouch for new borrowers through a backing mechanism.

## Architecture

### Core Contracts

#### 1. **GovernanceToken.sol**
The native ERC20 token used for governance and staking.

**Key Features:**
- Members stake tokens to participate in voting
- 7-day unstaking cooldown period
- 10% slashing for backers who consistently support defaulting borrowers
- Minimum stake: 100 tokens
- Voting power = staked amount

**Main Functions:**
- `stake(amount)` - Stake tokens to participate in governance
- `requestUnstake(amount)` - Start unstaking cooldown
- `unstake()` - Complete unstaking after cooldown
- `slash(user, reason)` - Slash user's stake (authorized contracts only)

---

#### 2. **ReputationNFT.sol**
Soul-bound NFT that tracks each member's backing history and reputation.

**Key Features:**
- Non-transferable (soul-bound) reputation tracking
- Tracks successful vs defaulted loan backings
- Dynamic reputation score (0-1000) based on success rate
- Used for governance weight and trust signals

**Reputation Calculation:**
- New members start at 500 (neutral)
- Score adjusts based on backing success rate
- More experience = score converges to actual success rate
- Score formula weighs experience vs success rate

**Main Functions:**
- `mintReputation(member)` - Issue NFT to new member
- `recordBacking(member, successful)` - Update backing history
- `getReputationScore(member)` - Get current reputation score
- `getSuccessRate(member)` - Get success rate percentage

---

#### 3. **DAOMembership.sol**
Manages DAO membership admission through 2/3 majority voting.

**Key Features:**
- 2/3 majority vote required for new members
- 7-day voting period
- Voting power based on staked governance tokens
- Automatic reputation NFT minting on admission
- New members receive governance token grant

**Membership Flow:**
1. Existing member proposes candidate with reason
2. Members vote (weighted by staked tokens)
3. After 7 days, proposal executed
4. If 66.67%+ approval: Member admitted, receives NFT + tokens
5. If rejected: Candidate status reset

**Main Functions:**
- `proposeMembership(candidate, reason)` - Propose new member
- `vote(proposalId, support)` - Vote on proposal
- `executeProposal(proposalId)` - Execute after voting period
- `isActiveMember(account)` - Check membership status

---

#### 4. **LoanVoting.sol**
Core contract for loan backing and dynamic collateral calculation.

**Key Features:**
- Social backing reduces collateral requirements
- Dynamic collateral formula: `100% - (8% × backers)`
- Minimum collateral: 20%
- 3-day voting period for loan requests
- Minimum 3 backers required
- Loss distribution among backers on default

**Collateral Formula:**
```
Required Collateral = max(100% - (backers × 8%), 20%)

Examples:
- 0 backers  → 100% collateral
- 5 backers  → 60% collateral
- 10 backers → 20% collateral (minimum)
```

**Loan Flow:**
1. Borrower requests loan with collateral offer
2. Members back the loan (3-day period)
3. Required collateral calculated from backer count
4. If sufficient backers + collateral: Approved
5. On default: Loss distributed to backers proportionally
6. Reputation updated for all backers

**Main Functions:**
- `requestLoan(amount, collateralPercentage)` - Request loan
- `backLoan(requestId)` - Back a loan request
- `executeRequest(requestId)` - Execute after voting
- `handleDefault(requestId, lossAmount)` - Process default
- `handleRepayment(requestId)` - Process successful repayment
- `calculateRequiredCollateral(backerCount)` - Calculate collateral

---

#### 5. **YieldingPool.sol**
Passive investment option for members seeking steady DeFi yields.

**Key Features:**
- Low-risk passive investment
- Share-based accounting (vault pattern)
- Integration ready for Aave/Compound
- 0.5% withdrawal fee
- 10% performance fee on yields
- 2-day withdrawal delay

**How It Works:**
1. Members deposit stablecoins
2. Funds deployed to DeFi protocols (Aave, Compound)
3. Yields harvested and auto-compounded
4. Performance fee taken, rest added to pool
5. Members can withdraw proportional share

**Main Functions:**
- `deposit(amount)` - Deposit for passive yields
- `requestWithdrawal(shares)` - Request withdrawal
- `withdraw()` - Complete withdrawal after delay
- `harvestYield()` - Harvest and compound yields
- `balanceOf(user)` - Check user's balance

---

#### 6. **InsurancePool.sol**
Insurance fund to cover partial losses on defaults.

**Key Features:**
- Funded by 1% protocol fee on all loans
- Covers up to 30% of default losses
- Protects active lenders and backers
- Minimum pool balance before payouts
- Transparent claim process

**How It Works:**
1. 1% fee collected on every loan disbursement
2. On default: Claim filed by LoanVoting contract
3. Coverage calculated (up to 30% of loss)
4. Insurance paid proportionally to backers
5. Reduces backer's actual loss

**Main Functions:**
- `collectFee(loanAmount)` - Collect protocol fee
- `fileClaim(borrower, loanAmount, lossAmount, backers)` - File claim
- `payClaim(claimId)` - Pay insurance claim
- `calculateCoverage(lossAmount)` - Calculate coverage amount

---

## Two Participation Modes

### 1. Yielding Mode (Low Risk)
- Deposit in **YieldingPool**
- Earn steady passive returns from DeFi protocols
- No active participation required
- Lower returns, minimal risk

### 2. Active Lending (Higher Returns)
- Participate in **LoanVoting** to back borrowers
- Earn higher interest on successful repayments
- Build reputation as trusted validator
- Share risk/reward with other backers

---

## Integration Flow

### New Member Admission
```
1. Candidate applies
2. DAOMembership.proposeMembership()
3. Members vote over 7 days
4. DAOMembership.executeProposal()
5. If approved:
   - ReputationNFT minted
   - GovernanceToken granted
   - Status set to Active
```

### Loan Approval Process
```
1. Borrower requests loan
2. LoanVoting.requestLoan()
3. Members back loan (3 days)
4. LoanVoting.executeRequest()
5. Calculate required collateral
6. If approved:
   - LoanManager.requestLoan() called
   - InsurancePool fee collected
   - Loan disbursed
```

### Default Handling
```
1. Loan defaults (past deadline)
2. LoanManager.markAsDefault()
3. LoanVoting.handleDefault()
   - Distribute loss to backers
   - Update reputations (negative)
   - Check slashing criteria
4. InsurancePool.fileClaim()
   - Calculate coverage (up to 30%)
   - Pay backers proportionally
5. GovernanceToken.slash() if chronic bad backing
```

### Successful Repayment
```
1. Borrower repays loan
2. LoanManager.repayLoan()
3. LoanVoting.handleRepayment()
   - Update reputations (positive)
   - Track backing success
4. Interest distributed to backers
```

---

## Incentive Structure

### For Backers
- ✅ Higher interest rates than yielding pool
- ✅ Reputation building → future governance weight
- ✅ Insurance coverage (up to 30% loss protection)
- ❌ Risk of loss if borrower defaults
- ❌ Stake slashing for chronic bad backing

### For Borrowers
- ✅ Lower collateral requirements with social backing
- ✅ Reputation building → easier future loans
- ✅ Access to capital with partial collateral
- ❌ Reputation destroyed on default
- ❌ Banned from protocol after default

### For Protocol
- 💰 1% protocol fee on all loans
- 💰 0.5% withdrawal fee from YieldingPool
- 💰 10% performance fee on DeFi yields
- 📊 Fee distribution: Insurance pool + DAO treasury

---

## Key Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Min Stake to Vote | 100 tokens | Minimum stake for governance |
| Min Stake to Back | 500 tokens | Minimum stake to back loans |
| Unstaking Cooldown | 7 days | Delay for unstaking tokens |
| Slash Percentage | 10% | Penalty for bad backing |
| Membership Vote Period | 7 days | Duration for admission votes |
| Membership Approval | 66.67% | 2/3 majority required |
| Loan Vote Period | 3 days | Duration for loan backing |
| Min Backers | 3 | Minimum backers for approval |
| Base Collateral | 100% | Starting collateral requirement |
| Min Collateral | 20% | Minimum with max backers |
| Collateral Reduction | 8% per backer | Reduction per backer |
| Withdrawal Delay | 2 days | YieldingPool withdrawal delay |
| Protocol Fee | 1% | Fee on loan disbursements |
| Insurance Coverage | 30% | Max coverage on defaults |
| Performance Fee | 10% | Fee on DeFi yields |

---

## Security Considerations

### Access Control
- ✅ Owner-only admin functions
- ✅ Authorized contracts for sensitive operations
- ✅ Member-only participation in voting

### Reentrancy Protection
- ✅ ReentrancyGuard on all state-changing functions
- ✅ Checks-Effects-Interactions pattern
- ✅ SafeERC20 for token transfers

### Slashing Protection
- ✅ Only authorized contracts can slash
- ✅ Slashing limited to 10% per event
- ✅ Criteria-based slashing (not arbitrary)

### Soul-bound NFTs
- ✅ Reputation NFTs non-transferable
- ✅ Prevents reputation marketplace
- ✅ Ensures authentic reputation tracking

---

## Deployment Order

1. **GovernanceToken** - Deploy first
2. **ReputationNFT** - Deploy second
3. **DAOMembership** - Deploy with GovernanceToken + ReputationNFT addresses
4. **YieldingPool** - Deploy with stablecoin + DAOMembership
5. **InsurancePool** - Deploy with stablecoin
6. **LoanVoting** - Deploy with all contract addresses
7. **Configure Authorizations**:
   - Authorize DAOMembership as ReputationNFT updater
   - Authorize LoanVoting as ReputationNFT updater
   - Authorize LoanVoting as GovernanceToken slasher
   - Authorize LoanVoting as InsurancePool contract

---

## Testing Checklist

### Unit Tests
- [ ] GovernanceToken staking/unstaking
- [ ] GovernanceToken slashing mechanism
- [ ] ReputationNFT reputation calculation
- [ ] ReputationNFT soul-bound enforcement
- [ ] DAOMembership voting mechanics
- [ ] DAOMembership 2/3 threshold
- [ ] LoanVoting collateral calculation
- [ ] LoanVoting default handling
- [ ] YieldingPool share accounting
- [ ] InsurancePool coverage calculation

### Integration Tests
- [ ] Member admission flow
- [ ] Loan approval flow
- [ ] Default handling flow
- [ ] Successful repayment flow
- [ ] Insurance claim flow
- [ ] Slashing trigger conditions

### Edge Cases
- [ ] Zero backers (100% collateral required)
- [ ] Maximum backers (20% collateral floor)
- [ ] Simultaneous unstaking requests
- [ ] Insurance pool empty during claim
- [ ] Reputation score edge values (0, 500, 1000)
- [ ] Voting with exact 66.67% threshold

---

## Future Enhancements

1. **Delegation** - Allow vote delegation for inactive members
2. **Quadratic Voting** - Reduce whale influence
3. **Tiered Membership** - Bronze/Silver/Gold tiers with benefits
4. **Automated Insurance** - Dynamic coverage based on pool health
5. **Cross-chain** - Multi-chain deployment for broader access
6. **Oracle Integration** - Off-chain credit score verification
7. **Flash Loan Protection** - Prevent governance attacks
8. **Batch Operations** - Gas optimization for bulk actions

---

## Gas Optimization Notes

- Use `calldata` for array parameters
- Pack structs efficiently (uint256 alignment)
- Minimize storage writes
- Use events for historical data
- Batch operations where possible

---

## Audit Recommendations

Before mainnet deployment:
1. ✅ Professional security audit (Consensys, OpenZeppelin, Trail of Bits)
2. ✅ Economic modeling review
3. ✅ Testnet deployment (Sepolia/Goerli)
4. ✅ Bug bounty program
5. ✅ Gradual rollout with caps

---

## License

MIT License - See LICENSE file for details

---

## Contact & Support

For questions or support:
- GitHub Issues: [Link to repo]
- Discord: [Community link]
- Documentation: [Full docs link]
