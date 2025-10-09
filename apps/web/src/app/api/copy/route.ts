/**
 * POST /api/copy
 * 
 * Generates 5 copy blocks from selected idea
 * 
 * Request body:
 * {
 *   "kernel": { ... },
 *   "idea": { ... },
 *   "run_id": "optional-run-id"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "copy": { hook: {...}, context: {...}, proof: {...}, objection: {...}, cta: {...} },
 *   "validation": { ... },
 *   "audit": { ... }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildCopyGenerateSpec,
  runTask,
  validateTaskOutput,
  type KernelPayload,
} from '@brandpack/core';
import { loadPromptsConfig } from '@brandpack/core/config';
import { routeSpec } from '@brandpack/adapters';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kernel, idea, run_id } = body;

    if (!kernel || typeof kernel !== 'object') {
      return NextResponse.json(
        { success: false, error: 'kernel is required and must be an object' },
        { status: 400 }
      );
    }

    if (!idea || typeof idea !== 'object') {
      return NextResponse.json(
        { success: false, error: 'idea is required and must be an object' },
        { status: 400 }
      );
    }

    // Load config
    const config = await loadPromptsConfig();

    // Build spec
    const spec = buildCopyGenerateSpec(
      config,
      kernel as KernelPayload,
      idea as Record<string, unknown>,
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
      copy: result.outputs[0],
      validation: result.validation,
      audit: result.audit,
    });

  } catch (error) {
    console.error('[/api/copy] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

