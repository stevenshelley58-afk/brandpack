/**
 * POST /api/ideas
 * 
 * Generates 20 campaign ideas from brand kernel
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
 *   "ideas": [...],
 *   "validation": { ... },
 *   "audit": { ... }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildIdeasGenerateSpec,
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

    // Build spec
    const spec = buildIdeasGenerateSpec(
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
      ideas: result.outputs,
      validation: result.validation,
      audit: result.audit,
    });

  } catch (error) {
    console.error('[/api/ideas] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

