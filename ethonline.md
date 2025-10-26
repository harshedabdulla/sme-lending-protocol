# ETHOnline 2025 - Sponsor Integrations

How we integrated sponsor technologies into Prism Finance - a decentralized SME lending protocol powered by PayPal USD.

---

## PayPal USD (PYUSD)

We integrated PayPal USD as the core stablecoin for our entire lending protocol, enabling real-world SME financing with a regulated, trusted stablecoin.

**What we built:**
- Undercollateralized lending powered by PYUSD
- Social collateral system for borrowers to reduce collateral requirements
- Lenders earn interest on PYUSD deposits
- DAO-governed risk management using PYUSD pools

**Why PYUSD?**

SME lending requires trust and regulatory compliance. PYUSD provides both:
1. **Regulatory Compliance:** PayPal-backed, regulated stablecoin builds trust with SME borrowers
2. **Real-World Utility:** PYUSD can be easily converted to fiat for business operations
3. **Global Reach:** SMEs worldwide can access capital in a universally recognized stablecoin
4. **Payment Integration:** Seamless integration with PayPal's payment infrastructure

**Technical Implementation:**
- Used in 3 core contracts: LendingPool, YieldingPool, InsurancePool
- Standard ERC20 integration with 6 decimals


**Impact:**
Prism Finance demonstrates how PYUSD can power real DeFi use cases beyond simple transfers - enabling undercollateralized lending, yield generation, and insurance pools for underbanked SMEs globally.

---

## Hardhat

We built the entire smart contract infrastructure using Hardhat 3.0.9. This includes compiling, testing, and deploying all 10 contracts in our DAO lending protocol.

**What we used:**
- Hardhat 3.0.9 for development and testing
- Hardhat Ignition 3.0.3 for deployments
- ESM modules (modern JavaScript)

**Why Hardhat Ignition?**

Instead of writing manual deployment scripts with lots of boilerplate, we created a single declarative module that deploys our entire protocol. Ignition handles dependencies, executes transactions in parallel where possible, and can resume if something fails.

Our Ignition module (`ignition/modules/PrismProtocol.js`) deploys:
- Base contracts (MockUSDT, CreditScore, LendingPool, LoanManager)
- DAO contracts (GovernanceToken, ReputationNFT, DAOMembership)
- Risk management (YieldingPool, InsurancePool, LoanVoting)
- Plus all the authorization and configuration between them

**Commands:**
```bash
yarn compile    # Compile all contracts
yarn test       # Run tests
npx hardhat ignition deploy ignition/modules/PrismProtocol.js --network sepolia
```

The result is a clean, maintainable deployment system that we can run on any network without changing code.

---

**Built for ETHOnline 2025**
