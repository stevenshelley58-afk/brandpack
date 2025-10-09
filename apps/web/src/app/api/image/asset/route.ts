/**
 * POST /api/image/asset
 * 
 * Generates actual image from approved brief
 * 
 * Request body:
 * {
 *   "brief": {
 *     "aspect_ratio": "4:5",
 *     "safe_zone_top": 0.15,
 *     "safe_zone_bottom": 0.15,
 *     "visual_direction": "...",
 *     "focal_point": "...",
 *     "copy_overlay_guidance": "...",
 *     "evidence_keys": [...]
 *   },
 *   "run_id": "optional-run-id"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "asset": {
 *     "url": "https://cdn.supabase.co/.../asset.png",
 *     "thumbnail_url": "...",
 *     "provider": "noop-image",
 *     "model": "noop-image-v1",
 *     "metadata": {
 *       "resolution": "1024x1280",
 *       "aspect_ratio": "4:5",
 *       "file_size_kb": 42,
 *       "format": "png"
 *     },
 *     "cost_usd": 0,
 *     "duration_ms": 0
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { routeImageGeneration } from '@brandpack/adapters';
import type { ImageBrief, ImageConfig } from '@brandpack/core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brief, run_id } = body;

    if (!brief || typeof brief !== 'object') {
      return NextResponse.json(
        { success: false, error: 'brief is required and must be an object' },
        { status: 400 }
      );
    }

    // Validate required brief fields
    if (!brief.aspect_ratio) {
      return NextResponse.json(
        { success: false, error: 'brief.aspect_ratio is required' },
        { status: 400 }
      );
    }

    // Build image config from brief
    const imageConfig: ImageConfig = {
      provider: 'noop-image', // TODO: Make this configurable
      model: 'noop-image-v1',
      resolution: brief.aspect_ratio === '4:5' ? '1024x1280' : '1024x1024',
      aspect_ratio: brief.aspect_ratio,
      format: 'png',
      quality: 90,
    };

    // Build image brief for adapter
    const imageBrief: ImageBrief = {
      id: run_id || `brief_${Date.now()}`,
      prompt: brief.visual_direction || 'Generate image based on brief',
      style: 'professional',
      mood: 'confident',
      composition: brief.focal_point || 'centered',
      aspect_ratio: brief.aspect_ratio,
    };

    // Generate image through adapter
    const result = await routeImageGeneration(
      imageBrief,
      imageConfig,
      'noop-image' // TODO: Get from config
    );

    return NextResponse.json({
      success: true,
      asset: result,
    });

  } catch (error) {
    console.error('[/api/image/asset] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

