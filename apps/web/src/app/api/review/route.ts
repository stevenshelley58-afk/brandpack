/**
 * POST /api/review
 * 
 * Generates review brief from brand kernel
 * 
 * Request body:
 * {
 *   "kernel": { ... },
 *   "run_id": "optional-run-id"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "review": {
 *     "tone": ["confident", "technical"],
 *     "voice": ["concise", "evidence-led"],
 *     "proof_points": ["99.9% uptime", "SOC 2"],
 *     "pricing_cues": ["Starts at $99"],
 *     "target_audience": "Mid-market IT buyers",
 *     "citations": ["home", "pricing"]
 *   },
 *   "validation": { ... },
 *   "audit": { ... }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildScrapeReviewSpec,
  runTask,
  validateTaskOutput,
  type KernelPayload,
} from '@brandpack/core';
import { loadPromptsConfig } from '@brandpack/core/config';
import { routeSpec } from '@brandpack/adapters';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kernel, run_id } = body;

    if (!kernel || typeof kernel !== 'object') {
      return NextResponse.json(
        { success: false, error: 'kernel is required and must be an object' },
        { status: 400 }
      );
    }

    // Load config
    const config = await loadPromptsConfig();

    // Debug logging
    console.log('[/api/review] OPENAI_API_KEY present?', !!process.env.OPENAI_API_KEY);
    console.log('[/api/review] Config provider:', config.calls['scrape.review_summarize']?.model?.provider);

    // Build spec
    const spec = buildScrapeReviewSpec(
      config,
      kernel as KernelPayload,
      run_id
    );

    // Execute through orchestrator
    const result = await runTask(
      spec,
      config,
      async (spec, provider) => routeSpec(spec, provider),
      (taskId, outputs, config) => validateTaskOutput(taskId, outputs, config)
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task execution failed',
          validation: result.validation,
          audit: result.audit,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      review: result.outputs[0],
      validation: result.validation,
      audit: result.audit,
    });

  } catch (error) {
    console.error('[/api/review] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

