'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import umiWithCurrentWalletAdapter from '@/lib/umi/umiWithCurrentWalletAdapter';
import {
  createUmi,
} from '@metaplex-foundation/umi-bundle-defaults';
import {
  publicKey,
  transactionBuilder,
  generateSigner,
  some,
  unwrapOption,
} from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { 
  mplCandyMachine,
  fetchCandyMachine,
  safeFetchCandyGuard,
  mintV2,
  CandyGuard,
  CandyMachine,
} from '@metaplex-foundation/mpl-candy-machine';
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import toast from 'react-hot-toast';
import dynamic from "next/dynamic";
import { base58 } from '@metaplex-foundation/umi/serializers';

// Add new status type for better state management
type MintStatus = 'idle' | 'loading' | 'minting' | 'success' | 'error';

interface MintNFTProps {
  candyMachineId: string;
  tokenMint: string;
}

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export const MintNFT = ({ candyMachineId, tokenMint }: MintNFTProps) => {
  const wallet = useWallet();
  const [status, setStatus] = useState<MintStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [candyMachine, setCandyMachine] = useState<CandyMachine | null>(null);
  const [candyGuard, setCandyGuard] = useState<CandyGuard | null>(null);
  const [itemsRedeemed, setItemsRedeemed] = useState<number>(0);
  const [itemsAvailable, setItemsAvailable] = useState<number>(0);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);

  // Calculate progress percentage
  const progress = itemsAvailable ? (itemsRedeemed / itemsAvailable) * 100 : 0;
  const isSoldOut = itemsRedeemed === itemsAvailable;

  const initializeUmi = () => {
    const umi = createUmi('https://api.devnet.solana.com')
      .use(mplCandyMachine())
      .use(walletAdapterIdentity(wallet));
    return umi;
  };

  useEffect(() => {
    const fetchCandyMachineDetails = async () => {
      try {
        console.log("Fetching candy machine details...");
        const umi = initializeUmi();
        const fetchedCandyMachine = await fetchCandyMachine(umi, publicKey(candyMachineId));
        const fetchedCandyGuard = await safeFetchCandyGuard(umi, fetchedCandyMachine.mintAuthority);
        console.log("Fetched candy machine:", fetchedCandyMachine);
        console.log("Fetched candy guard:", fetchedCandyGuard);
        setCandyMachine(fetchedCandyMachine);
        setCandyGuard(fetchedCandyGuard);
        setItemsRedeemed(Number(fetchedCandyMachine.itemsRedeemed));
        setItemsAvailable(Number(fetchedCandyMachine.itemsLoaded));
        
        if (fetchedCandyGuard) {
          const tokenPaymentGuard = unwrapOption(fetchedCandyGuard.guards.tokenPayment);
          if (tokenPaymentGuard) {
            setTokenPrice(Number(tokenPaymentGuard.amount) / 100000000);
          }
        }
      } catch (err) {
        console.error('Error fetching candy machine details:', err);
        setError('Failed to fetch candy machine details');
      }
    };

    if (wallet.connected) {
      fetchCandyMachineDetails();
    }
  }, [wallet.connected, candyMachineId]);

  const handleMint = async () => {
    if (!wallet.connected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!candyMachine || !candyGuard) {
      setError('Candy machine not initialized');
      return;
    }

    try {
      setStatus('minting');
      setError(null);
      
      const umi = initializeUmi();

      // Build mintArgs based on guards
      let mintArgs = {};
      const tokenPaymentGuard = unwrapOption(candyGuard.guards.tokenPayment);
      if (tokenPaymentGuard) {
        mintArgs = {
          tokenPayment: some({ 
            mint: tokenPaymentGuard.mint,
            destinationAta: tokenPaymentGuard.destinationAta,
            amount: tokenPaymentGuard.amount
          }),
        };
      }

      try {
        // Mint from the Candy Machine.
        const nftMint = generateSigner(umi);
        const transaction = await transactionBuilder()
            .add(setComputeUnitLimit(umi, { units: 800_000 }))
            .add(
                mintV2(umi, {
                    candyMachine: candyMachine.publicKey,
                    candyGuard: candyGuard?.publicKey,
                    nftMint,
                    collectionMint: candyMachine.collectionMint,
                    collectionUpdateAuthority: candyMachine.authority,
                    mintArgs
                })
            );
        const { signature } = await transaction.sendAndConfirm(umi, {
            confirm: { commitment: "confirmed" },
        });
        console.log("Mint Success", signature);
        const signatureString = base58.deserialize(signature).toString();
        const signatureParts = signatureString.split(',');
        setTransactionSignature(signatureParts[0]);
        setStatus('success');
        toast.success('NFT successfully minted!', {
          duration: 5000,
          position: 'bottom-center',
          style: {
            background: '#10B981',
            color: 'white',
          },
        });
        // Update items redeemed
        setItemsRedeemed(prev => prev + 1);
    } catch (error: any) {
      console.log("Something happened");
      setStatus('error');
      toast.error('Failed to mint NFT. Please try again.', {
        duration: 5000,
        position: 'bottom-center',
      });
    }
      
    } catch (err) {
      console.error('Mint failed:', err);
      setStatus('error');
      setError('Failed to mint NFT. Please try again.');
    } finally {
      if (status !== 'success') {
        setStatus('idle');
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full mx-auto relative overflow-hidden">
      {/* Add subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-blue-500 to-purple-500" />
      
      <div className="relative z-10 w-full">
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
          Mint NFT
        </h2>
        
        {!wallet.connected ? (
          <div className="space-y-4">
            <p className="text-center text-gray-600 dark:text-gray-400">
              Connect your wallet to start minting
            </p>
            <div className="flex justify-center w-full">
              <WalletMultiButton className="w-full py-3 px-6 rounded-lg font-medium text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]" />
            </div>
          </div>
        ) : (
          <>
            {/* Progress Section */}
            <div className="space-y-4 mb-6">
              <div className="relative w-full h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                />
                {/* Add shine effect */}
                <div 
                  className="absolute top-0 left-0 w-20 h-full bg-white/20 skew-x-30 animate-shine"
                  style={{ 
                    transform: 'skewX(-45deg) translateX(-100%)',
                    animation: 'shine 2s infinite'
                  }}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Progress
                </span>
                <span className="text-sm font-medium">
                  {progress.toFixed(1)}%
                </span>
              </div>

              <div className="flex justify-center items-center gap-2">
                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {itemsRedeemed}
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-3xl font-bold">
                  {itemsAvailable}
                </span>
              </div>
            </div>

            {/* Price Display */}
            {tokenPrice && (
              <div className="relative group mb-6">
                <div className="flex flex-col items-center gap-1 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg w-full backdrop-blur-sm transition-all duration-300 group-hover:scale-[1.02]">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Price per NFT</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {tokenPrice} MVP
                  </p>
                </div>
              </div>
            )}

            {/* Mint Button */}
            <button
              onClick={handleMint}
              disabled={status !== 'idle' || isSoldOut}
              className={`
                w-full py-4 px-6 rounded-lg font-medium text-lg
                transition-all duration-300 transform 
                ${status === 'idle' && !isSoldOut
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]'
                  : 'bg-gray-400 cursor-not-allowed'
                } text-white relative overflow-hidden
              `}
            >
              {status === 'minting' ? (
                <div className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Minting your NFT...
                </div>
              ) : isSoldOut ? (
                'Sold Out'
              ) : (
                'Mint NFT'
              )}
            </button>

            {/* Transaction Status */}
            {transactionSignature && (
              <div className="mt-4 text-center">
                <a
                  href={`https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
                >
                  View transaction →
                </a>
              </div>
            )}
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 w-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 animate-shake">
            <p className="text-red-600 dark:text-red-400 text-center">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};