'use client';

import { useWallet } from '@/hooks/useWallet';

export default function WalletConnect({ compact = false }: { compact?: boolean }) {
  const { connected, connecting, shortAddress, connect, disconnect } = useWallet();

  if (connected && shortAddress) {
    return (
      <button
        onClick={disconnect}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: compact ? '4px 10px' : '7px 14px',
          borderRadius: 99,
          border: '1px solid rgba(201,168,76,0.35)',
          background: 'rgba(201,168,76,0.06)',
          color: '#C9A84C',
          fontSize: compact ? 8 : 10,
          fontWeight: 700, letterSpacing: '0.1em',
          cursor: 'pointer',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
        {shortAddress}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: compact ? '4px 10px' : '7px 14px',
        borderRadius: 99,
        border: '1px solid rgba(138,99,210,0.3)',
        background: connecting ? 'rgba(138,99,210,0.1)' : 'transparent',
        color: '#8a63d2',
        fontSize: compact ? 8 : 10,
        fontWeight: 700, letterSpacing: '0.1em',
        cursor: connecting ? 'default' : 'pointer',
        opacity: connecting ? 0.7 : 1,
      }}
    >
      <span style={{ fontSize: compact ? 10 : 13 }}>⬡</span>
      {connecting ? 'Connecting…' : 'Connect Wallet'}
    </button>
  );
}
