'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  isBuiltIn: boolean;
  systemPrompt: string;
  installed?: boolean;
}

interface AgentMarketplaceProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
  onOpenAgent?: (agentId: string, agentName: string, agentIcon: string, agentDescription: string) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const BUILTIN_AGENTS: Agent[] = [
  {
    id: 'python-coder',
    name: 'Python Coder',
    description: 'Write and run Python code. Describe what you want and I\'ll code it.',
    icon: '🐍',
    category: 'Coding',
    isBuiltIn: true,
    systemPrompt: 'You are a Python coding assistant. When the user describes what they want, write complete, runnable Python code. Always include error handling. Format code in ```python blocks. Include explanations of what each part does.',
    installed: true,
  },
  {
    id: 'document-writer',
    name: 'Document Writer',
    description: 'Create professional documents, reports, and emails.',
    icon: '📝',
    category: 'Writing',
    isBuiltIn: true,
    systemPrompt: 'You are a professional document writer. Create well-structured documents in markdown format based on user requests. Include proper formatting, headings, and organization.',
    installed: true,
  },
  {
    id: 'web-researcher',
    name: 'Web Researcher',
    description: 'Research any topic and compile findings.',
    icon: '🔍',
    category: 'Research',
    isBuiltIn: true,
    systemPrompt: 'You are a research assistant. When given a topic, provide comprehensive information from multiple angles. Compile findings into a well-organized markdown report with sources and citations.',
    installed: true,
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Analyze CSV/JSON data and create visualizations.',
    icon: '📊',
    category: 'Data',
    isBuiltIn: true,
    systemPrompt: 'You are a data analyst. Analyze data using Python with pandas and matplotlib. Write code that processes the data and creates visualizations. Always explain your findings clearly.',
    installed: true,
  },
  {
    id: 'task-automator',
    name: 'Task Automator',
    description: 'Automate repetitive tasks with scripts.',
    icon: '🔄',
    category: 'Automation',
    isBuiltIn: true,
    systemPrompt: 'You are a task automation expert. Create bash or Python scripts to automate tasks. Always include comments explaining each step. Make scripts robust with error handling.',
    installed: true,
  },
  {
    id: 'chat-assistant',
    name: 'Chat Assistant',
    description: 'General purpose AI assistant powered by Gemini.',
    icon: '💬',
    category: 'General',
    isBuiltIn: true,
    systemPrompt: 'You are a helpful AI assistant. Provide clear, concise answers to user questions. Be friendly and informative.',
    installed: true,
  },
  {
    id: 'sql-developer',
    name: 'SQL Developer',
    description: 'Write SQL queries, optimize databases, design schemas.',
    icon: '🗄️',
    category: 'Coding',
    isBuiltIn: true,
    systemPrompt: 'You are an expert SQL developer. Help users write SQL queries for PostgreSQL, MySQL, BigQuery, and other databases. Provide optimized queries, explain execution plans, design schemas, write migrations, and debug SQL errors. Always format SQL in ```sql code blocks.',
    installed: true,
  },
  {
    id: 'data-engineer',
    name: 'Data Engineer',
    description: 'Build data pipelines, ETL, Dataflow, BigQuery, Spark.',
    icon: '🔧',
    category: 'Data',
    isBuiltIn: true,
    systemPrompt: 'You are an expert Data Engineer specializing in Google Cloud Platform. Help with BigQuery, Dataflow, Dataproc, Pub/Sub, Cloud Composer (Airflow), dbt, Spark, and data pipeline design. Write Python code for ETL jobs, Beam pipelines, and data transformations. Format code in appropriate code blocks.',
    installed: true,
  },
  {
    id: 'devops-engineer',
    name: 'DevOps Engineer',
    description: 'Docker, Kubernetes, CI/CD, Terraform, Cloud deployments.',
    icon: '🚀',
    category: 'Automation',
    isBuiltIn: true,
    systemPrompt: 'You are an expert DevOps engineer. Help with Docker, Kubernetes, Terraform, CI/CD pipelines, GitHub Actions, Cloud Build, Cloud Run, GKE, monitoring, logging, and infrastructure as code. Write Dockerfiles, Kubernetes manifests, Terraform configs, and deployment scripts.',
    installed: true,
  },
  {
    id: 'fullstack-developer',
    name: 'Fullstack Developer',
    description: 'React, Next.js, Node.js, TypeScript, APIs.',
    icon: '⚡',
    category: 'Coding',
    isBuiltIn: true,
    systemPrompt: 'You are an expert fullstack developer specializing in React, Next.js, TypeScript, Node.js, and modern web development. Help build components, APIs, database integrations, authentication, and deployment. Write clean, production-ready code with proper error handling.',
    installed: true,
  },
  {
    id: 'gcp-architect',
    name: 'GCP Architect',
    description: 'Google Cloud architecture, cost optimization, security.',
    icon: '☁️',
    category: 'Research',
    isBuiltIn: true,
    systemPrompt: 'You are a Google Cloud Platform Solutions Architect. Help design cloud architectures, choose the right GCP services, optimize costs, set up networking, security, IAM, and compliance. Provide architecture diagrams in text format and recommend best practices.',
    installed: true,
  },
  {
    id: 'api-developer',
    name: 'API Developer',
    description: 'REST APIs, GraphQL, FastAPI, Express, authentication.',
    icon: '🔌',
    category: 'Coding',
    isBuiltIn: true,
    systemPrompt: 'You are an expert API developer. Help design and build REST APIs, GraphQL APIs, WebSocket services using FastAPI, Express, Flask, or other frameworks. Handle authentication (OAuth, JWT), rate limiting, versioning, documentation, and testing.',
    installed: true,
  },
];

