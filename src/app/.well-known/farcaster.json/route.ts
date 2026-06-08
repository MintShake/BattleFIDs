import { NextResponse } from 'next/server';

const BASE_URL = 'https://battle-fids.vercel.app';

// ── Farcaster Mini App manifest ────────────────────────────────────────────────
// accountAssociation: sign this payload with your Farcaster custody key via
// https://warpcast.com/~/developers/mini-apps to get the header/signature.
// Leave as-is until you sign — the frame block is still valid for embeds.
const manifest = {
  accountAssociation: {
    header:    process.env.FARCASTER_MANIFEST_HEADER    ?? '',
    payload:   process.env.FARCASTER_MANIFEST_PAYLOAD   ?? '',
    signature: process.env.FARCASTER_MANIFEST_SIGNATURE ?? '',
  },
  frame: {
    version: '1',
    name: 'The Protocol',
    iconUrl:              `${BASE_URL}/icon.png`,
    homeUrl:              BASE_URL,
    splashImageUrl:       `${BASE_URL}/splash.png`,
    splashBackgroundColor: '#07020e',
    webhookUrl:           `${BASE_URL}/api/webhook`,
  },
};

export async function GET() {
  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma':  'no-cache',
      'Expires': '0',
    },
  });
}
