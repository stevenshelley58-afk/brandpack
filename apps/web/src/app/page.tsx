/**
 * Brand Pack - Progressive Workflow
 * 
 * Single-page progressive disclosure:
 * 1. Enter domain → Scrape
 * 2. View kernel → Generate ideas
 * 3. Select idea → Generate copy
 * 4. Generate image brief
 */

'use client';

import { useState } from 'react';

type Step = 'scrape' | 'review' | 'ideas' | 'copy' | 'image' | 'complete';

interface KernelData {
  domain: string;
  content_hash: string;
  products: string[];
  tone: string[];
  audience: string;
  proof_points: {
    customers: string[];
    metrics: string[];
    certifications: string[];
  };
  pricing_cues: {
    tiers: string[];
    positioning: string;
  };
  competitors_implied: string[];
  unique_angle: string;
  compressed_kb: number;
  citations: Record<string, string>;
  created_at: string;
}

interface Idea {
  headline: string;
  angle: string;
  audience: string;
  format: string;
  supporting_evidence_keys: string[];
}

interface CopyBlock {
  text: string;
  character_count: number;
  evidence_keys: string[];
}

interface CopyOutput {
  hook: CopyBlock;
  context: CopyBlock;
  proof: CopyBlock;
  objection: CopyBlock;
  cta: CopyBlock;
}

interface ImageBrief {
  aspect_ratio: string;
  safe_zone_top: number;
  safe_zone_bottom: number;
  visual_direction: string;
  focal_point: string;
  copy_overlay_guidance: string;
  evidence_keys: string[];
}

interface Review {
  tone: string[];
  voice: string[];
  proof_points: string[];
  pricing_cues: string[];
  target_audience: string;
  citations: string[];
}