export default function AgentMarketplace({
  windowId,
  onStateChange,
  onOpenAgent,
}: AgentMarketplaceProps) {
  const [agents, setAgents] = useState<Agent[]>(BUILTIN_AGENTS);
  const [activeTab, setActiveTab] = useState<'browse' | 'installed' | 'create'>('browse');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    icon: '🤖',
    category: 'Custom',
    systemPrompt: '',
  });
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const categories = ['All', 'Coding', 'Writing', 'Research', 'Data', 'Automation', 'General', 'Custom'];

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || agent.category === filterCategory;
    const matchesTab = activeTab === 'browse' || (activeTab === 'installed' && agent.installed);
    return matchesSearch && matchesCategory && matchesTab;
  });

  const handleInstallAgent = (agentId: string) => {
    setAgents(agents.map(a =>
      a.id === agentId ? { ...a, installed: true } : a
    ));
  };

  const handleRunAgent = (agent: Agent) => {
    if (onOpenAgent) {
      onOpenAgent(agent.id, agent.name, agent.icon, agent.description);
    } else {
      // Fallback: show chat in marketplace
      setSelectedAgent(agent);
      setChatMessages([]);
      setChatInput('');
      onStateChange({ agentId: agent.id, running: true });
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedAgent || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          input: userMessage.content,
          history: chatMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.reply || 'No response',
        timestamp: Date.now(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!newAgent.name.trim() || !newAgent.systemPrompt.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const agent: Agent = {
      id: newAgent.name.toLowerCase().replace(/\s+/g, '-'),
      ...newAgent,
      isBuiltIn: false,
      installed: true,
    };

    setAgents([...agents, agent]);
    setNewAgent({ name: '', description: '', icon: '🤖', category: 'Custom', systemPrompt: '' });
    setShowCreateForm(false);
    alert(`Agent "${agent.name}" created successfully!`);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex-shrink-0">
        <h1 className="text-2xl font-bold">🤖 AI Agent Store</h1>
        <p className="text-sm text-blue-100">Install and manage intelligent agents</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-3 flex gap-4 flex-shrink-0">
        {(['browse', 'installed', 'create'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setShowCreateForm(tab === 'create');
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
            }`}
          >
            {tab === 'browse' && '📦 Browse All'}
            {tab === 'installed' && '✓ Installed'}
            {tab === 'create' && '➕ Create New'}
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      {(activeTab === 'browse' || activeTab === 'installed') && (
        <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4 flex-shrink-0 space-y-3">
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  filterCategory === cat
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 flex flex-col">
        {selectedAgent ? (
          // Chat Interface
          <div className="flex flex-col h-full max-w-4xl mx-auto w-full bg-white dark:bg-zinc-800 rounded-lg shadow-lg overflow-hidden">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedAgent.icon}</span>
                <div>
                  <h3 className="font-bold">{selectedAgent.name}</h3>
                  <p className="text-sm text-blue-100">{selectedAgent.description}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedAgent(null);
                  setChatMessages([]);
                }}
                className="text-white hover:bg-white/20 rounded px-2 py-1 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4 bg-gray-50 dark:bg-zinc-900">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <p className="text-lg mb-2">Start a conversation with {selectedAgent.name}</p>
                  <p className="text-sm">Type your message below to begin</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 dark:bg-zinc-700 px-4 py-2 rounded-lg rounded-bl-none">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !chatInput.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        ) : activeTab === 'create' && showCreateForm ? (
          // Create Agent Form
          <div className="max-w-2xl mx-auto w-full">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Agent</h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  placeholder="My Custom Agent"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                  placeholder="What does this agent do?"
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Icon (Emoji)
                  </label>
                  <input
                    type="text"
                    value={newAgent.icon}
                    onChange={(e) => setNewAgent({ ...newAgent, icon: e.target.value })}
                    maxLength={2}
                    className="w-full px-4 py-2 text-3xl text-center rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={newAgent.category}
                    onChange={(e) => setNewAgent({ ...newAgent, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {['Coding', 'Writing', 'Research', 'Data', 'Automation', 'Custom'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  System Prompt * (How the agent behaves)
                </label>
                <textarea
                  value={newAgent.systemPrompt}
                  onChange={(e) => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
                  placeholder="You are a specialized AI assistant that..."
                  rows={6}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 rounded-lg bg-gray-300 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-400 dark:hover:bg-zinc-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAgent}
                  className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                >
                  Create Agent
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Agent Grid - Compact with scrolling
          <div className="grid gap-3 overflow-y-auto" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))'}}>
            {filteredAgents.map(agent => (
              <div
                key={agent.id}
                className="bg-white dark:bg-zinc-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
                style={{maxWidth: '200px', maxHeight: '240px'}}
              >
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 flex-shrink-0">
                  <div className="text-2xl mb-1">{agent.icon}</div>
                  <h3 className="text-sm font-bold text-white line-clamp-1">{agent.name}</h3>
                </div>

                <div className="p-2 flex flex-col flex-1">
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-2 line-clamp-2 flex-1">
                    {agent.description}
                  </p>

                  <div className="flex gap-1 mb-2 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex-shrink-0">
                      {agent.category}
                    </span>
                    {agent.isBuiltIn && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex-shrink-0">
                        Built-in
                      </span>
                    )}
                  </div>

                  {agent.installed || activeTab === 'installed' ? (
                    <button
                      onClick={() => handleRunAgent(agent)}
                      className="w-full px-2 py-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded text-xs transition-colors flex-shrink-0"
                    >
                      ▶ Run
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInstallAgent(agent.id)}
                      disabled={agent.installed}
                      className="w-full px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded text-xs transition-colors flex-shrink-0"
                    >
                      {agent.installed ? '✓ Done' : '⬇ Install'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredAgents.length === 0 && !showCreateForm && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
              No agents found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
