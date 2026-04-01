export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');

  if (!target || !/^http:\/\//i.test(target)) {
    return new Response('Bad Request: only http:// URLs accepted', { status: 400 });
  }

  const upstreamHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; RadioAntomatee/1.0)',
    'Accept': '*/*',
  };

  const range = req.headers.get('range');
  if (range) upstreamHeaders['Range'] = range;

  try {
    const upstream = await fetch(target, { headers: upstreamHeaders });

    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'no-store, no-cache');
    headers.set('X-Proxy', 'RadioAntomatee');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (e) {
    return new Response('Proxy error: ' + e.message, { status: 502 });
  }
}
