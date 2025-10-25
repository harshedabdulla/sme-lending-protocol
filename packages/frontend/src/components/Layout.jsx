import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useNexus } from '../contexts/NexusContext';
import {
  LayoutDashboard,
  Coins,
  Users,
  Wallet,
  Menu,
  X,
  TrendingUp,
  Fuel,
} from 'lucide-react';

const Navigation = ({ mobile = false, onClose = () => { } }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/loans', icon: Coins, label: 'Loans' },
    { path: '/members', icon: Users, label: 'Members' },
    { path: '/yield', icon: TrendingUp, label: 'Yield Pool' },
    { path: '/gas', icon: Fuel, label: 'Gas Manager' },
    { path: '/account', icon: Wallet, label: 'Account' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={mobile ? 'flex flex-col space-y-1' : 'flex items-center space-x-1'}>
      {navItems.map(({ path, icon: Icon, label }) => (
        <Link
          key={path}
          to={path}
          onClick={onClose}
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-150 ease-out
            ${isActive(path)
              ? 'bg-gray-900 text-gray-100'
              : 'text-gray-400 hover:text-gray-100 hover:bg-gray-950'
            }
          `}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { nexus } = useNexus();
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
                <span className="text-sm font-bold text-white">P</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-semibold text-gray-100">
                  Prism Finance
                </h1>
                <p className="text-xs text-gray-500">Social Collateral Protocol</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <Navigation />
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <ConnectButton
                accountStatus={{
                  smallScreen: 'avatar',
                  largeScreen: 'full',
                }}
                chainStatus="icon"
                showBalance={{
                  smallScreen: false,
                  largeScreen: true,
                }}
              />
              {/* Nexus Status */}
              {nexus ? (
                <span className="text-green-400 text-sm font-mono">
                  Nexus Connected
                </span>
              ) : (
                <span className="text-gray-500 text-sm font-mono">
                  Nexus Not Connected
                </span>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-900 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-900 bg-black">
            <div className="px-4 py-3">
              <Navigation mobile onClose={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="slide-up">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 text-sm">
              <div className="status-dot" />
              <span className="text-gray-500 font-mono">
                Sepolia Testnet
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Prism Finance v1.0
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