export default function Home() {
  const [step, setStep] = useState<Step>('scrape');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kernel, setKernel] = useState<KernelData | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [copy, setCopy] = useState<CopyOutput | null>(null);
  const [imageBrief, setImageBrief] = useState<ImageBrief | null>(null);

  const handleScrape = async () => {
    if (!domain.trim()) {
      setError('Please enter a domain');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Scrape failed');
      }

      setKernel(data.kernel);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scrape domain');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReview = async () => {
    if (!kernel) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kernel }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Review generation failed');
      }

      setReview(data.review);
      setStep('ideas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate review');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!kernel) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kernel }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Ideas generation failed');
      }

      setIdeas(data.ideas);
      setStep('copy');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate ideas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIdea = async (idea: Idea) => {
    if (!kernel) return;

    setSelectedIdea(idea);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kernel, idea }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Copy generation failed');
      }

      setCopy(data.copy);
      setStep('image');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate copy');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImageBrief = async () => {
    if (!kernel || !selectedIdea) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/image/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kernel, idea: selectedIdea }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Image brief generation failed');
      }

      setImageBrief(data.brief);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image brief');
    } finally {
      setLoading(false);
    }
  };

  // Helper to render evidence badges
  const EvidenceBadge = ({ keys }: { keys: string[] }) => {
    if (!keys || keys.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {keys.map((key, i) => (
          <span
            key={i}
            className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded border border-amber-200 dark:border-amber-800"
            title={`Evidence: ${key}`}
          >
            📎 {key}
          </span>
        ))}
      </div>
    );
  };

  // Tab navigation helper
  const completedSteps = {
    scrape: !!kernel,
    review: !!review,
    ideas: ideas.length > 0,
    copy: !!copy,
    image: !!imageBrief,
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Brand Pack
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Turn your website into marketing assets. Progressive, evidence-driven, audit-ready.
          </p>
        </header>

        {/* Step Navigation */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {(['scrape', 'review', 'ideas', 'copy', 'image'] as const).map((s, i) => {
            const isComplete = completedSteps[s];
            const isCurrent = step === s;
            const isDisabled = !isComplete && !isCurrent;
            
            return (
              <button
                key={s}
                onClick={() => isComplete && setStep(s)}
                disabled={isDisabled}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                  ${isCurrent ? 'bg-blue-600 text-white' : ''}
                  ${isComplete && !isCurrent ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/40' : ''}
                  ${isDisabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : ''}
                `}
              >
                {isComplete && !isCurrent && '✓ '}
                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Scrape */}
        {step === 'scrape' && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Step 1: Enter Your Domain
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We&apos;ll scrape up to 6 pages and compress into a brand kernel (≤2KB).
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                  placeholder="example.com"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  disabled={loading}
                />
                <button
                  onClick={handleScrape}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  {loading ? 'Scraping...' : 'Scrape & Analyze'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review - Generate Brand Summary */}
        {step === 'review' && kernel && (
          <div className="space-y-6">
            {!review ? (
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                    ✓ Brand Kernel Generated
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Domain: {kernel.domain} • Size: {kernel.compressed_kb.toFixed(2)} KB
                  </p>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Step 2: Generate Brand Review
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Extract tone, voice, proof points, and audience from your brand kernel.
                </p>
                <button
                  onClick={handleGenerateReview}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  {loading ? 'Generating...' : 'Generate Review'}
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Brand Review
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tone
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {review.tone.map((t, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Voice
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {review.voice.map((v, i) => (
                        <span key={i} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target Audience
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{review.target_audience}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Proof Points
                    </label>
                    <ul className="list-disc list-inside space-y-1">
                      {review.proof_points.map((p, i) => (
                        <li key={i} className="text-gray-700 dark:text-gray-300 text-sm">{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Pricing Cues
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {review.pricing_cues.map((pc, i) => (
                        <span key={i} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm">
                          {pc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setStep('ideas')}
                  className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Continue to Ideas
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Show Kernel & Generate Ideas */}
        {step === 'ideas' && kernel && (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                ✓ Brand Kernel Generated
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Domain: {kernel.domain} • Size: {kernel.compressed_kb.toFixed(2)} KB
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Step 3: Generate 20 Campaign Ideas
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Each idea will cite evidence from your brand kernel.
              </p>
              <button
                onClick={handleGenerateIdeas}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Ideas'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Show Ideas & Select One */}
        {step === 'copy' && ideas.length > 0 && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Step 4: Select an Idea
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {ideas.length} ideas generated. Click one to generate copy.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ideas.map((idea, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectIdea(idea)}
                    disabled={loading}
                    className="text-left p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors disabled:opacity-50"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {idea.headline}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{idea.angle}</p>
                    <div className="flex flex-wrap gap-2 text-xs mb-2">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        {idea.audience}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        {idea.format}
                      </span>
                    </div>
                    <EvidenceBadge keys={idea.supporting_evidence_keys} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Show Copy & Generate Image Brief */}
        {step === 'image' && copy && selectedIdea && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Step 5: Copy Generated
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                5 sequential blocks for: {selectedIdea.headline}
              </p>
              <div className="space-y-4 mb-6">
                {(['hook', 'context', 'proof', 'objection', 'cta'] as const).map((blockName) => {
                  const block = copy[blockName];
                  return (
                    <div key={blockName} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                          {blockName}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {block.character_count} chars
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
                        {block.text}
                      </p>
                      <EvidenceBadge keys={block.evidence_keys} />
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleGenerateImageBrief}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Image Brief'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Complete - Show Image Brief */}
        {step === 'complete' && imageBrief && (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                ✓ Complete!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                All assets generated successfully.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Image Brief
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Aspect Ratio
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{imageBrief.aspect_ratio}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Safe Zones
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    Top: {(imageBrief.safe_zone_top * 100).toFixed(0)}% • 
                    Bottom: {(imageBrief.safe_zone_bottom * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Visual Direction
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{imageBrief.visual_direction}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Focal Point
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{imageBrief.focal_point}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Copy Overlay Guidance
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{imageBrief.copy_overlay_guidance}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setStep('scrape');
                  setDomain('');
                  setKernel(null);
                  setReview(null);
                  setIdeas([]);
                  setSelectedIdea(null);
                  setCopy(null);
                  setImageBrief(null);
                }}
                className="mt-6 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Start New Pack
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

