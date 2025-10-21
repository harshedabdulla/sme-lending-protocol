import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, mainnet } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Prism Finance',
  appDescription: 'Social Collateral Protocol - Reduce loan collateral through community backing',
  appUrl: 'https://prism.finance',
  appIcon: 'https://prism.finance/icon.png',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [sepolia],
  ssr: false,
});
