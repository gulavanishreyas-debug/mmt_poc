import { NextResponse } from 'next/server';
import { storageMode } from '../kv-adapter';

export async function GET() {
  // Check KV availability
  let kvAvailable = false;
  let kvTestResult = null;
  
  try {
    const kvModule = require('@vercel/kv');
    kvAvailable = true;
    
    // Try to set and get a test value
    try {
      await kvModule.kv.set('test-key', 'test-value', { ex: 60 });
      kvTestResult = await kvModule.kv.get('test-key');
      await kvModule.kv.del('test-key');
    } catch (error: any) {
      kvTestResult = `Error: ${error.message}`;
    }
  } catch (error) {
    kvAvailable = false;
  }

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      hasKVUrl: !!process.env.KV_REST_API_URL,
      hasKVToken: !!process.env.KV_REST_API_TOKEN,
    },
    storage: {
      currentMode: storageMode,
      kvModuleAvailable: kvAvailable,
      kvTestResult,
    },
    recommendation: !kvAvailable || !process.env.KV_REST_API_URL
      ? '⚠️ KV not available. Go to Vercel Dashboard → Storage → Create KV Database'
      : '✅ KV is properly configured',
  };

  return NextResponse.json(diagnostics, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
