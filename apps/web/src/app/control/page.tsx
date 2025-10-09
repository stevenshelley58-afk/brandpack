/**
 * Control Center - Settings & Configuration Management
 * 
 * Allows editing:
 * - Prompts for each task (system, user_template)
 * - Model settings (provider, name, temperature, max_tokens)
 * - Validation rules (banned phrases)
 * - Runtime settings (timeouts, retries, cost limits)
 */

'use client';

import { useState, useEffect } from 'react';

type Provider = 'anthropic' | 'openai' | 'noop-llm';

interface TaskConfig {
  model: {
    provider: Provider;
    name: string;
    temperature: number;
    max_tokens: number;
  };
  prompt: {
    system: string;
    user_template: string;
  };
  runtime: {
    timeout_ms: number;
    max_retries: number;
    cost_usd_limit: number;
  };
}

interface PromptsConfig {
  global: {
    provider: Provider;
  };
  calls: {
    [taskId: string]: TaskConfig;
  };
  validation?: {
    banned_phrases?: string[];
  };
}

export default function ControlCenter() {
  const [config, setConfig] = useState<PromptsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>('ideas.generate');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load current config
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load config:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to save config');
      }

      setMessage({ type: 'success', text: 'Configuration saved successfully!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save configuration' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading configuration...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400">Failed to load configuration</div>
      </div>
    );
  }

  const taskConfig = config.calls[selectedTask];
  const taskNames = Object.keys(config.calls);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            ⚙️ Control Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage prompts, model settings, and validation rules
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Global Settings */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Global Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Provider
              </label>
              <select
                value={config.global.provider}
                onChange={(e) => setConfig({
                  ...config,
                  global: { ...config.global, provider: e.target.value as Provider }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="noop-llm">Noop (Testing)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task Selection */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Task Configuration
          </h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Task
            </label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {taskNames.map(taskId => (
                <option key={taskId} value={taskId}>{taskId}</option>
              ))}
            </select>
          </div>

          {/* Model Settings */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Model Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Provider
                </label>
                <select
                  value={taskConfig.model.provider}
                  onChange={(e) => setConfig({
                    ...config,
                    calls: {
                      ...config.calls,
                      [selectedTask]: {
                        ...taskConfig,
                        model: { ...taskConfig.model, provider: e.target.value as Provider }
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="noop-llm">Noop</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model Name
                </label>
                <input
                  type="text"
                  value={taskConfig.model.name}
                  onChange={(e) => setConfig({
                    ...config,
                    calls: {
                      ...config.calls,
                      [selectedTask]: {
                        ...taskConfig,
                        model: { ...taskConfig.model, name: e.target.value }
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="gpt-4o-mini"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temperature ({taskConfig.model.temperature})
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={taskConfig.model.temperature}
                  onChange={(e) => setConfig({
                    ...config,
                    calls: {
                      ...config.calls,
                      [selectedTask]: {
                        ...taskConfig,
                        model: { ...taskConfig.model, temperature: parseFloat(e.target.value) }
                      }
                    }
                  })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={taskConfig.model.max_tokens}
                  onChange={(e) => setConfig({
                    ...config,
                    calls: {
                      ...config.calls,
                      [selectedTask]: {
                        ...taskConfig,
                        model: { ...taskConfig.model, max_tokens: parseInt(e.target.value) }
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Prompts */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Prompts</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  System Prompt
                </label>
                <textarea
                  value={taskConfig.prompt.system}
                  onChange={(e) => setConfig({
                    ...config,
                    calls: {
                      ...config.calls,
                      [selectedTask]: {
                        ...taskConfig,
                        prompt: { ...taskConfig.prompt, system: e.target.value }
                      }
                    }
                  })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  User Template
                </label>
                <textarea
                  value={taskConfig.prompt.user_template}
                  onChange={(e) => setConfig({
                    ...config,
                    calls: {
                      ...config.calls,
                      [selectedTask]: {
                        ...taskConfig,
                        prompt: { ...taskConfig.prompt, user_template: e.target.value }
                      }
                    }
                  })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Runtime Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Runtime Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  value={taskConfig.runtime.timeout_ms}
                  onChange={(e) => setConfig({
                    ...config,
                    calls: {
                      ...config.calls,
                      [selectedTask]: {
                        ...taskConfig,
                        runtime: { ...taskConfig.runtime, timeout_ms: parseInt(e.target.value) }
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Retries
                </label>
                <input
                  type="number"
                  value={taskConfig.runtime.max_retries}
                  onChange={(e) => setConfig({
                    ...config,
                    calls: {
                      ...config.calls,
                      [selectedTask]: {
                        ...taskConfig,
                        runtime: { ...taskConfig.runtime, max_retries: parseInt(e.target.value) }
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cost Limit (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={taskConfig.runtime.cost_usd_limit}
                  onChange={(e) => setConfig({
                    ...config,
                    calls: {
                      ...config.calls,
                      [selectedTask]: {
                        ...taskConfig,
                        runtime: { ...taskConfig.runtime, cost_usd_limit: parseFloat(e.target.value) }
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Validation Rules */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Validation Rules
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Banned Phrases (comma-separated)
            </label>
            <textarea
              value={config.validation?.banned_phrases?.join(', ') || ''}
              onChange={(e) => setConfig({
                ...config,
                validation: {
                  ...config.validation,
                  banned_phrases: e.target.value.split(',').map(p => p.trim()).filter(Boolean)
                }
              })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
              placeholder="synergy, leverage, paradigm"
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {config.validation?.banned_phrases?.length || 0} phrases configured
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          <a
            href="/"
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            ← Back to App
          </a>
        </div>
      </div>
    </div>
  );
}

