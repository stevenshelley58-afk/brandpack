/**
 * POST /api/scrape
 * 
 * Scrapes a domain and generates brand kernel
 * 
 * Request body:
 * {
 *   "domain": "example.com"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "kernel": { ... },
 *   "scrape_metadata": { ... }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { crawlSite, compressKernel } from '@brandpack/core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { success: false, error: 'domain is required and must be a string' },
        { status: 400 }
      );
    }

    // Normalize domain to full URL
    const url = domain.startsWith('http') ? domain : `https://${domain}`;

    // Crawl the site
    const crawlResult = await crawlSite({ url });

    // Check if we got any content
    if (crawlResult.pages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No pages could be crawled',
          scrape_metadata: {
            pages_crawled: 0,
            total_bytes: 0,
            duration_ms: crawlResult.totalDurationMs,
          },
        },
        { status: 422 }
      );
    }

    // Build kernel sources from crawl results
    const sources = crawlResult.pages
      .filter(page => page.status && page.status >= 200 && page.status < 400)
      .map(page => ({
        url: page.url,
        content: page.content,
      }));

    if (sources.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid pages found (all returned errors)',
          scrape_metadata: {
            pages_crawled: crawlResult.pages.length,
            total_bytes: crawlResult.totalBytes,
            duration_ms: crawlResult.totalDurationMs,
          },
        },
        { status: 422 }
      );
    }

    // Compress into kernel
    const kernel = compressKernel({
      domain: new URL(url).hostname,
      sources,
    });

    return NextResponse.json({
      success: true,
      kernel,
      scrape_metadata: {
        pages_crawled: crawlResult.pages.length,
        total_bytes: crawlResult.totalBytes,
        duration_ms: crawlResult.totalDurationMs,
        sitemap_used: crawlResult.sitemapUsed,
        limit_reached: crawlResult.limitReached,
        early_stop_triggered: crawlResult.earlyStopTriggered,
      },
    });

  } catch (error) {
    console.error('[/api/scrape] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

