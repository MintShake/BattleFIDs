export type FacesSortMode = 'count' | 'newest' | 'oldest' | 'fid' | 'likes' | 'score';
export type FacesOrder = 'asc' | 'desc';

export interface FacesListResponse {
  ok: true;
  meta: {
    limit: number;
    offset: number;
    imagesPerFid: number;
    sort: FacesSortMode;
    order: FacesOrder;
    q: string | null;
    minImages: number;
  };
  count: number;
  totalFids: number;
  totalImages: number;
  data: FidTimeline[];
}

export interface FidTimeline {
  fid: number;
  imageCount: number;
  images: PfpImage[];
  profile?: FidProfile;
}

export interface PfpImage {
  id: string;
  filename: string;
  url: string;
  thumbUrl?: string;
  mediumUrl?: string;
  size: number;
  storedAt: string;
  likeCount: number;
}

export interface FidProfile {
  fid: number;
  username?: string;
  displayName?: string;
  bio?: string;
  profileUrl?: string;
  pfpUrl?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  lastProfileFetchedAt?: string;
  updatedAt?: string;
}
