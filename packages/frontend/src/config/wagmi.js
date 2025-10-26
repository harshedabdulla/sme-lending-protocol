import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, mainnet, polygon, arbitrum } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Prism Finance',
  appDescription: 'Social Collateral Protocol - Reduce loan collateral through community backing',
  appUrl: 'https://prism.finance',
  appIcon: 'https://prism.finance/icon.png',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'your_project_id_here',
  chains: [sepolia, mainnet, polygon, arbitrum],
  ssr: false,
});
