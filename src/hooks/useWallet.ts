'use client';

import { useState, useCallback, useEffect } from 'react';

export interface WalletState {
  address: string | null;
  shortAddress: string | null;
  fid: number | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function useWallet(): WalletState {
  const [address, setAddress]   = useState<string | null>(null);
  const [fid, setFid]           = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Restore previously connected address + fid from sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved    = sessionStorage.getItem('wallet_address');
    const savedFid = sessionStorage.getItem('wallet_fid');
    if (saved) setAddress(saved);
    if (savedFid) setFid(parseInt(savedFid));
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
      // wallet_requestPermissions forces the account picker even when already approved
      await eth.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      }).catch(() => null); // not all wallets support this; ignore failures

      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      const addr = accounts[0]?.toLowerCase() ?? null;
      setAddress(addr);
      if (addr) sessionStorage.setItem('wallet_address', addr);

      // Resolve Farcaster FID from the connected address
      if (addr) {
        fetch(`/api/neynar/address?address=${addr}`)
          .then(r => r.json())
          .then(({ user }) => {
            if (user?.fid) {
              setFid(user.fid);
              sessionStorage.setItem('wallet_fid', String(user.fid));
              // Share the FID with the miniapp FID slot so admin check works
              sessionStorage.setItem('miniapp_fid', String(user.fid));
            }
          })
          .catch(() => {});
      }

      // Switch to Base if not already
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // 8453 = Base
        });
      } catch {
        // ignore chain-switch failures
      }
    } catch {
      // user rejected
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setFid(null);
    sessionStorage.removeItem('wallet_address');
    sessionStorage.removeItem('wallet_fid');
  }, []);

  return {
    address,
    shortAddress: address ? shorten(address) : null,
    fid,
    connected: !!address,
    connecting,
    connect,
    disconnect,
  };
}
