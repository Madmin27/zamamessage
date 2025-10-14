import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // CORS headers for Zama SDK worker scripts
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    
    // Additional CORS
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
    );

    // Avoid stale html/chunks for test page and next static assets
    const p = request.nextUrl.pathname;
    if (
        p.startsWith('/test-new-api') ||
        p.startsWith('/_next/static/chunks/app/test-new-api') ||
        p.startsWith('/_next/static')
    ) {
        response.headers.set('Cache-Control', 'no-store');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
    }

    return response;
}

// Apply to all routes
export const config = {
    matcher: '/:path*',
};
