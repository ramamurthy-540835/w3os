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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
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

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply || 'No response',
        timestamp: Date.now(),
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
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}} className="bg-white dark:bg-zinc-800">
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
      <div style={{flex:1, overflowY:'auto', minHeight:0}} className="p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 dark:text-zinc-400 py-12">
            <p className="text-lg">Start a conversation with {agentName}</p>
            <p className="text-sm mt-2">Type your message below to begin</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.timestamp}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
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
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center flex-shrink-0 text-black dark:text-white text-sm ml-3">
                👤
              </div>
            )}
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

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{flexShrink:0, display:'flex', gap:'8px', padding:'12px', borderTop:'1px solid #e5e7eb', alignItems:'center'}}>
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
