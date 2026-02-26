'use client';

import { useState, useEffect, useCallback } from 'react';

interface Model {
  id: string;
  name: string;
  author: string;
  task: string;
  downloads: number;
  likes: number;
  tags?: string[];
}

interface GeminiModel {
  id: string;
  label: string;
  badge: string;
}

interface ModelGalleryWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

const GEMINI_MODELS: GeminiModel[] = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', badge: 'Fast' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', badge: 'Lite' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', badge: 'Pro' },
  { id: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash', badge: 'New' },
];

const HF_TASKS = [
  'text-generation',
  'text2text-generation',
  'summarization',
  'translation',
  'question-answering',
  'fill-mask',
  'image-generation',
  'text-classification',
];

export default function ModelGalleryWindow({
  windowId,
  onStateChange,
}: ModelGalleryWindowProps) {
  const [activeTab, setActiveTab] = useState('gemini');
  const [hfModels, setHfModels] = useState<Model[]>([]);
  const [hfLoading, setHfLoading] = useState(false);
  const [hfError, setHfError] = useState('');
  const [selectedTask, setSelectedTask] = useState('text-generation');
  const [sortBy, setSortBy] = useState('downloads');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState('');
  const [hasHfToken, setHasHfToken] = useState(false);

  // Load selected model and favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('w3-ai-model');
    if (saved) setSelectedModel(saved);

    const savedFavorites = localStorage.getItem('w3-hf-favorites');
    if (savedFavorites) {
      try {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      } catch {}
    }

    // Check if HF token is available
    fetch('/api/ai')
      .then((r) => r.json())
      .then((data) => {
        setHasHfToken(data.hasHfToken || false);
      })
      .catch(() => setHasHfToken(false));
  }, []);

  // Load HF models when task changes
  useEffect(() => {
    if (activeTab === 'huggingface') {
      loadHuggingFaceModels();
    }
  }, [selectedTask, activeTab]);

  const loadHuggingFaceModels = async () => {
    setHfLoading(true);
    setHfError('');
    try {
      const response = await fetch(
        `/api/huggingface?action=list&task=${selectedTask}&sort=${sortBy}&limit=50`
      );
      const data = await response.json();
      if (data.error) {
        setHfError(data.error);
        setHfModels([]);
      } else {
        setHfModels(data.models || []);
      }
    } catch (error: any) {
      setHfError(error.message || 'Failed to load HuggingFace models');
      setHfModels([]);
    } finally {
      setHfLoading(false);
    }
  };

  const toggleFavorite = useCallback((modelId: string) => {
    setFavorites((prev) => {
      const updated = new Set(prev);
      if (updated.has(modelId)) {
        updated.delete(modelId);
      } else {
        updated.add(modelId);
      }
      localStorage.setItem('w3-hf-favorites', JSON.stringify(Array.from(updated)));
      return updated;
    });
  }, []);

  const useModel = useCallback((modelId: string) => {
    localStorage.setItem('w3-ai-model', modelId);
    setSelectedModel(modelId);
    // Dispatch event to notify AI Assistant
    window.dispatchEvent(new CustomEvent('w3-model-changed', { detail: { model: modelId } }));
  }, []);

  const renderGeminiTab = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        Select a Gemini model for your AI Assistant
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GEMINI_MODELS.map((model) => (
          <div
            key={model.id}
            className="border border-zinc-300 dark:border-zinc-600 rounded-lg p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-white">
                  {model.label}
                </h3>
                <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  {model.badge}
                </span>
              </div>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Google's latest generative model
            </p>
            <button
              onClick={() => useModel(model.id)}
              className={`w-full py-2 px-3 rounded text-sm font-semibold transition-colors ${
                selectedModel === model.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {selectedModel === model.id ? '✓ Active' : 'Use in AI'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHuggingFaceTab = () => (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Warning banner if no HF token */}
      {!hasHfToken && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700 px-4 py-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            ⚠️ HF_TOKEN not configured. Set it in environment to use HuggingFace models.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="border-b border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 p-4 flex gap-3 flex-wrap items-center">
        <select
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
          className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-sm"
        >
          {HF_TASKS.map((task) => (
            <option key={task} value={task}>
              {task}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-sm flex-1 min-w-48"
        />

        <button
          onClick={loadHuggingFaceModels}
          disabled={hfLoading}
          className="px-3 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {hfLoading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Models Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {hfError && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded p-3 text-sm text-red-700 dark:text-red-300 mb-4">
            {hfError}
          </div>
        )}

        {hfLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Loading models...
              </p>
            </div>
          </div>
        )}

        {!hfLoading && hfModels.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No models found
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {hfModels
            .filter((m) =>
              searchQuery
                ? m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  m.author.toLowerCase().includes(searchQuery.toLowerCase())
                : true
            )
            .map((model) => {
              const hfModelId = `hf:${model.id}`;
              const isFavorite = favorites.has(hfModelId);
              const isActive = selectedModel === hfModelId;

              return (
                <div
                  key={model.id}
                  className="border border-zinc-300 dark:border-zinc-600 rounded p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                        {model.name}
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                        by {model.author}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleFavorite(hfModelId)}
                      className="ml-2 text-lg transition-colors"
                      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {isFavorite ? '⭐' : '☆'}
                    </button>
                  </div>

                  <div className="flex gap-1 flex-wrap mb-2">
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                      {model.task}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                    <span>📥 {(model.downloads / 1000).toFixed(0)}k</span>
                    <span>❤️ {model.likes}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => useModel(hfModelId)}
                      className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {isActive ? '✓ Active' : 'Use'}
                    </button>
                    <a
                      href={`https://huggingface.co/${model.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-2 rounded text-xs font-semibold bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                      title="Open on HuggingFace"
                    >
                      ↗
                    </a>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );

  const renderFavoritesTab = () => {
    const favoriteModels = hfModels.filter((m) => favorites.has(`hf:${m.id}`));

    return (
      <div className="flex-1 overflow-y-auto p-6">
        {favoriteModels.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-3xl mb-2">⭐</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No favorite models yet. Add some from HuggingFace tab!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favoriteModels.map((model) => {
              const hfModelId = `hf:${model.id}`;
              const isActive = selectedModel === hfModelId;

              return (
                <div
                  key={model.id}
                  className="border border-zinc-300 dark:border-zinc-600 rounded-lg p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-zinc-900 dark:text-white">
                        {model.name}
                      </h4>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        by {model.author}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleFavorite(hfModelId)}
                      className="text-xl"
                      title="Remove from favorites"
                    >
                      ⭐
                    </button>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <span className="inline-block px-2 py-1 text-xs rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                      {model.task}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                    <span>📥 {(model.downloads / 1000).toFixed(0)}k</span>
                    <span>❤️ {model.likes}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => useModel(hfModelId)}
                      className={`flex-1 py-2 px-3 rounded text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {isActive ? '✓ Active' : 'Use'}
                    </button>
                    <a
                      href={`https://huggingface.co/${model.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded text-sm font-semibold bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                      title="Open on HuggingFace"
                    >
                      ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-800 dark:to-pink-800 px-6 py-4 flex-shrink-0 shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🤗</span>
          <h2 className="text-white font-bold">Model Gallery</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {['gemini', 'huggingface', 'favorites'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-white text-purple-700'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {tab === 'gemini' && 'Gemini'}
              {tab === 'huggingface' && 'HuggingFace'}
              {tab === 'favorites' && '⭐ Favorites'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'gemini' && renderGeminiTab()}
      {activeTab === 'huggingface' && renderHuggingFaceTab()}
      {activeTab === 'favorites' && renderFavoritesTab()}
    </div>
  );
}
