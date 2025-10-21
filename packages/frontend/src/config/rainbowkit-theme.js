import { darkTheme } from '@rainbow-me/rainbowkit';

export const prismTheme = darkTheme({
  accentColor: '#2563eb', // Blue-600 - Prism Finance primary
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'rounded',
  overlayBlur: 'small',
});

// Custom theme overrides to match our design system
export const customPrismTheme = {
  ...prismTheme,
  colors: {
    ...prismTheme.colors,
    accentColor: '#2563eb',
    accentColorForeground: '#ffffff',
    actionButtonBorder: '#1f2937', // gray-800
    actionButtonBorderMobile: '#1f2937',
    actionButtonSecondaryBackground: '#111827', // gray-900
    closeButton: '#6b7280', // gray-500
    closeButtonBackground: '#1f2937',
    connectButtonBackground: '#2563eb',
    connectButtonBackgroundError: '#dc2626', // red-600
    connectButtonInnerBackground: '#1e40af', // blue-700
    connectButtonText: '#ffffff',
    connectButtonTextError: '#ffffff',
    connectionIndicator: '#10b981', // emerald-500
    downloadBottomCardBackground: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)', // zinc-950 to black
    downloadTopCardBackground: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)',
    error: '#ef4444', // red-500
    generalBorder: '#1f2937',
    generalBorderDim: '#18181b',
    menuItemBackground: '#18181b',
    modalBackdrop: 'rgba(0, 0, 0, 0.8)',
    modalBackground: '#000000',
    modalBorder: '#1f2937',
    modalText: '#f4f4f5', // gray-100
    modalTextDim: '#9ca3af', // gray-400
    modalTextSecondary: '#6b7280',
    profileAction: '#18181b',
    profileActionHover: '#1f2937',
    profileForeground: '#09090b',
    selectedOptionBorder: '#2563eb',
    standby: '#fbbf24', // amber-400
  },
  fonts: {
    body: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  },
  radii: {
    actionButton: '0.75rem', // 12px - matches our design
    connectButton: '0.5rem', // 8px
    menuButton: '0.75rem',
    modal: '1rem', // 16px
    modalMobile: '1rem',
  },
  shadows: {
    connectButton: '0 4px 12px rgba(37, 99, 235, 0.2)',
    dialog: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    profileDetailsAction: '0 2px 6px rgba(0, 0, 0, 0.15)',
    selectedOption: '0 0 0 2px rgba(37, 99, 235, 0.4)',
    selectedWallet: '0 0 0 2px rgba(37, 99, 235, 0.5)',
    walletLogo: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
};
