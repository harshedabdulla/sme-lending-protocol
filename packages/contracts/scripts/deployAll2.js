const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Complete Deployment Script v2 - Prism Finance (SME Lending Protocol)
 *
 * Features:
 * - Deploys all 10 contracts in correct order
 * - Configures all authorizations automatically
 * - Updates .env files automatically for frontend and contracts
 * - Saves deployment data to JSON
 * - Provides verification commands
 *
 * Deployment order:
 * 1. MockUSDT (Stablecoin)
 * 2. CreditScore
 * 3. LendingPool
 * 4. LoanManager
 * 5. GovernanceToken (Prism Token)
 * 6. ReputationNFT (PrismRep)
 * 7. DAOMembership
 * 8. YieldingPool
 * 9. InsurancePool
 * 10. LoanVoting
 */

/**
 * Update .env file with new contract addresses
 */
function updateEnvFile(envPath, updates) {
  console.log(`\n  Updating ${envPath}...`);

  let envContent = '';

  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add each key-value pair
  Object.entries(updates).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      // Update existing key
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add new key
      envContent += `\n${key}=${value}`;
    }
  });

  // Write updated content back to file
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(`  ✓ ${envPath} updated`);
}

async function main() {
  console.log("=".repeat(80));
  console.log("PRISM FINANCE - COMPLETE DEPLOYMENT v2");
  console.log("=".repeat(80));
  console.log("\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", hre.network.name);

  // Get chain ID
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId.toString();
  console.log("Chain ID:", chainId);
  console.log("\n");

  // Store all deployed addresses
  const deployedContracts = {
    network: hre.network.name,
    chainId: chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  // ============================================
  // PHASE 1: BASE PROTOCOL CONTRACTS
  // ============================================
  console.log("=".repeat(80));
  console.log("PHASE 1: DEPLOYING BASE PROTOCOL CONTRACTS");
  console.log("=".repeat(80));
  console.log("\n");

  // ============================================
  // 1. Deploy MockUSDT
  // ============================================
  console.log("1/10 Deploying MockUSDT (Stablecoin)...");
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  const mockUSDTAddress = await mockUSDT.getAddress();
  deployedContracts.contracts.mockUSDT = mockUSDTAddress;
  console.log("✓ MockUSDT deployed to:", mockUSDTAddress);
  console.log("  Initial supply: 1,000,000 MUSDT (6 decimals)");
  console.log("\n");

  // ============================================
  // 2. Deploy CreditScore
  // ============================================
  console.log("2/10 Deploying CreditScore...");
  const CreditScore = await hre.ethers.getContractFactory("CreditScore");
  const creditScore = await CreditScore.deploy(deployer.address); // Deployer is initial oracle
  await creditScore.waitForDeployment();
  const creditScoreAddress = await creditScore.getAddress();
  deployedContracts.contracts.creditScore = creditScoreAddress;
  console.log("✓ CreditScore deployed to:", creditScoreAddress);
  console.log("  Initial oracle:", deployer.address);
  console.log("\n");

  // ============================================
  // 3. Deploy LendingPool
  // ============================================
  console.log("3/10 Deploying LendingPool...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(mockUSDTAddress);
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  deployedContracts.contracts.lendingPool = lendingPoolAddress;
  console.log("✓ LendingPool deployed to:", lendingPoolAddress);
  console.log("  Stablecoin:", mockUSDTAddress);
  console.log("\n");

  // ============================================
  // 4. Deploy LoanManager
  // ============================================
  console.log("4/10 Deploying LoanManager...");

  const MIN_CREDIT_SCORE = 600;
  const MAX_LOAN_AMOUNT = hre.ethers.parseUnits("10000", 6); // 10,000 USDT
  const DEFAULT_LOAN_DURATION = 5 * 60; // 5 minutes in seconds
  const BASE_INTEREST_RATE = 500; // 5% in basis points

  const LoanManager = await hre.ethers.getContractFactory("LoanManager");
  const loanManager = await LoanManager.deploy(
    lendingPoolAddress,
    creditScoreAddress,
    MIN_CREDIT_SCORE,
    MAX_LOAN_AMOUNT,
    DEFAULT_LOAN_DURATION,
    BASE_INTEREST_RATE
  );
  await loanManager.waitForDeployment();
  const loanManagerAddress = await loanManager.getAddress();
  deployedContracts.contracts.loanManager = loanManagerAddress;
  console.log("✓ LoanManager deployed to:", loanManagerAddress);
  console.log("  Min Credit Score:", MIN_CREDIT_SCORE);
  console.log("  Max Loan Amount:", hre.ethers.formatUnits(MAX_LOAN_AMOUNT, 6), "USDT");
  console.log("  Loan Duration:", DEFAULT_LOAN_DURATION / 60, "minutes");
  console.log("  Base Interest Rate:", BASE_INTEREST_RATE / 100, "%");
  console.log("\n");

  // ============================================
  // Configure Base Contracts
  // ============================================
  console.log("Configuring base contracts...");

  // Set LoanManager in LendingPool
  console.log("  - Setting LoanManager in LendingPool...");
  let tx = await lendingPool.setLoanManager(loanManagerAddress);
  await tx.wait();
  console.log("  ✓ LoanManager set in LendingPool");

  console.log("\n");

  // ============================================
  // PHASE 2: DAO GOVERNANCE CONTRACTS
  // ============================================
  console.log("=".repeat(80));
  console.log("PHASE 2: DEPLOYING DAO GOVERNANCE CONTRACTS");
  console.log("=".repeat(80));
  console.log("\n");

  // DAO Configuration
  const GOVERNANCE_TOKEN_NAME = "Prism Token";
  const GOVERNANCE_TOKEN_SYMBOL = "PRISM";
  const INITIAL_SUPPLY = hre.ethers.parseEther("1000000"); // 1 million tokens

  // ============================================
  // 5. Deploy GovernanceToken
  // ============================================
  console.log("5/10 Deploying GovernanceToken...");
  const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy(
    GOVERNANCE_TOKEN_NAME,
    GOVERNANCE_TOKEN_SYMBOL,
    INITIAL_SUPPLY
  );
  await governanceToken.waitForDeployment();
  const governanceTokenAddress = await governanceToken.getAddress();
  deployedContracts.contracts.governanceToken = governanceTokenAddress;
  console.log("✓ GovernanceToken deployed to:", governanceTokenAddress);
  console.log("  Name:", GOVERNANCE_TOKEN_NAME);
  console.log("  Symbol:", GOVERNANCE_TOKEN_SYMBOL);
  console.log("  Initial Supply:", hre.ethers.formatEther(INITIAL_SUPPLY), "tokens");
  console.log("\n");

  // ============================================
  // 6. Deploy ReputationNFT
  // ============================================
  console.log("6/10 Deploying ReputationNFT...");
  const ReputationNFT = await hre.ethers.getContractFactory("ReputationNFT");
  const reputationNFT = await ReputationNFT.deploy();
  await reputationNFT.waitForDeployment();
  const reputationNFTAddress = await reputationNFT.getAddress();
  deployedContracts.contracts.reputationNFT = reputationNFTAddress;
  console.log("✓ ReputationNFT deployed to:", reputationNFTAddress);
  console.log("  Name: Prism Reputation");
  console.log("  Symbol: PRISMREP");
  console.log("  Type: Soul-bound (non-transferable)");
  console.log("\n");

  // ============================================
  // 7. Deploy DAOMembership
  // ============================================
  console.log("7/10 Deploying DAOMembership...");
  const DAOMembership = await hre.ethers.getContractFactory("DAOMembership");
  const daoMembership = await DAOMembership.deploy(
    governanceTokenAddress,
    reputationNFTAddress
  );
  await daoMembership.waitForDeployment();
  const daoMembershipAddress = await daoMembership.getAddress();
  deployedContracts.contracts.daoMembership = daoMembershipAddress;
  console.log("✓ DAOMembership deployed to:", daoMembershipAddress);
  console.log("  Voting Period: 5 minutes");
  console.log("  Approval Threshold: 66.67% (2/3 majority)");
  console.log("\n");

  // ============================================
  // 8. Deploy YieldingPool
  // ============================================
  console.log("8/10 Deploying YieldingPool...");
  const YieldingPool = await hre.ethers.getContractFactory("YieldingPool");
  const yieldingPool = await YieldingPool.deploy(
    mockUSDTAddress,
    daoMembershipAddress
  );
  await yieldingPool.waitForDeployment();
  const yieldingPoolAddress = await yieldingPool.getAddress();
  deployedContracts.contracts.yieldingPool = yieldingPoolAddress;
  console.log("✓ YieldingPool deployed to:", yieldingPoolAddress);
  console.log("  Withdrawal Fee: 0.5%");
  console.log("  Performance Fee: 10%");
  console.log("  Withdrawal Delay: 5 minutes");
  console.log("\n");

  // ============================================
  // 9. Deploy InsurancePool
  // ============================================
  console.log("9/10 Deploying InsurancePool...");
  const InsurancePool = await hre.ethers.getContractFactory("InsurancePool");
  const insurancePool = await InsurancePool.deploy(mockUSDTAddress);
  await insurancePool.waitForDeployment();
  const insurancePoolAddress = await insurancePool.getAddress();
  deployedContracts.contracts.insurancePool = insurancePoolAddress;
  console.log("✓ InsurancePool deployed to:", insurancePoolAddress);
  console.log("  Protocol Fee: 1%");
  console.log("  Coverage: 30% of defaults");
  console.log("\n");

  // ============================================
  // 10. Deploy LoanVoting
  // ============================================
  console.log("10/10 Deploying LoanVoting...");
  const LoanVoting = await hre.ethers.getContractFactory("LoanVoting");
  const loanVoting = await LoanVoting.deploy(
    governanceTokenAddress,
    reputationNFTAddress,
    daoMembershipAddress,
    loanManagerAddress
  );
  await loanVoting.waitForDeployment();
  const loanVotingAddress = await loanVoting.getAddress();
  deployedContracts.contracts.loanVoting = loanVotingAddress;
  console.log("✓ LoanVoting deployed to:", loanVotingAddress);
  console.log("  Min Backers: 3");
  console.log("  Voting Period: 5 minutes");
  console.log("  Collateral Formula: 100% - (8% × backers), min 20%");
  console.log("\n");

  // ============================================
  // PHASE 3: CONFIGURE AUTHORIZATIONS
  // ============================================
  console.log("=".repeat(80));
  console.log("PHASE 3: CONFIGURING CONTRACT AUTHORIZATIONS");
  console.log("=".repeat(80));
  console.log("\n");

  // Authorize DAOMembership to mint reputation NFTs
  console.log("1/4 Authorizing DAOMembership as ReputationNFT updater...");
  tx = await reputationNFT.authorizeUpdater(daoMembershipAddress);
  await tx.wait();
  console.log("  ✓ DAOMembership authorized to mint reputation NFTs");
  console.log("\n");

  // Authorize LoanVoting to update reputation
  console.log("2/4 Authorizing LoanVoting as ReputationNFT updater...");
  tx = await reputationNFT.authorizeUpdater(loanVotingAddress);
  await tx.wait();
  console.log("  ✓ LoanVoting authorized to update reputations");
  console.log("\n");

  // Authorize LoanVoting to slash stakes
  console.log("3/4 Authorizing LoanVoting as GovernanceToken slasher...");
  tx = await governanceToken.authorizeSlasher(loanVotingAddress);
  await tx.wait();
  console.log("  ✓ LoanVoting authorized to slash stakes");
  console.log("\n");

  // Authorize LoanVoting in InsurancePool
  console.log("4/5 Authorizing LoanVoting in InsurancePool...");
  tx = await insurancePool.authorizeContract(loanVotingAddress);
  await tx.wait();
  console.log("  ✓ LoanVoting authorized to collect fees and file claims");
  console.log("\n");

  // Set LoanVoting address in LoanManager (CRITICAL!)
  console.log("5/5 Setting LoanVoting address in LoanManager...");
  tx = await loanManager.setLoanVoting(loanVotingAddress);
  await tx.wait();
  console.log("  ✓ LoanVoting authorized to approve loans in LoanManager");
  console.log("\n");

  // ============================================
  // PHASE 4: INITIAL SETUP - FIRST MEMBER
  // ============================================
  console.log("=".repeat(80));
  console.log("PHASE 4: INITIAL SETUP - FIRST MEMBER");
  console.log("=".repeat(80));
  console.log("\n");

  // Mint reputation NFT for deployer (first member)
  console.log("Minting reputation NFT for deployer (first member)...");
  console.log("  Deployer address:", deployer.address);
  console.log("  Note: Deployer is automatically set as first active member in DAOMembership");

  // Temporarily authorize deployer to mint their own NFT
  console.log("  Authorizing deployer to mint NFT...");
  tx = await reputationNFT.authorizeUpdater(deployer.address);
  await tx.wait();

  // Mint NFT
  tx = await reputationNFT.mintReputation(deployer.address);
  await tx.wait();
  console.log("  ✓ Reputation NFT minted for deployer");

  // Revoke deployer authorization (security best practice)
  console.log("  Revoking deployer authorization...");
  tx = await reputationNFT.revokeUpdater(deployer.address);
  await tx.wait();
  console.log("  ✓ Deployer authorization revoked");

  console.log("  ✓ Deployer is now a full DAO member and can propose new members");
  console.log("\n");

  // Set credit score for deployer
  console.log("Setting credit score for deployer...");
  tx = await creditScore.updateScore(deployer.address, 800);
  await tx.wait();
  console.log("  ✓ Credit score set to 800 (eligible for loans)");
  console.log("\n");

  // Transfer GovernanceToken ownership to DAOMembership
  console.log("Transferring GovernanceToken ownership to DAOMembership...");
  tx = await governanceToken.transferOwnership(daoMembershipAddress);
  await tx.wait();
  console.log("  ✓ GovernanceToken ownership transferred to DAOMembership");
  console.log("  ✓ DAOMembership can now mint tokens for new members");
  console.log("\n");

  // ============================================
  // PHASE 5: UPDATE ENVIRONMENT VARIABLES
  // ============================================
  console.log("=".repeat(80));
  console.log("PHASE 5: UPDATING ENVIRONMENT VARIABLES");
  console.log("=".repeat(80));
  console.log("\n");

  // Paths to .env files
  const contractsEnvPath = path.join(__dirname, '..', '.env');
  const frontendEnvPath = path.join(__dirname, '..', '..', 'frontend', '.env');

  // Update contracts/.env
  const contractsEnvUpdates = {
    'MOCK_USDT_ADDRESS': mockUSDTAddress,
    'CREDIT_SCORE_ADDRESS': creditScoreAddress,
    'LENDING_POOL_ADDRESS': lendingPoolAddress,
    'LOAN_MANAGER_ADDRESS': loanManagerAddress,
    'GOVERNANCE_TOKEN_ADDRESS': governanceTokenAddress,
    'REPUTATION_NFT_ADDRESS': reputationNFTAddress,
    'DAO_MEMBERSHIP_ADDRESS': daoMembershipAddress,
    'YIELDING_POOL_ADDRESS': yieldingPoolAddress,
    'INSURANCE_POOL_ADDRESS': insurancePoolAddress,
    'LOAN_VOTING_ADDRESS': loanVotingAddress
  };

  updateEnvFile(contractsEnvPath, contractsEnvUpdates);

  // Update frontend/.env
  const frontendEnvUpdates = {
    'VITE_CHAIN_ID': chainId,
    'VITE_MOCK_USDT_ADDRESS': mockUSDTAddress,
    'VITE_CREDIT_SCORE_ADDRESS': creditScoreAddress,
    'VITE_LENDING_POOL_ADDRESS': lendingPoolAddress,
    'VITE_LOAN_MANAGER_ADDRESS': loanManagerAddress,
    'VITE_GOVERNANCE_TOKEN_ADDRESS': governanceTokenAddress,
    'VITE_REPUTATION_NFT_ADDRESS': reputationNFTAddress,
    'VITE_DAO_MEMBERSHIP_ADDRESS': daoMembershipAddress,
    'VITE_YIELDING_POOL_ADDRESS': yieldingPoolAddress,
    'VITE_INSURANCE_POOL_ADDRESS': insurancePoolAddress,
    'VITE_LOAN_VOTING_ADDRESS': loanVotingAddress
  };

  updateEnvFile(frontendEnvPath, frontendEnvUpdates);

  console.log("\n✓ All environment variables updated successfully!\n");

  // ============================================
  // PHASE 6: SAVE DEPLOYMENT DATA
  // ============================================
  console.log("=".repeat(80));
  console.log("PHASE 6: SAVING DEPLOYMENT DATA");
  console.log("=".repeat(80));
  console.log("\n");

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save to JSON file
  const filename = `deployment_${hre.network.name}_${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deployedContracts, null, 2));
  console.log("✓ Deployment data saved to:", filepath);
  console.log("\n");

  // ============================================
  // DEPLOYMENT SUMMARY
  // ============================================
  console.log("=".repeat(80));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(80));
  console.log("\n");

  console.log("BASE PROTOCOL CONTRACTS:");
  console.log("-".repeat(80));
  console.log("MockUSDT (Stablecoin):", deployedContracts.contracts.mockUSDT);
  console.log("CreditScore:          ", deployedContracts.contracts.creditScore);
  console.log("LendingPool:          ", deployedContracts.contracts.lendingPool);
  console.log("LoanManager:          ", deployedContracts.contracts.loanManager);
  console.log("\n");

  console.log("DAO GOVERNANCE CONTRACTS:");
  console.log("-".repeat(80));
  console.log("GovernanceToken:      ", deployedContracts.contracts.governanceToken);
  console.log("ReputationNFT:        ", deployedContracts.contracts.reputationNFT);
  console.log("DAOMembership:        ", deployedContracts.contracts.daoMembership);
  console.log("YieldingPool:         ", deployedContracts.contracts.yieldingPool);
  console.log("InsurancePool:        ", deployedContracts.contracts.insurancePool);
  console.log("LoanVoting:           ", deployedContracts.contracts.loanVoting);
  console.log("\n");

  console.log("DEPLOYMENT INFO:");
  console.log("-".repeat(80));
  console.log("Network:              ", deployedContracts.network);
  console.log("Chain ID:             ", deployedContracts.chainId);
  console.log("Deployer:             ", deployedContracts.deployer);
  console.log("Timestamp:            ", deployedContracts.timestamp);
  console.log("\n");

  console.log("CONFIGURATION:");
  console.log("-".repeat(80));
  console.log("✓ LoanManager set in LendingPool");
  console.log("✓ LoanVoting set in LoanManager (can approve loans)");
  console.log("✓ DAOMembership authorized in ReputationNFT");
  console.log("✓ LoanVoting authorized in ReputationNFT");
  console.log("✓ LoanVoting authorized in GovernanceToken");
  console.log("✓ LoanVoting authorized in InsurancePool");
  console.log("✓ Deployer set as first active member");
  console.log("\n");

  console.log("ENVIRONMENT UPDATES:");
  console.log("-".repeat(80));
  console.log("✓ packages/contracts/.env updated");
  console.log("✓ packages/frontend/.env updated");
  console.log("\n");

  // ============================================
  // NEXT STEPS
  // ============================================
  console.log("=".repeat(80));
  console.log("NEXT STEPS");
  console.log("=".repeat(80));
  console.log("\n");

  console.log("1. VERIFY CONTRACTS ON BLOCK EXPLORER");
  console.log("   Run verification commands (see below)");
  console.log("\n");

  console.log("2. RESTART FRONTEND");
  console.log("   The .env file has been updated with new addresses");
  console.log("   cd packages/frontend && yarn dev");
  console.log("\n");

  console.log("3. FUND INSURANCE POOL");
  console.log("   Transfer initial capital to InsurancePool");
  console.log("   Recommended: 10,000-50,000 USDT");
  console.log("\n");

  console.log("4. DISTRIBUTE GOVERNANCE TOKENS");
  console.log("   Send Prism tokens to initial community members");
  console.log("\n");

  console.log("5. TEST ALL FLOWS");
  console.log("   - Member admission (5 min voting)");
  console.log("   - Loan request and backing (5 min voting)");
  console.log("   - Repayment (5 min duration)");
  console.log("   - Unstaking (5 min cooldown)");
  console.log("\n");

  // ============================================
  // VERIFICATION COMMANDS
  // ============================================
  console.log("=".repeat(80));
  console.log("CONTRACT VERIFICATION COMMANDS");
  console.log("=".repeat(80));
  console.log("\n");

  console.log("# MockUSDT");
  console.log(`npx hardhat verify --network ${hre.network.name} ${deployedContracts.contracts.mockUSDT}`);
  console.log("\n");

  console.log("# CreditScore");
  console.log(`npx hardhat verify --network ${hre.network.name} ${deployedContracts.contracts.creditScore} "${deployer.address}"`);
  console.log("\n");

  console.log("# LendingPool");
  console.log(`npx hardhat verify --network ${hre.network.name} ${deployedContracts.contracts.lendingPool} "${deployedContracts.contracts.mockUSDT}"`);
  console.log("\n");

  console.log("# LoanManager");
  console.log(`npx hardhat verify --network ${hre.network.name} ${deployedContracts.contracts.loanManager} \\`);
  console.log(`  "${deployedContracts.contracts.lendingPool}" \\`);
  console.log(`  "${deployedContracts.contracts.creditScore}" \\`);
  console.log(`  ${MIN_CREDIT_SCORE} \\`);
  console.log(`  "${MAX_LOAN_AMOUNT}" \\`);
  console.log(`  ${DEFAULT_LOAN_DURATION} \\`);
  console.log(`  ${BASE_INTEREST_RATE}`);
  console.log("\n");

  console.log("# GovernanceToken");
  console.log(`npx hardhat verify --network ${hre.network.name} ${deployedContracts.contracts.governanceToken} \\`);
  console.log(`  "${GOVERNANCE_TOKEN_NAME}" \\`);
  console.log(`  "${GOVERNANCE_TOKEN_SYMBOL}" \\`);
  console.log(`  "${INITIAL_SUPPLY}"`);
  console.log("\n");

  console.log("# ReputationNFT");
  console.log(`npx hardhat verify --network ${hre.network.name} ${deployedContracts.contracts.reputationNFT}`);
  console.log("\n");

  console.log("# DAOMembership");
  console.log(`npx hardhat verify --network ${hre.network.name} ${deployedContracts.contracts.daoMembership} \\`);
  console.log(`  "${deployedContracts.contracts.governanceToken}" \\`);
  console.log(`  "${deployedContracts.contracts.reputationNFT}"`);
  console.log("\n");

  console.log("# YieldingPool");
  console.log(`npx hardhat verify --network ${hre.network.name} ${deployedContracts.contracts.yieldingPool} \\`);
  console.log(`  "${deployedContracts.contracts.mockUSDT}" \\`);
  console.log(`  "${deployedContracts.contracts.daoMembership}"`);
  console.log("\n");

  console.log("# InsurancePool");
  console.log(`npx hardhat verify --network ${hre.network.name} ${deployedContracts.contracts.insurancePool} \\`);
  console.log(`  "${deployedContracts.contracts.mockUSDT}"`);
  console.log("\n");

  console.log("# LoanVoting");
  console.log(`npx hardhat verify --network ${hre.network.name} ${deployedContracts.contracts.loanVoting} \\`);
  console.log(`  "${deployedContracts.contracts.governanceToken}" \\`);
  console.log(`  "${deployedContracts.contracts.reputationNFT}" \\`);
  console.log(`  "${deployedContracts.contracts.daoMembership}" \\`);
  console.log(`  "${deployedContracts.contracts.loanManager}"`);
  console.log("\n");

  console.log("=".repeat(80));
  console.log("DEPLOYMENT COMPLETE! 🎉");
  console.log("=".repeat(80));
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n");
    console.error("=".repeat(80));
    console.error("DEPLOYMENT FAILED");
    console.error("=".repeat(80));
    console.error("\n");
    console.error(error);
    process.exit(1);
  });
