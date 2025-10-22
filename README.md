# Prism Finance

A decentralized lending protocol for SMEs built on Ethereum.

## Project Structure

```
sme-lending-protocol/
├── packages/
│   ├── contracts/     # Hardhat + Solidity smart contracts
│   ├── backend/       # Fastify + Prisma API
│   └── frontend/      # React + Vite + ethers.js UI
```

## Setup

1. Install dependencies:
```bash
yarn
```

2. Set up environment variables:
- Copy `.env.example` to `.env` in each package
- Fill in the required values

3. Run the project:
```bash
# Development mode (backend + frontend)
yarn dev

# Individual packages
yarn contracts:compile
yarn backend:dev
yarn frontend:dev
```

## Network Configuration

- Testnet: Sepolia
- See `packages/contracts/.env.example` for RPC configuration

## Deployed Contract Addresses

```env
MOCK_USDT_ADDRESS=0x8845237942EBdD8aEcfFb6086327DA04713DD2D3
CREDIT_SCORE_ADDRESS=0xEc552Faf0bdB4ED0FcF16f82B228dA803Ae39339
ORACLE_ADDRESS=0xdD432f6Cabe3fc3C3558DAc269FEd9c3512FB87C

LENDING_POOL_ADDRESS=0xcfdCEb69977fc08cc6E15C828942fC4c6aD3d4ee
LOAN_MANAGER_ADDRESS=0xFE075f10965d2f0eef98825EBBB4684cD9eb2A7E
GOVERNANCE_TOKEN_ADDRESS=0x1B29bDb75757faBa55AC782bf3994BE29B8eb36c
REPUTATION_NFT_ADDRESS=0x122D1c9A533C898BCFFC4E08e5A9a6caBA94EE11
DAO_MEMBERSHIP_ADDRESS=0x4De001A7c4C2E883ecd8a14Ca6229c1b3E773Af8
YIELDING_POOL_ADDRESS=0xf228fe9553537d849a9F6bAe642f6f359e2b0F65
INSURANCE_POOL_ADDRESS=0x9c2a0e5932560E08378101422AcD9678C676AC3D
LOAN_VOTING_ADDRESS=0x1928FD9e11434Dbd1e15D4348001eff2679a3C84
```
