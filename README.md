# SME Lending Protocol

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