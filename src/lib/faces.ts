import { FacesListResponse, FacesSortMode, FacesOrder } from '@/types/faces';

const BASE = 'https://web-legoblocksapps.vercel.app';

export async function fetchFaces(params: {
  limit?: number;
  offset?: number;
  sort?: FacesSortMode;
  order?: FacesOrder;
  q?: string;
  minImages?: number;
  imagesPerFid?: number;
}): Promise<FacesListResponse> {
  const {
    limit = 25,
    offset = 0,
    sort = 'fid',
    order = 'asc',
    imagesPerFid = 1,
    q,
    minImages,
  } = params;

  const url = new URL(`${BASE}/api/faces`);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('sort', sort);
  url.searchParams.set('order', order);
  url.searchParams.set('imagesPerFid', String(imagesPerFid));
  if (q) url.searchParams.set('q', q);
  if (minImages !== undefined) url.searchParams.set('minImages', String(minImages));

  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Faces API ${res.status}`);
  return res.json();
}
