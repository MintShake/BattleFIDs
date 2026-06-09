import { BattleFIDCard } from '@/types/card';
import { fetchFaces } from './faces';
import { fetchNeynarUsers } from './neynar';
import { buildCard } from './cardBuilder';

const PACK_SIZE = 10;

export async function openPack(): Promise<BattleFIDCard[]> {
  const probe = await fetchFaces({ limit: 1, offset: 0, imagesPerFid: 1 });
  const total = probe.totalFids;

  const maxOffset = Math.max(0, total - PACK_SIZE * 4);
  const offset = Math.floor(Math.random() * maxOffset);

  const result = await fetchFaces({
    limit: PACK_SIZE * 4,
    offset,
    imagesPerFid: 50,
    sort: 'fid',
    order: 'asc',
  });

  const shuffled = result.data.sort(() => Math.random() - 0.5).slice(0, PACK_SIZE);
  const uniqueFids = [...new Set(shuffled.map(tl => tl.fid))];
  const neynarMap = await fetchNeynarUsers(uniqueFids);

  return shuffled.map(timeline =>
    buildCard(timeline, neynarMap.get(timeline.fid)),
  );
}
