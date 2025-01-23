import Header from "@/components/header";
import { MintNFT } from '../components/MintNFT';
import { CANDY_MACHINE_CONFIG } from '../config/candyMachine';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <Header />
          
          {/* Main Content */}
          <div className="mt-16 mb-24">
            <MintNFT 
              candyMachineId={CANDY_MACHINE_CONFIG.candyMachineId}
              tokenMint={CANDY_MACHINE_CONFIG.tokenMint}
            />
          </div>

          {/* Footer Links */}
          <footer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          </footer>
        </div>
      </div>
    </main>
  );
}
