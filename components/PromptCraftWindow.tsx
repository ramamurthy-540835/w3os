'use client';

import React, { useState, useEffect } from 'react';
import {
  Domain,
  PromptStrategy,
  PromptTemplate,
  OptimizedPrompt,
  getDomainTemplates,
  getAllTemplates,
  optimizePrompt,
  validatePrompt,
  PromptValidation,
} from '@/lib/promptcraft';

interface PromptCraftWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

export default function PromptCraftWindow({
  windowId,
  onStateChange,
}: PromptCraftWindowProps) {
  const [selectedDomain, setSelectedDomain] = useState<Domain>('general');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [strategy, setStrategy] = useState<PromptStrategy>('instruction');
  const [constraints, setConstraints] = useState<string[]>([]);
  const [constraintInput, setConstraintInput] = useState('');
  const [optimizedPrompt, setOptimizedPrompt] = useState<OptimizedPrompt | null>(null);
  const [validation, setValidation] = useState<PromptValidation | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'optimize' | 'templates'>('builder');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [copied, setCopied] = useState(false);

  const domains: Domain[] = ['general', 'banking', 'healthcare', 'retail', 'architecture'];
  const strategies: PromptStrategy[] = ['instruction', 'chain-of-thought', 'few-shot', 'rag', 'hybrid'];

  useEffect(() => {
    const domainTemplates = getDomainTemplates(selectedDomain);
    setTemplates(domainTemplates);
    setSelectedTemplate(null);
  }, [selectedDomain]);

  useEffect(() => {
    if (task) {
      const val = validatePrompt(task);
      setValidation(val);
    }
  }, [task]);

  const addConstraint = () => {
    if (constraintInput.trim()) {
      setConstraints([...constraints, constraintInput.trim()]);
      setConstraintInput('');
    }
  };

  const removeConstraint = (index: number) => {
    setConstraints(constraints.filter((_, i) => i !== index));
  };

  const handleOptimize = () => {
    if (!task) {
      alert('Please enter a task to optimize');
      return;
    }

    const optimized = optimizePrompt({
      domain: selectedDomain,
      task,
      context: context || undefined,
      strategy,
      constraints: constraints.length > 0 ? constraints : undefined,
    });

    setOptimizedPrompt(optimized);
    setActiveTab('optimize');
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setTask(template.template);
      setStrategy(template.strategies[0]);
      setActiveTab('builder');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const useInAI = () => {
    if (!optimizedPrompt) return;

    localStorage.setItem('w3-pending-prompt', optimizedPrompt.optimized);
    window.dispatchEvent(
      new CustomEvent('w3-prompt-ready', {
        detail: {
          prompt: optimizedPrompt.optimized,
          model: optimizedPrompt.llmRecommendations[0]?.model,
          domain: selectedDomain,
          strategy,
        },
      })
    );

    alert('✅ Prompt loaded! Switch to AI Assistant to use it.');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700 bg-slate-900">
        {(['builder', 'optimize', 'templates'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-amber-500 text-amber-400 bg-slate-800'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab === 'builder' && '✏️ Builder'}
            {tab === 'optimize' && '⚡ Optimize'}
            {tab === 'templates' && '📋 Templates'}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* BUILDER TAB */}
        {activeTab === 'builder' && (
          <>
            {/* Domain Selection */}
            <div>
              <label className="block text-sm font-semibold text-amber-400 mb-2">Domain</label>
              <div className="grid grid-cols-3 gap-2">
                {domains.map((domain) => (
                  <button
                    key={domain}
                    onClick={() => setSelectedDomain(domain)}
                    className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                      selectedDomain === domain
                        ? 'bg-amber-500 text-black'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {domain.charAt(0).toUpperCase() + domain.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy Selection */}
            <div>
              <label className="block text-sm font-semibold text-amber-400 mb-2">Strategy</label>
              <div className="grid grid-cols-3 gap-2">
                {strategies.map((strat) => (
                  <button
                    key={strat}
                    onClick={() => setStrategy(strat)}
                    className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                      strategy === strat
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {strat === 'chain-of-thought' && '🔗 CoT'}
                    {strat === 'few-shot' && '📚 Few-Shot'}
                    {strat === 'rag' && '📖 RAG'}
                    {strat === 'instruction' && '📝 Instruction'}
                    {strat === 'hybrid' && '🔀 Hybrid'}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Input */}
            <div>
              <label className="block text-sm font-semibold text-amber-400 mb-2">Task</label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe your task or question here..."
                className="w-full h-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              {validation && (
                <div className="mt-2 text-xs">
                  <div
                    className={`inline-block px-2 py-1 rounded ${
                      validation.isValid ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}
                  >
                    Score: {validation.score}/100
                  </div>
                  {validation.issues.length > 0 && (
                    <div className="mt-1 text-red-400">
                      {validation.issues.map((issue, i) => (
                        <div key={i}>• {issue}</div>
                      ))}
                    </div>
                  )}
                  {validation.suggestions.length > 0 && (
                    <div className="mt-1 text-amber-400">
                      {validation.suggestions.map((sug, i) => (
                        <div key={i}>💡 {sug}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Context Input */}
            <div>
              <label className="block text-sm font-semibold text-amber-400 mb-2">
                Context (Optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Add any relevant context, data, or background information..."
                className="w-full h-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Constraints */}
            <div>
              <label className="block text-sm font-semibold text-amber-400 mb-2">
                Constraints (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={constraintInput}
                  onChange={(e) => setConstraintInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addConstraint()}
                  placeholder="Add a constraint and press Enter..."
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={addConstraint}
                  className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded text-sm font-medium"
                >
                  Add
                </button>
              </div>
              {constraints.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {constraints.map((constraint, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-slate-700 px-2 py-1 rounded text-sm"
                    >
                      <span>{constraint}</span>
                      <button
                        onClick={() => removeConstraint(i)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optimize Button */}
            <button
              onClick={handleOptimize}
              className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all"
            >
              ⚡ Optimize Prompt
            </button>
          </>
        )}

        {/* OPTIMIZE TAB */}
        {activeTab === 'optimize' && optimizedPrompt && (
          <>
            {/* Strategy Badge */}
            <div className="bg-slate-700 p-3 rounded">
              <div className="text-xs text-slate-400 mb-1">Strategy Used</div>
              <div className="text-sm font-semibold text-blue-400">
                {optimizedPrompt.strategy.toUpperCase()}
              </div>
            </div>

            {/* Optimized Prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-amber-400">
                  Optimized Prompt
                </label>
                <button
                  onClick={() => copyToClipboard(optimizedPrompt.optimized)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {copied ? '✅ Copied' : '📋 Copy'}
                </button>
              </div>
              <div className="bg-slate-700 p-3 rounded text-sm text-slate-200 border border-slate-600 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-xs">
                {optimizedPrompt.optimized}
              </div>
            </div>

            {/* Tips */}
            {optimizedPrompt.tips.length > 0 && (
              <div className="bg-blue-900 p-3 rounded">
                <div className="text-sm font-semibold text-blue-400 mb-2">💡 Tips</div>
                <ul className="text-xs text-blue-300 space-y-1">
                  {optimizedPrompt.tips.map((tip, i) => (
                    <li key={i}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* LLM Recommendations */}
            <div>
              <div className="text-sm font-semibold text-green-400 mb-2">🤖 LLM Recommendations</div>
              <div className="space-y-2">
                {optimizedPrompt.llmRecommendations.map((rec, i) => (
                  <div key={i} className="bg-slate-700 p-3 rounded border border-slate-600">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-semibold text-slate-100">{rec.model}</div>
                      <div className="text-xs font-bold text-green-400">
                        Score: {Math.round(rec.score)}%
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">{rec.reasoning}</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Speed:</span>
                        <span className="ml-1 font-semibold">
                          {rec.speedRating === 'fast'
                            ? '⚡ Fast'
                            : rec.speedRating === 'medium'
                              ? '⏱️ Medium'
                              : '🐢 Slow'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Quality:</span>
                        <span className="ml-1 font-semibold text-blue-400">
                          {rec.qualityRating === 'excellent'
                            ? '⭐⭐⭐'
                            : rec.qualityRating === 'good'
                              ? '⭐⭐'
                              : '⭐'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Cost:</span>
                        <span className="ml-1 font-semibold text-amber-400">{rec.costEstimate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Use in AI Button */}
            <button
              onClick={useInAI}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold rounded-lg transition-all"
            >
              📤 Use in AI Assistant
            </button>
          </>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <>
            <div className="text-xs text-slate-400 mb-3">
              {templates.length} template{templates.length !== 1 ? 's' : ''} for {selectedDomain}
            </div>
            <div className="space-y-2">
              {templates.length > 0 ? (
                templates.map((template) => (
                  <div key={template.id} className="bg-slate-700 p-3 rounded border border-slate-600">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-slate-100">{template.name}</div>
                        <div className="text-xs text-slate-400 mt-1">{template.description}</div>
                      </div>
                      <button
                        onClick={() => loadTemplate(template.id)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold rounded whitespace-nowrap"
                      >
                        Use
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap text-xs">
                      <span className="bg-slate-600 px-2 py-1 rounded text-slate-300">
                        {template.complexity}
                      </span>
                      {template.strategies.map((strat) => (
                        <span key={strat} className="bg-blue-900 px-2 py-1 rounded text-blue-300">
                          {strat}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-8">
                  No templates for {selectedDomain}. Try the general domain.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
