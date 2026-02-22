'use client';

import { useState, useRef, useEffect } from 'react';
import VoiceAssistant from './VoiceAssistant';

// Process voice commands and execute them
function processVoiceCommand(text: string): { handled: boolean; response: string } {
  const lower = text.toLowerCase().trim();

  // App commands
  if (lower.includes('open terminal') || lower.includes('start terminal')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', {detail: {type: 'terminal'}}));
    return { handled: true, response: 'Opening Terminal...' };
  }
  if (lower.includes('open notepad') || lower.includes('open editor')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', {detail: {type: 'notepad'}}));
    return { handled: true, response: 'Opening Notepad...' };
  }
  if (lower.includes('open browser')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', {detail: {type: 'browser'}}));
    return { handled: true, response: 'Opening Web Browser...' };
  }
  if (lower.includes('open file') || lower.includes('open explorer')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', {detail: {type: 'file-explorer'}}));
    return { handled: true, response: 'Opening File Explorer...' };
  }
  if (lower.includes('open settings')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', {detail: {type: 'settings'}}));
    return { handled: true, response: 'Opening Settings...' };
  }
  if (lower.includes('open agent') || lower.includes('open ai agent') || lower.includes('agent store')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', {detail: {type: 'agent-store'}}));
    return { handled: true, response: 'Opening AI Agent Store...' };
  }
  if (lower.includes('start coding') || lower.includes('python coder') || lower.includes('code with')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', {detail: {type: 'agent-chat', agentId: 'python-coder', title: 'Python Coder'}}));
    return { handled: true, response: 'Opening Python Coder...' };
  }

  // Web navigation - Open connected apps in W3 browser
  if (lower.includes('open gmail') || lower.includes('check email')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', { detail: { type: 'browser', url: 'https://mail.google.com', title: 'Gmail' } }));
    return { handled: true, response: 'Opening Gmail...' };
  }
  if (lower.includes('open linkedin')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', { detail: { type: 'browser', url: 'https://linkedin.com', title: 'LinkedIn' } }));
    return { handled: true, response: 'Opening LinkedIn...' };
  }
  if (lower.includes('open twitter') || lower.includes('open x')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', { detail: { type: 'browser', url: 'https://x.com', title: 'X' } }));
    return { handled: true, response: 'Opening X...' };
  }
  if (lower.includes('open github')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', { detail: { type: 'browser', url: 'https://github.com', title: 'GitHub' } }));
    return { handled: true, response: 'Opening GitHub...' };
  }
  if (lower.includes('open google drive') || lower.includes('open drive')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', { detail: { type: 'browser', url: 'https://drive.google.com', title: 'Google Drive' } }));
    return { handled: true, response: 'Opening Google Drive...' };
  }
  if (lower.includes('open sheets') || lower.includes('open google sheets')) {
    window.dispatchEvent(new CustomEvent('w3-open-app', { detail: { type: 'browser', url: 'https://sheets.google.com', title: 'Google Sheets' } }));
    return { handled: true, response: 'Opening Google Sheets...' };
  }

  // System commands
  if (lower.includes('what time') || lower.includes('current time')) {
    return { handled: true, response: `The current time is ${new Date().toLocaleTimeString()}` };
  }

  // Not a command, send to AI
  return { handled: false, response: '' };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

export default function AIAssistantWindow({
  windowId,
  onStateChange,
}: AIAssistantWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm W3 AI, your cloud-based assistant. I can help you with:\n\n📝 Writing and editing\n💻 Coding and debugging\n🗂️ File management\n🎤 Voice commands\n⚙️ System tasks\n🔍 Web search\n\nTry using the microphone button to give voice commands!\n\nHow can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVoice, setShowVoice] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceInputUsed, setVoiceInputUsed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText: string = input, useVoiceOutput: boolean = false) => {
    if (!messageText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (messageText === input) {
      setInput('');
    }
    setIsLoading(true);
    setVoiceError('');
    setVoiceInputUsed(useVoiceOutput);
    onStateChange({ lastMessage: messageText });

    try {
      // Call Gemini API via our backend
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'No response received',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Play voice if: voice input was used OR voice enabled toggle is ON
      if ((useVoiceOutput || voiceEnabled) && typeof speechSynthesis !== 'undefined') {
        speakResponse(data.reply || 'No response received');
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error.message || 'Failed to connect to AI. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakResponse = (text: string) => {
    if (typeof speechSynthesis === 'undefined') return;

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceTranscript = (text: string) => {
    // Update input with transcribed text
    setInput(text);
  };

  const handleVoiceResponse = (text: string) => {
    // Check if this is a voice command
    const commandResult = processVoiceCommand(text);
    if (commandResult.handled) {
      // Add the command and response to chat
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: commandResult.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      // Speak the response
      speakResponse(commandResult.response);
    } else {
      // Send the transcribed text and add AI response with voice output
      sendMessage(text, true);
    }
  };

  const handleVoiceError = (error: string) => {
    setVoiceError(error);
  };

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}} className="bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-zinc-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-800 dark:to-blue-900 px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🤖</span>
          <div>
            <h2 className="text-white font-bold">W3 AI Assistant</h2>
            <p className="text-blue-100 text-xs">Powered by Google Gemini</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="p-2 hover:bg-blue-700 dark:hover:bg-blue-700 rounded text-white text-sm"
            title={voiceEnabled ? 'Voice response ON' : 'Voice response OFF'}
          >
            {voiceEnabled ? '🔊' : '🔇'}
          </button>
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="p-2 hover:bg-red-600 rounded text-white text-sm bg-red-500"
              title="Stop speaking"
            >
              ⏹ Stop
            </button>
          )}
          <button
            onClick={() => setShowVoice(!showVoice)}
            className="p-2 hover:bg-blue-700 dark:hover:bg-blue-700 rounded text-white text-sm"
            title="Toggle Voice Input"
          >
            🎤
          </button>
        </div>
      </div>

      {/* Voice Error Message */}
      {voiceError && (
        <div className="bg-red-100 dark:bg-red-900/30 border-b border-red-300 dark:border-red-700 px-6 py-3 flex gap-2 items-center flex-shrink-0">
          <p className="text-sm text-red-700 dark:text-red-300 flex-1">{voiceError}</p>
          <button
            onClick={() => setVoiceError('')}
            className="text-red-600 dark:text-red-400 hover:underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Chat Messages */}
      <div style={{flex:1, overflowY:'auto', minHeight:0}} className="p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white text-sm">
                🤖
              </div>
            )}

            <div
              className={`max-w-xs lg:max-w-md rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 rounded-bl-none shadow-md border border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user'
                    ? 'text-blue-100'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 text-black dark:text-white text-sm">
                👤
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white text-sm">
              🤖
            </div>
            <div className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 rounded-lg px-4 py-3 shadow-md border border-zinc-200 dark:border-zinc-700">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Assistant */}
      {showVoice && (
        <div className="border-b border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-6 py-6 flex-shrink-0 flex justify-center">
          <VoiceAssistant
            onTranscript={handleVoiceTranscript}
            onResponse={handleVoiceResponse}
            onError={handleVoiceError}
            conversationHistory={messages.map((m) => ({
              role: m.role,
              content: m.content,
            }))}
            autoSpeak={false}
          />
        </div>
      )}

      {/* Input Area */}
      <div style={{flexShrink:0, display:'flex', gap:'8px', padding:'12px', borderTop:'1px solid #e5e7eb', alignItems:'center'}}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask W3 AI anything... (Press Enter to send)"
          className="resize-none rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-black dark:text-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-24"
          style={{flex:1, minWidth:0}}
          rows={2}
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          style={{flexShrink:0, width:'42px', height:'42px', minWidth:'42px', borderRadius:'50%', background:isLoading || !input.trim() ? '#ccc' : '#3b82f6', color:'white', border:'none', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s'}}
          onMouseEnter={(e) => !isLoading && input.trim() && (e.currentTarget.style.background = '#1d4ed8')}
          onMouseLeave={(e) => !isLoading && input.trim() && (e.currentTarget.style.background = '#3b82f6')}
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
}
