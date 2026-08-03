// app/api/server-status/route.ts
// 🌟 代理 Glances REST API，避免浏览器跨域问题
import { NextResponse } from 'next/server';

const GLANCES_HOST = process.env.GLANCES_HOST || 'http://serve.srmz.cn:2012';
const CACHE_SECONDS = 5;

export const dynamic = 'force-dynamic';

async function fetchGlances(endpoint: string) {
  try {
    const res = await fetch(`${GLANCES_HOST}/api/4/${endpoint}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(`❌ Glances ${endpoint} 请求失败:`, e);
    return null;
  }
}

export async function GET() {
  const [quicklook, mem, load, fs, network, processlist] = await Promise.all([
    fetchGlances('quicklook'),
    fetchGlances('mem'),
    fetchGlances('load'),
    fetchGlances('fs'),
    fetchGlances('network'),
    fetchGlances('processlist'),
  ]);

  const data = {
    timestamp: Date.now(),
    quicklook,
    mem,
    load,
    fs,
    network,
    processlist: processlist
      ? processlist
          .filter((p: any) => p && typeof p === 'object')
          .slice(0, 10)
      : [],
  };

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
    },
  });
}
