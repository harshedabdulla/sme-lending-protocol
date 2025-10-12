const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with:", deployer.address);

    const usdtAddress = "<DEPLOYED_MOCKUSDT_ADDRESS>"; // Replace after MockUSDT is deployed

    const LendingPool = await ethers.getContractFactory("LendingPool");
    const pool = await LendingPool.deploy(usdtAddress);
    await pool.waitForDeployment();

    console.log("LendingPool deployed at:", await pool.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
