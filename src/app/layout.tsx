import { ThemeProviderWrapper } from "@/providers/themeProvider";
import { WalletAdapterProvider } from "@/providers/walletAdapterProvider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UmiProvider } from "@/providers/umiProvider";
import { Toaster } from 'react-hot-toast'; // Add this import


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Metaplex Umi Next.js",
  description: "Metaplex template for Next.js using Umi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WalletAdapterProvider>
      <UmiProvider>
        <html lang="en">
          <body className={inter.className}>
            <ThemeProviderWrapper>{children}</ThemeProviderWrapper>
            <Toaster 
              position="bottom-center"
              toastOptions={{
                duration: 5000,
                style: {
                  background: '#333',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#10B981',
                  },
                },
                error: {
                  style: {
                    background: '#EF4444',
                  },
                },
              }}
            />
          </body>
        </html>
      </UmiProvider>
    </WalletAdapterProvider>
  );
}
