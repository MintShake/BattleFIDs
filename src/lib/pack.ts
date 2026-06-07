import { BattleFIDCard } from '@/types/card';
import { fetchFaces } from './faces';
import { fetchNeynarUsers } from './neynar';
import { buildAllVariants } from './cardBuilder';

const PACK_SIZE = 10;

export async function openPack(): Promise<BattleFIDCard[]> {
  // 1. Get total FID count for random offset
  const probe = await fetchFaces({ limit: 1, offset: 0, imagesPerFid: 1 });
  const total = probe.totalFids;

  // 2. Random offset — fetch a generous pool then shuffle down to pack size
  const maxOffset = Math.max(0, total - PACK_SIZE * 4);
  const offset = Math.floor(Math.random() * maxOffset);

  const result = await fetchFaces({
    limit: PACK_SIZE * 4,
    offset,
    imagesPerFid: 5, // up to 5 variants per FID so older editions can appear
    sort: 'fid',
    order: 'asc',
  });

  // 3. Flatten all (timeline × image) pairs into individual cards
  const pool: Array<{ timeline: typeof result.data[0]; imageIndex: number }> = [];
  for (const tl of result.data) {
    for (let i = 0; i < tl.images.length; i++) {
      pool.push({ timeline: tl, imageIndex: i });
    }
  }

  // 4. Shuffle and take PACK_SIZE
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, PACK_SIZE);

  // 5. Batch-fetch Neynar data for unique FIDs
  const uniqueFids = [...new Set(shuffled.map((x) => x.timeline.fid))];
  const neynarMap = await fetchNeynarUsers(uniqueFids);

  // 6. Build cards
  return shuffled.map(({ timeline, imageIndex }) =>
    buildAllVariants(timeline, neynarMap.get(timeline.fid))[imageIndex],
  );
}
