'use client';

import React, { useState } from 'react';
import {
  Industry,
  PromptType,
  getPromptTypes,
  getIndustries,
  generateSystemPrompt,
  estimateTokens,
} from '@/lib/promptcraft';

interface GeneratedPromptResult {
  prompt: string;
  promptType: PromptType;
  industry: Industry;
  tokenEstimate: number;
}

export default function PromptCraftWindow() {
  const [activeTab, setActiveTab] = useState<'builder' | 'ai-generate' | 'templates'>('builder');
  const [selectedIndustry, setSelectedIndustry] = useState<Industry>('finance');
  const [selectedPromptType, setSelectedPromptType] = useState<PromptType>('instruction-based');
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [constraints, setConstraints] = useState<string[]>([]);
  const [constraintInput, setConstraintInput] = useState('');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMode, setGenerationMode] = useState<'generate' | 'variants' | 'improve'>('generate');
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPromptResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const promptTypes = getPromptTypes();
  const industries = getIndustries();

  const addConstraint = () => {
    if (constraintInput.trim()) {
      setConstraints([...constraints, constraintInput.trim()]);
      setConstraintInput('');
    }
  };

  const removeConstraint = (index: number) => {
    setConstraints(constraints.filter((_, i) => i !== index));
  };

  const handleGenerateWithAI = async () => {
    if (!task.trim()) {
      setStatusMessage('❌ Please enter a task first');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsGenerating(true);
    setStatusMessage('⏳ Generating prompt...');

    try {
      const systemPrompt = generateSystemPrompt(selectedIndustry, selectedPromptType, task);

      let userMessage = task;
      if (context) {
        userMessage += `\n\nContext: ${context}`;
      }
      if (constraints.length > 0) {
        userMessage += `\n\nConstraints:\n${constraints.map((c) => `- ${c}`).join('\n')}`;
      }

      if (generationMode === 'variants') {
        userMessage += '\n\nGenerate 3 variations of the prompt above, each with a slightly different angle or approach.';
      } else if (generationMode === 'improve') {
        if (!generatedPrompt) {
          setStatusMessage('❌ No prompt to improve yet');
          setIsGenerating(false);
          return;
        }
        userMessage = `Improve this prompt:\n${generatedPrompt.prompt}\n\nTask: ${task}`;
      }

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          system: systemPrompt,
          model,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.reply || '';

      const tokenEstimate = estimateTokens(generatedText);
      const result: GeneratedPromptResult = {
        prompt: generatedText,
        promptType: selectedPromptType,
        industry: selectedIndustry,
        tokenEstimate,
      };

      setGeneratedPrompt(result);
      setStatusMessage('✅ Prompt generated!');
      setActiveTab('ai-generate');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Generation error:', error);
      setStatusMessage(`❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setIsGenerating(false);
      setGenerationMode('generate');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const useInAI = () => {
    if (!generatedPrompt) return;

    localStorage.setItem('w3-pending-prompt', generatedPrompt.prompt);
    window.dispatchEvent(
      new CustomEvent('w3-prompt-ready', {
        detail: {
          prompt: generatedPrompt.prompt,
          model,
          industry: selectedIndustry,
          promptType: selectedPromptType,
        },
      })
    );

    setStatusMessage('✅ Prompt sent to AI Assistant! Switch to use it.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      {/* Header with Model Selector */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900">
        <h2 className="text-lg font-bold text-amber-400">Prompt Craft 2.0</h2>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="px-3 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-amber-500"
        >
          <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          <option value="gemini-2.5-flash-preview-04-17">Gemini 2.5 Flash Preview</option>
        </select>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700 bg-slate-900">
        {(['builder', 'ai-generate', 'templates'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 font-medium transition-colors text-sm ${
              activeTab === tab
                ? 'border-b-2 border-amber-500 text-amber-400 bg-slate-800'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab === 'builder' && '✏️ Builder'}
            {tab === 'ai-generate' && '✨ AI Generate'}
            {tab === 'templates' && '📋 Templates'}
          </button>
        ))}
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-sm text-slate-100">
          {statusMessage}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* BUILDER TAB */}
          {activeTab === 'builder' && (
            <>
              {/* Industry & Prompt Type Selectors */}
              <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-amber-400 mb-1 uppercase">
                  Industry
                </label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value as Industry)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-400 mb-1 uppercase">
                  Prompt Type
                </label>
                <select
                  value={selectedPromptType}
                  onChange={(e) => setSelectedPromptType(e.target.value as PromptType)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {promptTypes.map((pt) => (
                    <option key={pt.type} value={pt.type}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prompt Type Description */}
            <div className="text-xs text-slate-400 bg-slate-800 p-2 rounded">
              {promptTypes.find((pt) => pt.type === selectedPromptType)?.description}
            </div>

            {/* Task Input */}
            <div>
              <label className="block text-sm font-semibold text-amber-400 mb-2">Task</label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe what you want the prompt to accomplish..."
                className="w-full h-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Context Input */}
            <div>
              <label className="block text-sm font-semibold text-amber-400 mb-2">
                Context (Optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Add relevant context or background..."
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
                      className="flex items-center gap-2 bg-amber-900 bg-opacity-40 border border-amber-700 px-3 py-1 rounded text-xs text-amber-200"
                    >
                      <span>{constraint}</span>
                      <button
                        onClick={() => removeConstraint(i)}
                        className="text-amber-400 hover:text-amber-300 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            </>
          )}

          {/* AI GENERATE TAB */}
          {activeTab === 'ai-generate' && (
          <>
            {generatedPrompt ? (
              <>
                {/* Badge */}
                <div className="flex items-center justify-between">
                  <span className="inline-block px-3 py-1 text-xs font-semibold bg-green-900 text-green-300 rounded">
                    ✨ AI Generated
                  </span>
                  <span className="text-xs text-slate-400">
                    ~{generatedPrompt.tokenEstimate} tokens
                  </span>
                </div>

                {/* Generated Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-amber-400">Generated Prompt</label>
                    <button
                      onClick={() => copyToClipboard(generatedPrompt.prompt)}
                      className={`px-3 py-1 text-xs rounded transition-colors font-medium ${
                        copied
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {copied ? '✅ Copied' : '📋 Copy'}
                    </button>
                  </div>
                  <div className="bg-slate-700 p-4 rounded border border-slate-600 max-h-64 overflow-y-auto text-sm text-slate-200 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                    {generatedPrompt.prompt}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={useInAI}
                    className="px-3 py-2 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white text-sm font-bold rounded transition-all"
                  >
                    📤 Use in AI
                  </button>
                  <button
                    onClick={() => {
                      setGenerationMode('variants');
                      handleGenerateWithAI();
                    }}
                    disabled={isGenerating}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-sm font-bold rounded transition-all"
                  >
                    🔄 Variants
                  </button>
                  <button
                    onClick={() => {
                      setGenerationMode('improve');
                      handleGenerateWithAI();
                    }}
                    disabled={isGenerating}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white text-sm font-bold rounded transition-all"
                  >
                    💡 Improve
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">✨</div>
                  <p>Generate a prompt using the Builder tab</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Select an industry and prompt type in the Builder tab to see templates. Templates help you understand how each prompt type works in your domain.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700 p-3 rounded border border-slate-600">
                <div className="text-xs font-semibold text-amber-400 mb-1">Current Selection</div>
                <div className="text-sm text-slate-300">
                  <div>{selectedIndustry}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {promptTypes.find((pt) => pt.type === selectedPromptType)?.name}
                  </div>
                </div>
              </div>
              <div className="bg-slate-700 p-3 rounded border border-slate-600">
                <div className="text-xs font-semibold text-blue-400 mb-1">Tip</div>
                <div className="text-xs text-slate-300">
                  Each prompt type has unique strengths. Experiment to find what works best for your task.
                </div>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Sticky Generate Button - Only in Builder Tab */}
        {activeTab === 'builder' && (
          <div className="sticky bottom-0 border-t border-slate-700 bg-slate-900 p-4">
            <button
              onClick={handleGenerateWithAI}
              disabled={isGenerating}
              className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-lg transition-all"
            >
              {isGenerating ? '⏳ Generating...' : '✨ Generate with AI'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
