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
import Link from 'next/link';

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

interface TraceEntry {
  timestamp: string;
  task_id: string;
  provider: string;
  model: string;
  duration_ms: number;
  cost_usd: number;
  status: 'success' | 'error';
  validation_passed: boolean;
  outputs_count: number;
}

export default function ControlCenter() {
  const [config, setConfig] = useState<PromptsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);

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

  // Load recent traces
  const loadTraces = async () => {
    setTracesLoading(true);
    try {
      // For now, we'll create mock traces based on recent activity
      // In a real implementation, this would query a database or log store
      const mockTraces: TraceEntry[] = [
        {
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          task_id: 'scrape.review_summarize',
          provider: 'openai',
          model: 'gpt-4o-mini',
          duration_ms: 722,
          cost_usd: 0.0012,
          status: 'success',
          validation_passed: true,
          outputs_count: 1
        },
        {
          timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
          task_id: 'ideas.generate',
          provider: 'openai',
          model: 'gpt-4o-mini',
          duration_ms: 452,
          cost_usd: 0.0034,
          status: 'success',
          validation_passed: true,
          outputs_count: 20
        },
        {
          timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
          task_id: 'copy.generate',
          provider: 'openai',
          model: 'gpt-4o-mini',
          duration_ms: 349,
          cost_usd: 0.0021,
          status: 'success',
          validation_passed: true,
          outputs_count: 5
        }
      ];
      setTraces(mockTraces);
    } catch (error) {
      console.error('Failed to load traces:', error);
    } finally {
      setTracesLoading(false);
    }
  };

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

  const taskNames = Object.keys(config.calls);

  const toggleCard = (taskId: string) => {
    setExpandedCards(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const updateTaskConfig = (taskId: string, updates: Partial<TaskConfig>) => {
    setConfig({
      ...config,
      calls: {
        ...config.calls,
        [taskId]: {
          ...config.calls[taskId],
          ...updates,
        }
      }
    });
  };

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

        {/* Recent Traces */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              📊 Recent Traces
            </h2>
            <button
              onClick={loadTraces}
              disabled={tracesLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {tracesLoading ? 'Loading...' : 'Refresh Traces'}
            </button>
          </div>
          
          {traces.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No traces available. Click &quot;Refresh Traces&quot; to load recent activity.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {traces.map((trace, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {trace.task_id.includes('scrape') ? '🌐' : 
                         trace.task_id.includes('review') ? '📋' :
                         trace.task_id.includes('ideas') ? '💡' :
                         trace.task_id.includes('copy') ? '📝' :
                         trace.task_id.includes('brief') ? '🎨' : '🖼️'}
                      </span>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {trace.task_id}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {trace.provider} • {trace.model}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        trace.status === 'success' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {trace.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        trace.validation_passed 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {trace.validation_passed ? '✓ Valid' : '⚠ Issues'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                      <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                        {trace.duration_ms}ms
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Cost:</span>
                      <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                        ${trace.cost_usd.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Outputs:</span>
                      <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                        {trace.outputs_count}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Time:</span>
                      <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                        {new Date(trace.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Cards - One per LLM Call */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Task Configurations ({taskNames.length} LLM Calls)
          </h2>
          <div className="space-y-4">
            {taskNames.map(taskId => {
              const taskConfig = config.calls[taskId];
              const isExpanded = expandedCards[taskId];
              
              return (
                <div key={taskId} className="bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-800 overflow-hidden">
                  {/* Card Header - Always Visible */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => toggleCard(taskId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {taskId.includes('scrape') ? '🌐' : 
                           taskId.includes('review') ? '📋' :
                           taskId.includes('ideas') ? '💡' :
                           taskId.includes('copy') ? '📝' :
                           taskId.includes('brief') ? '🎨' : '🖼️'}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {taskId}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {taskConfig.model.provider} • {taskConfig.model.name} • temp: {taskConfig.model.temperature}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {taskConfig.model.max_tokens} tokens
                        </span>
                        <span className="text-2xl text-gray-400">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body - Expandable */}
                  {isExpanded && (
                    <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                      {/* Model Settings */}
                      <div className="mb-6">
                        <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">⚙️ Model Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Provider
                            </label>
                            <select
                              value={taskConfig.model.provider}
                              onChange={(e) => updateTaskConfig(taskId, {
                                model: { ...taskConfig.model, provider: e.target.value as Provider }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
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
                              onChange={(e) => updateTaskConfig(taskId, {
                                model: { ...taskConfig.model, name: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
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
                              onChange={(e) => updateTaskConfig(taskId, {
                                model: { ...taskConfig.model, temperature: parseFloat(e.target.value) }
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
                              onChange={(e) => updateTaskConfig(taskId, {
                                model: { ...taskConfig.model, max_tokens: parseInt(e.target.value) }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Prompts */}
                      <div className="mb-6">
                        <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">💬 Prompts</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              System Prompt
                            </label>
                            <textarea
                              value={taskConfig.prompt.system}
                              onChange={(e) => updateTaskConfig(taskId, {
                                prompt: { ...taskConfig.prompt, system: e.target.value }
                              })}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              User Template
                            </label>
                            <textarea
                              value={taskConfig.prompt.user_template}
                              onChange={(e) => updateTaskConfig(taskId, {
                                prompt: { ...taskConfig.prompt, user_template: e.target.value }
                              })}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Runtime Settings */}
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">⏱️ Runtime Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Timeout (ms)
                            </label>
                            <input
                              type="number"
                              value={taskConfig.runtime.timeout_ms}
                              onChange={(e) => updateTaskConfig(taskId, {
                                runtime: { ...taskConfig.runtime, timeout_ms: parseInt(e.target.value) }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Max Retries
                            </label>
                            <input
                              type="number"
                              value={taskConfig.runtime.max_retries}
                              onChange={(e) => updateTaskConfig(taskId, {
                                runtime: { ...taskConfig.runtime, max_retries: parseInt(e.target.value) }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
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
                              onChange={(e) => updateTaskConfig(taskId, {
                                runtime: { ...taskConfig.runtime, cost_usd_limit: parseFloat(e.target.value) }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
          <Link
            href="/"
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            ← Back to App
          </Link>
        </div>
      </div>
    </div>
  );
}

