const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts to network:", hre.network.name);

  // Add your deployment logic here
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
