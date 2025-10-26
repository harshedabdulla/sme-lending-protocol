import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import {
  ArrowRight,
  Users,
  Shield,
  Coins,
  Vote,
  Award,
  CheckCircle,
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-black overflow-hidden">
      {/* <ThemeToggle /> */}

      {/* Hero Section - Hyperliquid Minimal Style */}
      <div className="relative min-h-screen flex items-center justify-center border-b border-gray-200 dark:border-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-32 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-12"
          >
            {/* Brand */}
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-3 px-4 py-1.5 border border-gray-300 dark:border-blue-500/30 bg-white dark:bg-black">
                <div className="w-1.5 h-1.5 bg-blue-500" />
                <span className="text-xs font-mono text-gray-600 dark:text-gray-400 tracking-wider uppercase">
                  Live on Sepolia
                </span>
              </div>

              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold text-gray-900 dark:text-white tracking-tight">
                <span className="block">PRISM</span>
                <span className="block text-blue-600 dark:text-blue-500">FINANCE</span>
              </h1>
            </div>

            {/* Value Prop */}
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl font-light leading-relaxed">
              Borrow with <span className="text-gray-900 dark:text-white font-medium">20% collateral</span> through social proof.
              Build on-chain reputation. Access DeFi with community backing.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/dashboard">
                <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors duration-200 flex items-center gap-2">
                  Launch App
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <a href="#how-it-works">
                <button className="px-8 py-3 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 text-gray-900 dark:text-white font-medium transition-colors duration-200">
                  Learn More
                </button>
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200 dark:border-gray-800">
              {[
                { label: "Min Collateral", value: "20%" },
                { label: "Insurance Pool", value: "30%" },
                { label: "Per Backer", value: "8%" },
              ].map((stat, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="text-sm font-mono text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 border-b border-gray-200 dark:border-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-light">
              Four steps to access DeFi with minimal collateral
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Users,
                step: "01",
                title: "Join Community",
                description:
                  "Get proposed by member, receive DAO votes",
              },
              {
                icon: Coins,
                step: "02",
                title: "Request Loan",
                description:
                  "Start at 100%, reduce 8% per backer",
              },
              {
                icon: Vote,
                step: "03",
                title: "Get Backed",
                description:
                  "10 backers = 20% minimum collateral",
              },
              {
                icon: Award,
                step: "04",
                title: "Build Credit",
                description:
                  "Repay on-time, increase reputation",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors duration-200 bg-white dark:bg-black"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border border-blue-600 dark:border-blue-500 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-600">
                        {item.step}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-b border-gray-200 dark:border-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Protocol Features
            </h2>
          </div>

          <div className="space-y-3">
            {[
              { title: "Dynamic Collateral", desc: "20-100% based on community backing" },
              { title: "Insurance Pool", desc: "30% default protection coverage" },
              { title: "DAO Governance", desc: "67% majority for membership votes" },
              { title: "On-Chain Reputation", desc: "Non-transferable NFT scoring" },
              { title: "Yield Generation", desc: "PYUSD deposits earn share-based returns" },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors duration-200"
              >
                <span className="text-lg font-medium text-gray-900 dark:text-white">{feature.title}</span>
                <span className="text-sm text-gray-500 dark:text-gray-500">{feature.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Prism */}
      <section className="py-24 border-b border-gray-200 dark:border-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Problem */}
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Why Traditional DeFi Fails
              </h2>
              <div className="space-y-3 border-l-2 border-gray-200 dark:border-gray-800 pl-6">
                {[
                  "100%+ collateral requirements",
                  "No credit history recognition",
                  "Excludes small businesses",
                  "Inefficient capital usage",
                ].map((point, i) => (
                  <div key={i} className="text-gray-600 dark:text-gray-400">
                    {point}
                  </div>
                ))}
              </div>
            </div>

            {/* Solution */}
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                The Prism Solution
              </h2>
              <div className="space-y-3 border-l-2 border-blue-600 dark:border-blue-500 pl-6">
                {[
                  "20% minimum collateral",
                  "On-chain reputation scoring",
                  "Community-backed lending",
                  "Insurance protection pool",
                ].map((point, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-b border-gray-200 dark:border-gray-900">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="space-y-8">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
              Ready to Start?
            </h2>
            <p className="text-lg py-4 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Join the community and access DeFi with minimal collateral
            </p>
            <Link to="/dashboard">
              <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors duration-200">
                Launch App
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-900 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <div className="text-sm font-mono text-gray-900 dark:text-white">
                PRISM FINANCE
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Social Collateral Protocol
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-500">
              <a href="#" className="hover:text-gray-900 dark:hover:text-gray-300">
                Docs
              </a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-gray-300">
                GitHub
              </a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-gray-300">
                Twitter
              </a>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 bg-blue-500" />
              <span className="text-gray-500 dark:text-gray-500 font-mono">
                SEPOLIA TESTNET
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
