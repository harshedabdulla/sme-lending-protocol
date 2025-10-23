import React from 'react';
import { useAccount } from 'wagmi';
import { useNexus } from '../contexts/NexusContext';
import { Wallet, User, Settings, Shield, Globe } from 'lucide-react';

export default function MyAccount() {
  const { address, isConnected } = useAccount();
  const { nexus } = useNexus();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-100">My Account</h1>
        <p className="text-sm text-gray-500">
          Manage your account settings and view your activity
        </p>
      </div>

      {/* Account Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-blue-400" />
            <span>Wallet Status</span>
          </h3>

          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm text-emerald-400">Connected</span>
              </div>
              <div className="text-sm text-gray-400 font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-sm text-gray-500">Not Connected</span>
              </div>
              <p className="text-sm text-gray-500">Connect your wallet to get started</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <span>Nexus Status</span>
          </h3>

          {nexus ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm text-emerald-400">Nexus Connected</span>
              </div>
              <p className="text-sm text-gray-500">Cross-chain features enabled</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-sm text-gray-500">Nexus Not Connected</span>
              </div>
              <p className="text-sm text-gray-500">Connect wallet to enable Nexus</p>
            </div>
          )}
        </div>
      </div>

      {/* Account Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
          <User className="w-5 h-5 text-blue-400" />
          <span>Account Information</span>
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Member Status
              </label>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">Active Member</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Reputation Score
              </label>
              <div className="text-2xl font-semibold text-gray-100">850</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Total Loans
              </label>
              <div className="text-lg font-semibold text-gray-100">12</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Active Loans
              </label>
              <div className="text-lg font-semibold text-gray-100">3</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Total Yield Earned
              </label>
              <div className="text-lg font-semibold text-gray-100">$2,450</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Chain Activity */}
      {nexus && (
        <div className="card border-blue-900/20 bg-blue-950/10">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <span>Cross-Chain Activity</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-semibold text-gray-100">15</div>
              <div className="text-xs text-gray-500 mt-1">Cross-Chain Transactions</div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-semibold text-gray-100">$25,000</div>
              <div className="text-xs text-gray-500 mt-1">Total Volume</div>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-semibold text-gray-100">3</div>
              <div className="text-xs text-gray-500 mt-1">Active Chains</div>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>Settings</span>
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-300">Email Notifications</div>
              <div className="text-xs text-gray-500">Receive updates about your loans and governance</div>
            </div>
            <button className="btn-secondary text-sm">Enable</button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-300">Cross-Chain Alerts</div>
              <div className="text-xs text-gray-500">Get notified about cross-chain transactions</div>
            </div>
            <button className="btn-secondary text-sm">Enable</button>
          </div>
        </div>
      </div>
    </div>
  );
}