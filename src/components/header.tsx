'use client'

import dynamic from "next/dynamic";
import ThemeSwitcher from "./themeSwitcher";
import BalanceDisplay from "./BalanceDisplay";

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MVP
            </h1>
          </div>

          {/* Wallet and Theme Controls */}
          <div className="flex items-center gap-4">
            <BalanceDisplay />
            <WalletMultiButtonDynamic />
            <div className="border-l border-gray-200 dark:border-gray-700 h-6 mx-2" />
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
