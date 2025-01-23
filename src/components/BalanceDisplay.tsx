'use client'

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { CANDY_MACHINE_CONFIG } from '../config/candyMachine';

const BalanceDisplay = () => {
  const { publicKey } = useWallet();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [mvpBalance, setMvpBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!publicKey) return;

      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

      // Fetch SOL balance
      try {
        const balance = await connection.getBalance(publicKey);
        setSolBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Error fetching SOL balance:', error);
      }

      // Fetch MVP token balance
      try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );

        const mvpTokenAccount = tokenAccounts.value.find(
          account => account.account.data.parsed.info.mint === CANDY_MACHINE_CONFIG.tokenMint
        );

        if (mvpTokenAccount) {
          const balance = Number(mvpTokenAccount.account.data.parsed.info.tokenAmount.uiAmount);
          setMvpBalance(balance);
        } else {
          setMvpBalance(0);
        }
      } catch (error) {
        console.error('Error fetching MVP balance:', error);
      }
    };

    fetchBalances();
    // Set up an interval to refresh balances every 30 seconds
    const interval = setInterval(fetchBalances, 30000);

    return () => clearInterval(interval);
  }, [publicKey]);

  if (!publicKey) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center bg-white/50 dark:bg-gray-800/50 rounded-lg px-4 py-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">SOL Balance</span>
        <span className="font-bold text-blue-600 dark:text-blue-400">
          {solBalance !== null ? solBalance.toFixed(4) : '...'}
        </span>
      </div>
      <div className="flex flex-col items-center bg-white/50 dark:bg-gray-800/50 rounded-lg px-4 py-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">MVP Balance</span>
        <span className="font-bold text-purple-600 dark:text-purple-400">
          {mvpBalance !== null ? mvpBalance.toFixed(2) : '...'}
        </span>
      </div>
    </div>
  );
};

export default BalanceDisplay;