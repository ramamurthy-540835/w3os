'use client';

import { useState, useEffect, useRef } from 'react';

interface AgentChatProps {
  windowId: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  agentDescription: string;
  onStateChange: (state: Record<string, any>) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  codeBlocks?: Array<{ language: string; code: string }>;
  imageUrl?: string;
}

interface UploadedFile {
  filename: string;
  preview: string;
}

export default function AgentChat({
  windowId,
  agentId,
  agentName,
  agentIcon,
  agentDescription,
  onStateChange,
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [executingCode, setExecutingCode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Upload failed: ${data.error}`);
        return;
      }

      setUploadedFile({
        filename: data.filename,
        preview: data.preview,
      });

      // Auto-send message with file context
      const fileMessage = `I uploaded a file: ${data.filename}\n\nHere's a preview:\n\`\`\`\n${data.preview}\n\`\`\`\n\nPlease analyze this data.`;
      setInput(fileMessage);
    } catch (error: any) {
      alert(`Upload error: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const extractCodeBlocks = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const codeBlocks = [];
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      codeBlocks.push({
        language: match[1] || 'plain',
        code: match[2].trim(),
      });
    }

    return codeBlocks;
  };

  const executeCode = async (codeBlock: { language: string; code: string }) => {
    if (codeBlock.language !== 'python') {
      alert('Only Python code execution is supported');
      return;
    }

    setExecutingCode(codeBlock.code);

    try {
      // Save code to file and execute
      let command = `cat > /tmp/w3_analysis.py << 'EOF'\n${codeBlock.code}\nEOF\npython3 /tmp/w3_analysis.py`;

      // If code doesn't have plt.savefig, add it
      if (codeBlock.code.includes('plt.show()') && !codeBlock.code.includes('plt.savefig')) {
        command = `cat > /tmp/w3_analysis.py << 'EOF'\n${codeBlock.code.replace('plt.show()', "plt.savefig('/tmp/w3_chart.png', bbox_inches='tight', dpi=100)\nplt.show()\nplt.close()")}\nEOF\npython3 /tmp/w3_analysis.py`;
      }

      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });

      const data = await response.json();

      // Check if chart was generated
      let imageUrl = '';
      try {
        const chartResponse = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'base64 /tmp/w3_chart.png' }),
        });

        const chartData = await chartResponse.json();
        if (chartData.output) {
          imageUrl = `data:image/png;base64,${chartData.output.trim()}`;
        }
      } catch (e) {
        // Chart file doesn't exist, that's ok
      }

      // Add result message
      const resultMessage: Message = {
        role: 'assistant',
        content: `✅ Code executed successfully!\n\nOutput:\n${data.output || '(no text output)'}`,
        timestamp: Date.now(),
        imageUrl,
      };

      setMessages((prev) => [...prev, resultMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Code execution failed: ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setExecutingCode(null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const codeBlocks = extractCodeBlocks(input);
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
      codeBlocks,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    onStateChange({ lastMessage: input });

    try {
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          input: userMessage.content,
          history: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantCodeBlocks = extractCodeBlocks(data.reply || '');
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply || 'No response',
        timestamp: Date.now(),
        codeBlocks: assistantCodeBlocks,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error: ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="bg-white dark:bg-zinc-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4 flex-shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{agentIcon}</span>
          <div>
            <h2 className="text-white font-bold">{agentName}</h2>
            <p className="text-blue-100 text-xs">{agentDescription}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 dark:text-zinc-400 py-12">
            <p className="text-lg">Start a conversation with {agentName}</p>
            <p className="text-sm mt-2">Upload a file or type your message below</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.timestamp}>
            <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 text-white text-sm mr-3">
                  {agentIcon}
                </div>
              )}

              <div
                className={`max-w-xs lg:max-w-md rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Display code blocks with execution button */}
                {message.codeBlocks && message.codeBlocks.length > 0 && message.role === 'assistant' && (
                  <div className="mt-3 space-y-2">
                    {message.codeBlocks.map((block, idx) => (
                      <div key={idx} className="bg-zinc-800 dark:bg-zinc-900 rounded p-2 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-zinc-400">{block.language}</span>
                          <button
                            onClick={() => executeCode(block)}
                            disabled={executingCode === block.code}
                            className="px-2 py-1 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-600 text-white rounded text-xs font-medium"
                          >
                            {executingCode === block.code ? '⏳ Running' : '▶ Run Code'}
                          </button>
                        </div>
                        <pre className="overflow-x-auto text-white max-h-40">
                          <code>{block.code}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                )}

                {/* Display image if available */}
                {message.imageUrl && (
                  <div className="mt-3">
                    <img
                      src={message.imageUrl}
                      alt="Generated chart"
                      style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 300 }}
                    />
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center flex-shrink-0 text-black dark:text-white text-sm ml-3">
                  👤
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 text-white text-sm">
              {agentIcon}
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-700 rounded-lg px-4 py-3">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        {/* File upload indicator */}
        {isUploading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 text-white text-sm">
              📎
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50">
              📤 Uploading file...
            </div>
          </div>
        )}

        {uploadedFile && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white text-sm">
              ✓
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3 text-sm text-green-800 dark:text-green-200">
              📁 {uploadedFile.filename} (ready for analysis)
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          gap: '8px',
          padding: '12px',
          borderTop: '1px solid #e5e7eb',
          alignItems: 'center',
        }}
      >
        {/* File upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Upload file"
          style={{
            flexShrink: 0,
            width: '42px',
            height: '42px',
            minWidth: '42px',
            borderRadius: '50%',
            background: isUploading ? '#ccc' : '#8b5cf6',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => !isUploading && (e.currentTarget.style.background = '#7c3aed')}
          onMouseLeave={(e) => !isUploading && (e.currentTarget.style.background = '#8b5cf6')}
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,.txt,.xlsx,.py,.sql"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="resize-none rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 max-h-24"
          style={{ flex: 1, minWidth: 0 }}
          rows={2}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          style={{
            flexShrink: 0,
            width: '42px',
            height: '42px',
            minWidth: '42px',
            borderRadius: '50%',
            background: isLoading || !input.trim() ? '#ccc' : '#a855f7',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => !isLoading && input.trim() && (e.currentTarget.style.background = '#9333ea')}
          onMouseLeave={(e) => !isLoading && input.trim() && (e.currentTarget.style.background = '#a855f7')}
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
}
