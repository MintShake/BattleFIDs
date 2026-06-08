import { NextResponse } from 'next/server';

const BASE_URL = 'https://the-protocol.vercel.app';

// TODO: re-sign accountAssociation for the-protocol.vercel.app at
// https://farcaster.xyz/~/developers/mini-apps/manifest and replace these values.
const manifest = {
  accountAssociation: {
    header:    'eyJmaWQiOjY3OTEwMywidHlwZSI6ImF1dGgiLCJrZXkiOiIweGUxZTgyNTRhMDkxMzE4RjdkZUREMDZmOEFlZDg4Yjg2MjBDNDc0RGYifQ',
    payload:   'eyJkb21haW4iOiJ0aGUtcHJvdG9jb2wudmVyY2VsLmFwcCJ9',
    signature: 'NEEDS_RESIGN',
  },
  miniapp: {
    version: '1',
    name: 'The Protocol',
    iconUrl:              `${BASE_URL}/icon.png`,
    homeUrl:              BASE_URL,
    imageUrl:             `${BASE_URL}/og.png`,
    buttonTitle:          'Play The Protocol',
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
