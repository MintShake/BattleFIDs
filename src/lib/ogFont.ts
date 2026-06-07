// Loads Caveat 700 for use in ImageResponse (Satori requires woff/ttf, not woff2).
// Google Fonts v1 API always returns woff when passed an old User-Agent.
export async function loadCaveat(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css?family=Caveat:700',
      { headers: { 'User-Agent': 'Mozilla/4.0' } },
    ).then(r => r.text());

    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    return fetch(url).then(r => r.arrayBuffer());
  } catch {
    return null;
  }
}
