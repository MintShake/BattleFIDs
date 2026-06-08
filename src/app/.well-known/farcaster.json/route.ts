import { NextResponse } from 'next/server';

const BASE_URL = 'https://the-protocol-xi.vercel.app';

const manifest = {
  accountAssociation: {
    header:    'eyJmaWQiOjY3OTEwMywidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDE1ODcyZDQ5RDkwNjM4YWU4Y2VkZDQxYkExMmU1MmU2RjRGMjZEODQifQ',
    payload:   'eyJkb21haW4iOiJ0aGUtcHJvdG9jb2wteGkudmVyY2VsLmFwcCJ9',
    signature: '3XK/hnomfCZ+omH+LO3fgoErb03HGn2T4GruDjgT8gZhii0zgvRPbOXeyRd3Ndr0Y76WnnEwUbgDCrivnWphwBs=',
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
