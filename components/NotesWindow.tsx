'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

interface NotesWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

type Language = 'text' | 'python' | 'javascript' | 'html' | 'markdown' | 'json';

const TEMPLATES = {
  empty: '',
  python: '#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()',
  javascript: '// W3 OS Script\n\nfunction main() {\n  console.log("Hello W3!");\n}\n\nmain();',
  html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>W3 Document</title>\n</head>\n<body>\n  <h1>Hello W3</h1>\n</body>\n</html>',
  markdown: '# Title\n\n## Section\n\nContent here',
};

function getLanguageFromFilename(filename: string): Language {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'py': return 'python';
    case 'js':
    case 'ts': return 'javascript';
    case 'html':
    case 'htm': return 'html';
    case 'md': return 'markdown';
    case 'json': return 'json';
    default: return 'text';
  }
}

function syntaxHighlight(code: string, language: Language): string {
  if (language === 'text') return code;

  let highlighted = code;

  if (language === 'python') {
    const keywords = ['def', 'class', 'import', 'from', 'return', 'if', 'else', 'for', 'while', 'print', 'True', 'False', 'None'];
    keywords.forEach(kw => {
      highlighted = highlighted.replace(new RegExp(`\\b${kw}\\b`, 'g'), `<span class="text-blue-400">${kw}</span>`);
    });
    highlighted = highlighted.replace(/(['"]).*?\1/g, (match) => `<span class="text-green-400">${match}</span>`);
    highlighted = highlighted.replace(/#.*/g, (match) => `<span class="text-gray-500">${match}</span>`);
    highlighted = highlighted.replace(/\b\d+\b/g, (match) => `<span class="text-orange-400">${match}</span>`);
  } else if (language === 'javascript') {
    const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'console', 'import', 'export'];
    keywords.forEach(kw => {
      highlighted = highlighted.replace(new RegExp(`\\b${kw}\\b`, 'g'), `<span class="text-blue-400">${kw}</span>`);
    });
    highlighted = highlighted.replace(/(['"]).*?\1/g, (match) => `<span class="text-green-400">${match}</span>`);
    highlighted = highlighted.replace(/\/\/.*/g, (match) => `<span class="text-gray-500">${match}</span>`);
    highlighted = highlighted.replace(/\b\d+\b/g, (match) => `<span class="text-orange-400">${match}</span>`);
  }

  return highlighted;
}

export default function NotesWindow({
  windowId,
  onStateChange,
}: NotesWindowProps) {
  const [content, setContent] = useState('');
  const [filename, setFilename] = useState('untitled.txt');
  const [filepath, setFilepath] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('document.txt');
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(true);
  const [runOutput, setRunOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showFileList, setShowFileList] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const language = useMemo(() => getLanguageFromFilename(filename), [filename]);

  // Handle w3-open-app event to open files from terminal
  useEffect(() => {
    const handleOpenApp = (e: any) => {
      const { detail } = e;
      if (detail.type === 'notepad' && detail.content !== undefined) {
        setContent(detail.content);
        setFilename(detail.filename || 'untitled.txt');
        setFilepath(detail.filepath || '');
        setIsSaved(true);

        // Set saveName to the full path or filename
        // If filepath is provided, use it; otherwise use filename
        if (detail.filepath) {
          // Remove /tmp/w3-workspace/ prefix if present to show relative path
          let displayPath = detail.filepath;
          if (displayPath.startsWith('/tmp/w3-workspace/')) {
            displayPath = displayPath.slice('/tmp/w3-workspace/'.length);
          }
          setSaveName(displayPath);
        } else {
          setSaveName(detail.filename || 'document.txt');
        }
        syncLineNumbers();
      }
    };

    window.addEventListener('w3-open-app', handleOpenApp);
    return () => window.removeEventListener('w3-open-app', handleOpenApp);
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setIsSaved(false);
    onStateChange({ content: newContent, isSaved: false });
    syncLineNumbers();
  }, [onStateChange]);

  const syncLineNumbers = () => {
    if (!textareaRef.current || !lineNumbersRef.current) return;
    const lines = textareaRef.current.value.split('\n').length;
    lineNumbersRef.current.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  };

  const handleSave = useCallback(async () => {
    try {
      // Determine the full path based on saveName
      let fullPath = saveName;
      if (!fullPath.startsWith('/')) {
        fullPath = `/tmp/w3-workspace/${saveName}`;
      }

      // Create parent directories if needed
      const saveCommand = `mkdir -p "$(dirname "${fullPath}")" && cat > "${fullPath}" << 'W3EOF'\n${content}\nW3EOF`;

      const termResponse = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: saveCommand,
          cwd: '/tmp/w3-workspace',
        }),
      });

      const termData = await termResponse.json();

      if (!termResponse.ok) {
        throw new Error(termData.error || 'Save failed');
      }

      setFilename(saveName.split('/').pop() || saveName);
      setFilepath(fullPath);
      setIsSaved(true);
      setShowSaveDialog(false);
      onStateChange({ content, isSaved: true });

      // Show toast message with relative path
      const displayPath = saveName.startsWith('/') ? saveName : saveName;
      setToastMessage(`✅ Saved to ~/${displayPath}`);
      setTimeout(() => setToastMessage(''), 3000);
    } catch (error: any) {
      alert(`Save failed: ${error.message}`);
    }
  }, [content, saveName, onStateChange]);

  const handleOpen = useCallback(async () => {
    try {
      // Fetch file list from workspace
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: "find /tmp/w3-workspace -type f \\( -name '*.txt' -o -name '*.py' -o -name '*.js' -o -name '*.html' -o -name '*.md' -o -name '*.json' \\) | head -50",
          cwd: '/tmp/w3-workspace',
        }),
      });
      const data = await res.json();
      const fileList = (data.stdout || '').split('\n').filter((l: string) => l.trim());
      setFiles(fileList);
      setShowFileList(true);
    } catch (error: any) {
      alert(`Failed to list files: ${error.message}`);
    }
  }, []);

  const handleFileSelect = useCallback(async (selectedFile: string) => {
    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `cat "${selectedFile}"`,
          cwd: '/tmp/w3-workspace',
        }),
      });
      const data = await res.json();

      if (data.stdout !== undefined) {
        setContent(data.stdout);
        setFilename(selectedFile.split('/').pop() || 'untitled.txt');
        setFilepath(selectedFile);
        setIsSaved(true);
        setSaveName(selectedFile.split('/').pop() || 'document.txt');
        setShowFileList(false);
        syncLineNumbers();
      }
    } catch (error: any) {
      alert(`Open failed: ${error.message}`);
    }
  }, []);

  const handleNewFile = (template: keyof typeof TEMPLATES) => {
    setContent(TEMPLATES[template]);
    if (template === 'python') setFilename('script.py');
    else if (template === 'javascript') setFilename('script.js');
    else if (template === 'html') setFilename('index.html');
    else if (template === 'markdown') setFilename('document.md');
    else setFilename('untitled.txt');
    setIsSaved(true);
    setShowTemplateMenu(false);
    syncLineNumbers();
  };

  const handleRun = useCallback(async () => {
    if (language === 'text' || language === 'markdown' || language === 'html') {
      setRunOutput('Cannot run this file type');
      return;
    }

    setIsRunning(true);
    setShowOutput(true);
    setRunOutput('Running...');

    try {
      const tmpFile = `/tmp/w3_run.${language === 'python' ? 'py' : 'js'}`;

      // First SAVE the file content using heredoc
      const saveCommand = `cat > "${tmpFile}" << 'W3EOF'\n${content}\nW3EOF`;
      const saveResponse = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: saveCommand,
          cwd: '/tmp',
        }),
      });

      const saveData = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'Failed to save file');
      }

      // THEN run the file
      const cmd = language === 'python' ? `python3 ${tmpFile}` : `node ${tmpFile}`;
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, cwd: '/tmp' }),
      });

      const data = await response.json();
      setRunOutput((data.stdout || '') + (data.stderr ? `\n[Error]\n${data.stderr}` : ''));
    } catch (error: any) {
      setRunOutput(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [content, language]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (isSaved && filepath) {
        // Auto-save to existing path
        handleSave();
      } else {
        setShowSaveDialog(true);
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === '=') {
      e.preventDefault();
      setFontSize(prev => Math.min(prev + 2, 24));
    } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault();
      setFontSize(prev => Math.max(prev - 2, 10));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + '    ' + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Toast Message */}
      {toastMessage && (
        <div className="bg-green-600 text-white px-4 py-2 text-sm flex-shrink-0 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-zinc-800 border-b border-zinc-700 px-3 py-2 flex gap-2 items-center flex-shrink-0 flex-wrap">
        <button
          onClick={() => setShowTemplateMenu(true)}
          className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded"
        >
          📄 New
        </button>
        <button
          onClick={handleOpen}
          className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded"
        >
          📂 Open
        </button>
        <button
          onClick={() => setShowSaveDialog(true)}
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
          disabled={isSaved}
        >
          💾 Save
        </button>
        {language !== 'text' && language !== 'markdown' && language !== 'html' && (
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
          >
            ▶ Run
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setFontSize(prev => Math.max(prev - 2, 10))}
          className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded"
          title="Decrease font size (Ctrl+-)"
        >
          −
        </button>
        <span className="text-xs text-gray-400">{fontSize}px</span>
        <button
          onClick={() => setFontSize(prev => Math.min(prev + 2, 24))}
          className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded"
          title="Increase font size (Ctrl+=)"
        >
          +
        </button>
        <button
          onClick={() => setWordWrap(!wordWrap)}
          className={`px-2 py-1 text-xs rounded ${wordWrap ? 'bg-blue-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-white'}`}
          title="Toggle word wrap"
        >
          ⤴
        </button>
        <div className="text-xs text-gray-400">
          {isSaved ? '✓ Saved' : '● Unsaved'} | {language} | {filename}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Line Numbers */}
          <div
            ref={lineNumbersRef}
            className="bg-zinc-950 text-gray-500 text-right pr-3 py-2 text-xs font-mono select-none overflow-hidden"
            style={{ fontSize: `${fontSize}px` }}
          >
            1
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={() => {
              if (lineNumbersRef.current && textareaRef.current) {
                lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
              }
            }}
            className="flex-1 p-3 bg-zinc-900 text-gray-100 font-mono border-none focus:outline-none resize-none"
            style={{
              fontSize: `${fontSize}px`,
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              wordWrap: wordWrap ? 'break-word' : 'normal',
            }}
          />
        </div>

        {/* Output Panel */}
        {showOutput && (
          <div className="w-1/3 border-l border-zinc-700 flex flex-col bg-zinc-800">
            <div className="bg-zinc-700 px-3 py-2 flex gap-2 items-center justify-between">
              <span className="text-xs font-semibold text-gray-300">Output</span>
              <button
                onClick={() => setShowOutput(false)}
                className="text-gray-400 hover:text-gray-200 text-xs"
              >
                ✕
              </button>
            </div>
            <div
              className="flex-1 overflow-auto p-3 font-mono text-xs bg-gray-950 text-green-400 whitespace-pre-wrap break-words"
              style={{ fontFamily: '"Courier New", Courier, monospace' }}
            >
              {runOutput}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-zinc-800 border-t border-zinc-700 px-3 py-2 text-xs text-gray-500 flex justify-between">
        <span>Line {(content.slice(0, textareaRef.current?.selectionStart || 0).match(/\n/g) || []).length + 1}</span>
        <span>UTF-8 | {language}</span>
      </div>

      {/* New File Template Menu */}
      {showTemplateMenu && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg shadow-lg p-6 w-80">
            <h3 className="text-lg font-bold mb-4 text-white">New File</h3>
            <div className="space-y-2">
              {[
                { name: 'Empty', key: 'empty' as const },
                { name: 'Python Script', key: 'python' as const },
                { name: 'JavaScript', key: 'javascript' as const },
                { name: 'HTML Page', key: 'html' as const },
                { name: 'Markdown', key: 'markdown' as const },
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => handleNewFile(item.key)}
                  className="w-full px-4 py-2 text-left bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm"
                >
                  {item.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTemplateMenu(false)}
              className="w-full mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* File List Dialog */}
      {showFileList && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg shadow-lg p-6 w-96 max-h-96 flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-white">Open File</h3>
            <div className="flex-1 overflow-auto border border-zinc-700 rounded mb-4 bg-zinc-800">
              {files.length === 0 ? (
                <div className="p-4 text-zinc-400 text-sm">No files found</div>
              ) : (
                files.map((file, i) => (
                  <button
                    key={i}
                    onClick={() => handleFileSelect(file)}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-white text-sm border-b border-zinc-700 last:border-b-0"
                  >
                    {file.split('/').pop()}
                  </button>
                ))
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowFileList(false)}
                className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4 text-white">Save As</h3>
            <input
              autoFocus
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setShowSaveDialog(false);
              }}
              placeholder="filename.txt"
              className="w-full px-3 py-2 rounded border border-zinc-600 bg-zinc-800 text-white mb-4 focus:outline-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
