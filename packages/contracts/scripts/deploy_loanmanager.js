const { ethers } = require("hardhat");

/**
 * Deployment script for LoanManager contract
 */

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying LoanManager with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    const LENDING_POOL_ADDRESS = "<DEPLOYED_LENDINGPOOL_ADDRESS>";  // Replace with deployed LendingPool address
    const CREDIT_SCORE_ADDRESS = "<DEPLOYED_CREDITSCORE_ADDRESS>";  // Replace with deployed CreditScore address

    // Loan Manager Parameters
    const MIN_CREDIT_SCORE = 600;                                    // Minimum score required (0-1000 scale)
    const MAX_LOAN_AMOUNT = ethers.parseUnits("10000", 6);          // 10,000 USDT (6 decimals)
    const DEFAULT_LOAN_DURATION = 30 * 24 * 60 * 60;                // 30 days in seconds
    const BASE_INTEREST_RATE = 500;                                  // 5% in basis points (500 = 5%)

    console.log("\nDeploying LoanManager with parameters:");
    console.log("  LendingPool:", LENDING_POOL_ADDRESS);
    console.log("  CreditScore:", CREDIT_SCORE_ADDRESS);
    console.log("  Min Credit Score:", MIN_CREDIT_SCORE);
    console.log("  Max Loan Amount:", ethers.formatUnits(MAX_LOAN_AMOUNT, 6), "USDT");
    console.log("  Loan Duration:", DEFAULT_LOAN_DURATION / (24 * 60 * 60), "days");
    console.log("  Base Interest Rate:", BASE_INTEREST_RATE / 100, "%");

    const LoanManager = await ethers.getContractFactory("LoanManager");
    const loanManager = await LoanManager.deploy(
        LENDING_POOL_ADDRESS,
        CREDIT_SCORE_ADDRESS,
        MIN_CREDIT_SCORE,
        MAX_LOAN_AMOUNT,
        DEFAULT_LOAN_DURATION,
        BASE_INTEREST_RATE
    );

    await loanManager.waitForDeployment();
    const loanManagerAddress = await loanManager.getAddress();

    console.log("\n LoanManager deployed to:", loanManagerAddress);

    console.log("\n Post-deployment steps:");
    console.log("1. Set LoanManager as loan manager in LendingPool:");
    console.log(`   await lendingPool.setLoanManager("${loanManagerAddress}")`);
    console.log("\n2. Verify contract on block explorer (if on testnet/mainnet)");
    console.log("\n3. Update frontend/backend with new LoanManager address");

    // ============================================
    // VERIFICATION INFO
    // ============================================

    console.log("\n Contract verification command:");
    console.log(`npx hardhat verify --network <network-name> ${loanManagerAddress} \\`);
    console.log(`  "${LENDING_POOL_ADDRESS}" \\`);
    console.log(`  "${CREDIT_SCORE_ADDRESS}" \\`);
    console.log(`  ${MIN_CREDIT_SCORE} \\`);
    console.log(`  ${MAX_LOAN_AMOUNT} \\`);
    console.log(`  ${DEFAULT_LOAN_DURATION} \\`);
    console.log(`  ${BASE_INTEREST_RATE}`);

    // ============================================
    // DEPLOYMENT SUMMARY
    // ============================================

    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("LoanManager Address:", loanManagerAddress);
    console.log("Deployer:", deployer.address);
    console.log("Network:", (await ethers.provider.getNetwork()).name);
    console.log("=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n Deployment failed:");
        console.error(error);
        process.exitCode = 1;
    });
