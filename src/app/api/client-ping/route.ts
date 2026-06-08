export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rnwv   = searchParams.get('rnwv')   ?? '?';
  const parent = searchParams.get('parent') ?? '?';
  const ready  = searchParams.get('ready')  ?? '?';
  const ua     = (searchParams.get('ua') ?? '').slice(0, 120);
  console.log(`[client-ping] ReactNativeWebView=${rnwv} parent=${parent} ready=${ready} ua=${ua}`);
  return Response.json({ ok: true });
}
