import { NextResponse } from 'next/server';

const BASE_URL = 'https://battle-fids.vercel.app';

const manifest = {
  accountAssociation: {
    header:    'eyJmaWQiOjY3OTEwMywidHlwZSI6ImF1dGgiLCJrZXkiOiIweGUxZTgyNTRhMDkxMzE4RjdkZUREMDZmOEFlZDg4Yjg2MjBDNDc0RGYifQ',
    payload:   'eyJkb21haW4iOiJiYXR0bGUtZmlkcy52ZXJjZWwuYXBwIn0',
    signature: 'CNNP2FrqPKm0/kTiNeAaa6LiGzfyE3QDMEGnrxlOU7xs6cSGxa3D0TIjgLlb2/DsmUgfi4O2zjt4ytbrZGjF8xw=',
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
