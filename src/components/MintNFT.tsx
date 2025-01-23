'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
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
import { SendTransactionError } from '@solana/web3.js';
import toast from 'react-hot-toast';

interface MintNFTProps {
  candyMachineId: string;
  tokenMint: string;
}

export const MintNFT = ({ candyMachineId, tokenMint }: MintNFTProps) => {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [candyMachine, setCandyMachine] = useState<CandyMachine | null>(null);
  const [candyGuard, setCandyGuard] = useState<CandyGuard | null>(null);
  const [itemsRedeemed, setItemsRedeemed] = useState<number>(0);
  const [itemsAvailable, setItemsAvailable] = useState<number>(0);

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
      setLoading(true);
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
      

      // try {
      //   await mintV2(umi, {
      //     candyMachine: candyMachine?.publicKey,
      //     candyGuard: candyGuard?.publicKey,
      //     nftMint: generateSigner(umi),
      //     collectionMint: candyMachine.collectionMint,
      //     collectionUpdateAuthority: candyMachine.authority,
      //     tokenStandard: candyMachine.tokenStandard,
      //     mintArgs
      //   }).sendAndConfirm(umi)
      // } catch (error) {
      //     console.error('Transaction failed:', error);
      // }

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
        // const txid = bs58.encode(signature);
        console.log("Mint Success", signature)
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
      console.log("Something happened")
      toast.error('Failed to mint NFT. Please try again.', {
        duration: 5000,
        position: 'bottom-center',
      });
    }

      
      
     
      
    } catch (err) {
      console.error('Mint failed:', err);
      setError('Failed to mint NFT. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full mx-auto">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Mint NFT
      </h2>
      
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
          style={{ width: `${(itemsRedeemed / itemsAvailable) * 100}%` }}
        />
      </div>
      
      <div className="flex flex-col items-center gap-2">
        <p className="text-lg font-medium">
          <span className="text-2xl text-blue-600 dark:text-blue-400">{itemsRedeemed}</span>
          <span className="mx-2">/</span>
          <span className="text-2xl">{itemsAvailable}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">Assets Minted</p>
      </div>
      
      {tokenPrice && (
        <div className="flex flex-col items-center gap-1 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg w-full">
          <p className="text-sm text-gray-600 dark:text-gray-400">Price</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {tokenPrice} MVP
          </p>
        </div>
      )}
      
      <button
        onClick={handleMint}
        disabled={loading || !wallet.connected}
        className={`
          w-full py-3 px-6 rounded-lg font-medium text-lg
          transition-all duration-200 transform hover:scale-[1.02]
          ${loading || !wallet.connected
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg'
          } text-white
        `}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
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
            Minting...
          </div>
        ) : (
          'Mint NFT'
        )}
      </button>

      {!wallet.connected && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please connect your wallet to mint
        </p>
      )}

      {error && (
        <div className="w-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 text-center">
            {error}
          </p>
        </div>
      )}
    </div>
  );
};