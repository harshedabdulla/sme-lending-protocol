const hre = require("hardhat");

/**
 * Deploy script for DAO contracts
 *
 * Deployment order:
 * 1. GovernanceToken
 * 2. ReputationNFT
 * 3. DAOMembership
 * 4. YieldingPool
 * 5. InsurancePool
 * 6. LoanVoting
 * 7. Configure authorizations
 */
async function main() {
  console.log("Starting DAO contracts deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString(), "\n");

  // Get existing contract addresses (LendingPool, LoanManager, CreditScore, MockUSDT)
  // These should be deployed first or passed as environment variables
  const STABLECOIN_ADDRESS = process.env.STABLECOIN_ADDRESS || ""; // MockUSDT
  const LOAN_MANAGER_ADDRESS = process.env.LOAN_MANAGER_ADDRESS || "";

  if (!STABLECOIN_ADDRESS || !LOAN_MANAGER_ADDRESS) {
    throw new Error("Please set STABLECOIN_ADDRESS and LOAN_MANAGER_ADDRESS environment variables");
  }

  console.log("Using existing contracts:");
  console.log("- Stablecoin (MockUSDT):", STABLECOIN_ADDRESS);
  console.log("- LoanManager:", LOAN_MANAGER_ADDRESS);
  console.log("");

  // Configuration
  const GOVERNANCE_TOKEN_NAME = "SME DAO Token";
  const GOVERNANCE_TOKEN_SYMBOL = "SMEDAO";
  const INITIAL_SUPPLY = hre.ethers.parseEther("1000000"); // 1 million tokens
  const NEW_MEMBER_TOKEN_GRANT = hre.ethers.parseEther("1000"); // 1000 tokens

  // ================================
  // 1. Deploy GovernanceToken
  // ================================
  console.log("1. Deploying GovernanceToken...");
  const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy(
    GOVERNANCE_TOKEN_NAME,
    GOVERNANCE_TOKEN_SYMBOL,
    INITIAL_SUPPLY
  );
  await governanceToken.waitForDeployment();
  const governanceTokenAddress = await governanceToken.getAddress();
  console.log("✓ GovernanceToken deployed to:", governanceTokenAddress);
  console.log("");

  // ================================
  // 2. Deploy ReputationNFT
  // ================================
  console.log("2. Deploying ReputationNFT...");
  const ReputationNFT = await hre.ethers.getContractFactory("ReputationNFT");
  const reputationNFT = await ReputationNFT.deploy();
  await reputationNFT.waitForDeployment();
  const reputationNFTAddress = await reputationNFT.getAddress();
  console.log("✓ ReputationNFT deployed to:", reputationNFTAddress);
  console.log("");

  // ================================
  // 3. Deploy DAOMembership
  // ================================
  console.log("3. Deploying DAOMembership...");
  const DAOMembership = await hre.ethers.getContractFactory("DAOMembership");
  const daoMembership = await DAOMembership.deploy(
    governanceTokenAddress,
    reputationNFTAddress
  );
  await daoMembership.waitForDeployment();
  const daoMembershipAddress = await daoMembership.getAddress();
  console.log("✓ DAOMembership deployed to:", daoMembershipAddress);
  console.log("");

  // ================================
  // 4. Deploy YieldingPool
  // ================================
  console.log("4. Deploying YieldingPool...");
  const YieldingPool = await hre.ethers.getContractFactory("YieldingPool");
  const yieldingPool = await YieldingPool.deploy(
    STABLECOIN_ADDRESS,
    daoMembershipAddress
  );
  await yieldingPool.waitForDeployment();
  const yieldingPoolAddress = await yieldingPool.getAddress();
  console.log("✓ YieldingPool deployed to:", yieldingPoolAddress);
  console.log("");

  // ================================
  // 5. Deploy InsurancePool
  // ================================
  console.log("5. Deploying InsurancePool...");
  const InsurancePool = await hre.ethers.getContractFactory("InsurancePool");
  const insurancePool = await InsurancePool.deploy(STABLECOIN_ADDRESS);
  await insurancePool.waitForDeployment();
  const insurancePoolAddress = await insurancePool.getAddress();
  console.log("✓ InsurancePool deployed to:", insurancePoolAddress);
  console.log("");

  // ================================
  // 6. Deploy LoanVoting
  // ================================
  console.log("6. Deploying LoanVoting...");
  const LoanVoting = await hre.ethers.getContractFactory("LoanVoting");
  const loanVoting = await LoanVoting.deploy(
    governanceTokenAddress,
    reputationNFTAddress,
    daoMembershipAddress,
    LOAN_MANAGER_ADDRESS
  );
  await loanVoting.waitForDeployment();
  const loanVotingAddress = await loanVoting.getAddress();
  console.log("✓ LoanVoting deployed to:", loanVotingAddress);
  console.log("");

  // ================================
  // 7. Configure Authorizations
  // ================================
  console.log("7. Configuring contract authorizations...\n");

  // Authorize DAOMembership to mint reputation NFTs
  console.log("- Authorizing DAOMembership as ReputationNFT updater...");
  let tx = await reputationNFT.authorizeUpdater(daoMembershipAddress);
  await tx.wait();
  console.log("  ✓ DAOMembership authorized\n");

  // Authorize LoanVoting to update reputation
  console.log("- Authorizing LoanVoting as ReputationNFT updater...");
  tx = await reputationNFT.authorizeUpdater(loanVotingAddress);
  await tx.wait();
  console.log("  ✓ LoanVoting authorized\n");

  // Authorize LoanVoting to slash stakes
  console.log("- Authorizing LoanVoting as GovernanceToken slasher...");
  tx = await governanceToken.authorizeSlasher(loanVotingAddress);
  await tx.wait();
  console.log("  ✓ LoanVoting authorized\n");

  // Authorize LoanVoting to collect fees and file claims with InsurancePool
  console.log("- Authorizing LoanVoting in InsurancePool...");
  tx = await insurancePool.authorizeContract(loanVotingAddress);
  await tx.wait();
  console.log("  ✓ LoanVoting authorized\n");

  // ================================
  // 8. Initial Setup
  // ================================
  console.log("8. Initial setup...\n");

  // Mint reputation NFT for deployer (first member)
  console.log("- Minting reputation NFT for deployer (first member)...");
  tx = await reputationNFT.mintReputation(deployer.address);
  await tx.wait();
  console.log("  ✓ Reputation NFT minted\n");

  // ================================
  // Deployment Summary
  // ================================
  console.log("=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nDAO Contract Addresses:");
  console.log("-".repeat(60));
  console.log("GovernanceToken:", governanceTokenAddress);
  console.log("ReputationNFT:  ", reputationNFTAddress);
  console.log("DAOMembership:  ", daoMembershipAddress);
  console.log("YieldingPool:   ", yieldingPoolAddress);
  console.log("InsurancePool:  ", insurancePoolAddress);
  console.log("LoanVoting:     ", loanVotingAddress);
  console.log("-".repeat(60));

  console.log("\nExisting Contract Addresses (linked):");
  console.log("-".repeat(60));
  console.log("Stablecoin:     ", STABLECOIN_ADDRESS);
  console.log("LoanManager:    ", LOAN_MANAGER_ADDRESS);
  console.log("-".repeat(60));

  console.log("\nConfiguration:");
  console.log("-".repeat(60));
  console.log("Token Name:              ", GOVERNANCE_TOKEN_NAME);
  console.log("Token Symbol:            ", GOVERNANCE_TOKEN_SYMBOL);
  console.log("Initial Supply:          ", hre.ethers.formatEther(INITIAL_SUPPLY), "tokens");
  console.log("Min Stake to Vote:       ", "100 tokens");
  console.log("Min Stake to Back:       ", "500 tokens");
  console.log("Unstake Cooldown:        ", "7 days");
  console.log("Membership Vote Period:  ", "7 days");
  console.log("Loan Vote Period:        ", "3 days");
  console.log("Protocol Fee:            ", "1%");
  console.log("Insurance Coverage:      ", "30% max");
  console.log("-".repeat(60));

  console.log("\nAuthorizations Configured:");
  console.log("-".repeat(60));
  console.log("✓ DAOMembership can mint reputation NFTs");
  console.log("✓ LoanVoting can update reputations");
  console.log("✓ LoanVoting can slash governance stakes");
  console.log("✓ LoanVoting can collect fees and file insurance claims");
  console.log("-".repeat(60));

  console.log("\nNext Steps:");
  console.log("-".repeat(60));
  console.log("1. Verify contracts on block explorer");
  console.log("2. Test member admission flow");
  console.log("3. Test loan request and backing flow");
  console.log("4. Set up yield strategy for YieldingPool");
  console.log("5. Fund InsurancePool with initial capital");
  console.log("6. Configure LoanManager to work with LoanVoting");
  console.log("-".repeat(60));

  // Save deployment addresses to file
  const fs = require('fs');
  const deploymentData = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      governanceToken: governanceTokenAddress,
      reputationNFT: reputationNFTAddress,
      daoMembership: daoMembershipAddress,
      yieldingPool: yieldingPoolAddress,
      insurancePool: insurancePoolAddress,
      loanVoting: loanVotingAddress,
      stablecoin: STABLECOIN_ADDRESS,
      loanManager: LOAN_MANAGER_ADDRESS
    }
  };

  const outputPath = `./deployments/dao_${hre.network.name}_${Date.now()}.json`;
  fs.mkdirSync('./deployments', { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log(`\n✓ Deployment data saved to: ${outputPath}`);

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
