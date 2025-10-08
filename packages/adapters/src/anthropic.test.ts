import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AnthropicAdapter } from './anthropic';
import type { LLMSpec } from '@brandpack/core';
import { AdapterError } from '@brandpack/core';

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn()
      }
    }))
  };
});

const createAdapter = () => new AnthropicAdapter({ apiKey: 'test-key', model: 'claude-3-haiku-20240307' });

describe('AnthropicAdapter mapSpecToAnthropic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets json response_format for json specs', () => {
    const adapter = createAdapter();
    const spec: LLMSpec = {
      task_id: 'json_task',
      system_prompt: 'system',
      user_prompt: 'user',
      response_format: 'json',
      constraints: {}
    };

    const params = (adapter as any).mapSpecToAnthropic(spec);
    expect((params as any).response_format).toEqual({ type: 'json' });
  });

  it('sets json schema response_format for structured specs', () => {
    const adapter = createAdapter();
    const spec: LLMSpec = {
      task_id: 'structured_task',
      system_prompt: 'system',
      user_prompt: 'user',
      response_format: 'structured',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      },
      constraints: {}
    };

    const params = (adapter as any).mapSpecToAnthropic(spec);
    expect((params as any).response_format).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'structured_task',
        schema: spec.schema
      }
    });
  });
});

describe('AnthropicAdapter extractOutputs', () => {
  const baseResponse = {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-3-haiku-20240307',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 20 }
  } as const;

  it('returns structured payload from tool blocks', () => {
    const adapter = createAdapter();
    const response = {
      ...baseResponse,
      content: [
        {
          type: 'tool_use',
          id: 'tool_1',
          name: 'json_schema_response',
          input: {
            summary: 'ok'
          }
        }
      ]
    } as any;

    const outputs = (adapter as any).extractOutputs(response, 'structured');
    expect(outputs).toEqual(['{"summary":"ok"}']);
  });

  it('throws AdapterError when structured payload is malformed', () => {
    const adapter = createAdapter();
    const response = {
      ...baseResponse,
      content: [
        {
          type: 'text',
          text: 'not json'
        }
      ]
    } as any;

    expect(() => (adapter as any).extractOutputs(response, 'structured')).toThrow(AdapterError);
  });
});
