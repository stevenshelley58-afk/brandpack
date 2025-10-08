"use client";

import { useState } from "react";

export default function ReviewPage() {
  const [pastedContent, setPastedContent] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = pastedContent.trim();
    if (trimmed.length === 0) {
      setError("Paste content from the site first.");
      setStatus(null);
      return;
    }
    if (trimmed.length < 120) {
      setError("Add a bit more detail so the kernel has real material to compress.");
      setStatus(null);
      return;
    }
    setError(null);
    sessionStorage.setItem("brandpack:pasted-content", trimmed);
    setStatus("Pasted content captured. Kernel compression step will use this fallback.");
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          Review Stage
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">
          Gather brand signals
        </h1>
        <p className="text-sm text-gray-600">
          The scraper will respect the strict crawl caps (6 pages, 300KB, 4 concurrent, 5s per request, 15s total). If live crawling can&apos;t run, paste the key website content below to keep moving.
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Manual paste fallback</h2>
              <p className="text-sm text-gray-600">
                Drop hero copy, product descriptions, pricing bullets, testimonials—anything public-facing that defines the brand.
              </p>
            </div>
            <button
              type="button"
              className="cursor-not-allowed rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-400"
              disabled
              title="File uploads coming soon"
            >
              Upload doc (soon)
            </button>
          </div>

          <textarea
            className="h-60 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste website sections, pricing tables, testimonials, and positioning statements..."
            value={pastedContent}
            onChange={(event) => setPastedContent(event.target.value)}
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={handleSubmit}
            >
              Continue with pasted content
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled
            >
              Run crawler (coming soon)
            </button>
          </div>

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
          {status ? (
            <p className="text-sm text-green-700">{status}</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          Crawl constraints (spec-compliant)
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Max 6 pages per crawl, 300 KB combined content.</li>
          <li>4 concurrent fetches, 5 second request timeout, 15 second global budget.</li>
          <li>Sitemap-first discovery with internal link fallback.</li>
          <li>Automatic early stop once the kernel has enough validated signals.</li>
        </ul>
      </section>
    </div>
  );
}
