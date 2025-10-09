/**
 * GET /api/config - Load current prompts.json configuration
 * POST /api/config - Save updated prompts.json configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs, accessSync } from 'node:fs';
import path from 'node:path';
import { clearConfigCache } from '@brandpack/core/config';

// Find workspace root
function findWorkspaceRoot(): string {
  let current = process.cwd();
  const maxLevelsUp = 5;

  for (let i = 0; i < maxLevelsUp; i++) {
    const configPath = path.join(current, 'data', 'config', 'prompts.json');
    try {
      accessSync(configPath);
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  return process.cwd();
}

const CONFIG_PATH = path.join(findWorkspaceRoot(), 'data', 'config', 'prompts.json');

export async function GET() {
  try {
    const contents = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(contents);
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('[/api/config GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.global || !body.calls) {
      return NextResponse.json(
        { error: 'Invalid configuration structure' },
        { status: 400 }
      );
    }

    // Add updated_at timestamp
    body.updated_at = new Date().toISOString();

    // Write to file with pretty formatting
    await fs.writeFile(
      CONFIG_PATH,
      JSON.stringify(body, null, 2),
      'utf-8'
    );

    // Clear the config cache so next API call loads the new config
    clearConfigCache();
    console.log('[/api/config POST] Config saved and cache cleared');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/config POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

