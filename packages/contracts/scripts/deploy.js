const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts to network:", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy CreditScore
  console.log("\nDeploying CreditScore...");
  const CreditScore = await hre.ethers.getContractFactory("CreditScore");
  const creditScore = await CreditScore.deploy(deployer.address); // deployer is initial oracle
  await creditScore.waitForDeployment();
  const creditScoreAddress = await creditScore.getAddress();
  console.log("CreditScore deployed to:", creditScoreAddress);

  console.log("CreditScore:", creditScoreAddress);
  console.log("Oracle:", deployer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
