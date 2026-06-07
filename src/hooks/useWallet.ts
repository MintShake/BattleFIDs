'use client';

import { useState, useCallback, useEffect } from 'react';

export interface WalletState {
  address: string | null;
  shortAddress: string | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Restore previously connected address from sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem('wallet_address');
    if (saved) setAddress(saved);
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eth = (window as any).ethereum;
    if (!eth) {
      alert('No wallet detected. Install MetaMask or open in a wallet browser.');
      return;
    }
    setConnecting(true);
    try {
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      const addr = accounts[0] ?? null;
      setAddress(addr);
      if (addr) sessionStorage.setItem('wallet_address', addr);

      // Switch to Base if not already
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // 8453 = Base
        });
      } catch {
        // ignore chain-switch failures — just warn
        console.warn('Could not switch to Base. Make sure your wallet supports Base mainnet.');
      }
    } catch {
      // user rejected
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    sessionStorage.removeItem('wallet_address');
  }, []);

  return {
    address,
    shortAddress: address ? shorten(address) : null,
    connected: !!address,
    connecting,
    connect,
    disconnect,
  };
}
