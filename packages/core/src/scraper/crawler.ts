import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const MAX_PAGES = 6;
const MAX_TOTAL_BYTES = 300 * 1024;
const MAX_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 5000;
const TOTAL_TIMEOUT_MS = 15000;
const USER_AGENT =
  'BrandPackCrawler/1.0 (+https://brandpack.example.com/crawler)';

export interface CrawlPage {
  url: string;
  status: number | null;
  content: string;
  bytes: number;
  etag?: string | null;
  lastModified?: string | null;
  contentHash: string;
  fetchedAt: string;
  error?: string;
}

export interface CrawlResult {
  origin: string;
  pages: CrawlPage[];
  totalBytes: number;
  totalDurationMs: number;
  sitemapUsed: boolean;
  earlyStopTriggered: boolean;
  limitReached: boolean;
}

export interface CrawlOptions {
  url: string;
  signal?: AbortSignal;
  /**
   * Return true when enough content has been gathered.
   */
  earlyStop?: (page: CrawlPage) => boolean;
}

export async function crawlSite(options: CrawlOptions): Promise<CrawlResult> {
  const start = Date.now();
  const startUrl = normalizeUrl(options.url);
  const visited = new Set<string>();
  const queue: string[] = [];
  const pages: CrawlPage[] = [];
  let totalBytes = 0;
  let limitReached = false;
  let earlyStopTriggered = false;
  let sitemapUsed = false;

  const controller = new AbortController();
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), {
      once: true,
    });
  }

  const sitemapUrls = await fetchSitemap(startUrl).catch(() => []);
  if (sitemapUrls.length > 0) {
    sitemapUsed = true;
    queue.push(...sitemapUrls.slice(0, MAX_PAGES));
  }
  if (queue.length === 0) {
    queue.push(startUrl.href);
  }

  const worker = async () => {
    while (queue.length > 0) {
      if (controller.signal.aborted) break;
      if (Date.now() - start >= TOTAL_TIMEOUT_MS) {
        limitReached = true;
        controller.abort();
        break;
      }
      if (pages.length >= MAX_PAGES) break;
      const next = queue.shift();
      if (!next || visited.has(next)) continue;
      visited.add(next);

      if (totalBytes >= MAX_TOTAL_BYTES) {
        limitReached = true;
        break;
      }

      const fetchStart = Date.now();
      let pageRecord: CrawlPage | null = null;
      try {
        pageRecord = await fetchPage(next, {
          signal: controller.signal,
          timeoutMs: REQUEST_TIMEOUT_MS,
        });
      } catch (error) {
        pageRecord = {
          url: next,
          status: null,
          content: '',
          bytes: 0,
          etag: undefined,
          lastModified: undefined,
          contentHash: hashString(''),
          fetchedAt: new Date().toISOString(),
          error: (error as Error).message,
        };
      }

      if (!pageRecord) continue;

      if (totalBytes + pageRecord.bytes > MAX_TOTAL_BYTES) {
        const allowed = MAX_TOTAL_BYTES - totalBytes;
        if (allowed <= 0) {
          limitReached = true;
          break;
        }
        pageRecord.content = truncateToBytes(pageRecord.content, allowed);
        pageRecord.bytes = byteLength(pageRecord.content);
        pageRecord.contentHash = hashString(pageRecord.content);
        limitReached = true;
      }

      pages.push(pageRecord);
      totalBytes += pageRecord.bytes;

      if (options.earlyStop && options.earlyStop(pageRecord)) {
        earlyStopTriggered = true;
        controller.abort();
        break;
      }

      if (
        !sitemapUsed &&
        pages.length < MAX_PAGES &&
        pageRecord.status &&
        pageRecord.status >= 200 &&
        pageRecord.status < 400 &&
        !limitReached
      ) {
        const internalLinks = extractLinks(pageRecord.content, startUrl.origin);
        for (const link of internalLinks) {
          if (
            !visited.has(link) &&
            !queue.includes(link) &&
            visited.size + queue.length < MAX_PAGES
          ) {
            queue.push(link);
          }
        }
      }

      const elapsed = Date.now() - fetchStart;
      if (elapsed < 50) {
        await delay(50 - elapsed);
      }
    }
  };

  const workerCount = Math.min(MAX_CONCURRENCY, queue.length || 1);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return {
    origin: startUrl.origin,
    pages,
    totalBytes,
    totalDurationMs: Date.now() - start,
    sitemapUsed,
    earlyStopTriggered,
    limitReached,
  };
}

async function fetchPage(
  url: string,
  options: { signal: AbortSignal; timeoutMs: number },
): Promise<CrawlPage> {
  const controller = new AbortController();
  const timeout = AbortSignal.timeout(options.timeoutMs);
  const signal = AbortSignal.any([options.signal, timeout, controller.signal]);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html, */*;q=0.8' },
      signal,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    const text = decodeBody(buffer, response.headers.get('content-type'));
    const normalized = normalizeHtml(text);
    const page: CrawlPage = {
      url,
      status: response.status,
      content: normalized,
      bytes: buffer.byteLength,
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      contentHash: hashString(normalized),
      fetchedAt: new Date().toISOString(),
    };

    return page;
  } finally {
    controller.abort();
  }
}

async function fetchSitemap(baseUrl: URL): Promise<string[]> {
  const sitemapCandidates = [
    new URL('/sitemap.xml', baseUrl).href,
    new URL('/sitemap_index.xml', baseUrl).href,
  ];

  for (const candidate of sitemapCandidates) {
    try {
      const response = await fetch(candidate, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) continue;
      const text = await response.text();
      const urls = Array.from(text.matchAll(/<loc>(.*?)<\/loc>/gi))
        .map((match) => match[1])
        .filter((loc) => isSameOrigin(loc, baseUrl.origin));
      if (urls.length > 0) {
        return urls.slice(0, MAX_PAGES);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        continue;
      }
    }
  }
  return [];
}

function normalizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/?[a-z][\s\S]*?>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLinks(html: string, origin: string): string[] {
  const links = new Set<string>();
  const pattern = /href=["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const candidate = match[1];
    try {
      const absolute = new URL(candidate, origin);
      if (absolute.origin === origin) {
        links.add(absolute.href);
      }
    } catch {
      // ignore invalid URLs
    }
    if (links.size >= MAX_PAGES) break;
  }
  return Array.from(links);
}

function decodeBody(buffer: Buffer, contentType: string | null): string {
  if (!contentType || /charset=utf-8/i.test(contentType)) {
    return buffer.toString('utf-8');
  }
  if (/charset=iso-8859-1/i.test(contentType)) {
    return buffer.toString('latin1');
  }
  return buffer.toString('utf-8');
}

function normalizeUrl(input: string): URL {
  const url = new URL(input);
  url.hash = '';
  return url;
}

function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function truncateToBytes(text: string, maxBytes: number): string {
  let sliced = text;
  while (byteLength(sliced) > maxBytes) {
    sliced = sliced.slice(0, Math.floor(sliced.length * 0.9));
  }
  return sliced;
}

function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf-8');
}

function isSameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}
