import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Prism Protocol Deployment with PayPal USD (PYUSD)
 *
 * PYUSD Contract Addresses:
 * - Sepolia Testnet: 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9
 * - Ethereum Mainnet: 0x6c3ea9036406852006290770bedfcaba0e23a0e8
 *
 */
export default buildModule("PrismProtocolPYUSD", (m) => {
  // Configuration parameters
  const governanceTokenName = m.getParameter("governanceTokenName", "SME DAO Token");
  const governanceTokenSymbol = m.getParameter("governanceTokenSymbol", "SMEDAO");
  const initialSupply = m.getParameter("initialSupply", 1000000n * 10n ** 18n);
  const newMemberTokenGrant = m.getParameter("newMemberTokenGrant", 1000n * 10n ** 18n);

  // PYUSD Configuration
  // Default to Sepolia testnet, can be overridden for mainnet deployment
  const pyusdAddress = m.getParameter(
    "pyusdAddress",
    "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" // Sepolia testnet
  );

  // Loan Manager Configuration
  const minCreditScore = m.getParameter("minCreditScore", 600n);
  const maxLoanAmount = m.getParameter("maxLoanAmount", 10000n * 10n ** 6n); // 10k PYUSD (6 decimals)
  const defaultLoanDuration = m.getParameter("defaultLoanDuration", 864000n); // 10 days in seconds
  const baseInterestRate = m.getParameter("baseInterestRate", 500n); // 5% in basis points

  // Base Protocol Contracts

  // Reference existing PYUSD contract (not deployed by us)
  const pyusd = m.contractAt("IERC20", pyusdAddress);

  // Deploy CreditScore with initial oracle (deployer)
  const deployer = m.getAccount(0);
  const creditScore = m.contract("CreditScore", [deployer]);

  // Deploy LendingPool
  const lendingPool = m.contract("LendingPool", [pyusd]);

  // Deploy LoanManager
  const loanManager = m.contract("LoanManager", [
    lendingPool,
    creditScore,
    minCreditScore,
    maxLoanAmount,
    defaultLoanDuration,
    baseInterestRate
  ]);

  // DAO Governance Contracts

  // Deploy GovernanceToken
  const governanceToken = m.contract("GovernanceToken", [
    governanceTokenName,
    governanceTokenSymbol,
    initialSupply
  ]);

  // Deploy ReputationNFT
  const reputationNFT = m.contract("ReputationNFT");

  // Deploy DAOMembership
  const daoMembership = m.contract("DAOMembership", [
    governanceToken,
    reputationNFT
  ]);

  // Deploy YieldingPool
  const yieldingPool = m.contract("YieldingPool", [
    pyusd,
    daoMembership
  ]);

  // Deploy InsurancePool
  const insurancePool = m.contract("InsurancePool", [pyusd]);

  // Deploy LoanVoting (depends on all above contracts)
  const loanVoting = m.contract("LoanVoting", [
    governanceToken,
    reputationNFT,
    daoMembership,
    loanManager
  ]);

  // Configuration Calls

  // Set LoanManager in LendingPool
  m.call(lendingPool, "setLoanManager", [loanManager]);

  // Set LoanVoting in LoanManager
  m.call(loanManager, "setLoanVoting", [loanVoting]);

  // Authorize DAOMembership to update ReputationNFT
  m.call(reputationNFT, "authorizeUpdater", [daoMembership]);

  // Authorize LoanVoting to update ReputationNFT
  m.call(reputationNFT, "authorizeUpdater", [loanVoting]);

  // Authorize LoanVoting to slash in GovernanceToken
  m.call(governanceToken, "authorizeSlasher", [loanVoting]);

  // Set LoanVoting as authorized contract in InsurancePool
  m.call(insurancePool, "setAuthorizedContract", [loanVoting]);

  // Set token grant amount in DAOMembership
  m.call(daoMembership, "setTokenGrantAmount", [newMemberTokenGrant]);

  // Transfer governance tokens to DAOMembership for grants
  const grantPoolAmount = newMemberTokenGrant * 100n; // 100 new members worth
  m.call(governanceToken, "transfer", [daoMembership, grantPoolAmount]);

  // Return all deployed contracts
  return {
    pyusd, // Reference to PYUSD contract
    creditScore,
    lendingPool,
    loanManager,
    governanceToken,
    reputationNFT,
    daoMembership,
    yieldingPool,
    insurancePool,
    loanVoting
  };
});
