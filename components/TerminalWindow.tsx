'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface TerminalWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

export default function TerminalWindow({
  windowId,
  onStateChange,
}: TerminalWindowProps) {
  const [history, setHistory] = useState<{type:string,text:string}[]>([]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [cwd, setCwd] = useState('/tmp/w3-workspace');
  const [previousCwd, setPreviousCwd] = useState('/tmp/w3-workspace');
  const [tabCompletions, setTabCompletions] = useState<string[]>([]);
  const [showCompletions, setShowCompletions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const getPrompt = () => {
    if (cwd === '/tmp/w3-workspace') return '~';
    if (cwd.startsWith('/tmp/w3-workspace/')) {
      return '~/' + cwd.slice('/tmp/w3-workspace/'.length);
    }
    return cwd;
  };

  // Initialize terminal with welcome message and version info
  useEffect(() => {
    const initTerminal = async () => {
      try {
        const res = await fetch('/api/terminal', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ command: "python3 --version 2>&1 && node --version 2>&1 && bash --version 2>&1 | head -1", cwd: '/tmp/w3-workspace' }),
        });
        const data = await res.json();

        // Parse versions
        const lines = (data.stdout || '').split('\n').filter((l: string) => l.trim());
        let versionLine = '';
        if (lines.length >= 2) {
          const pythonVersion = lines[0].replace('Python ', '') || '3.x';
          const nodeVersion = lines[1].replace('v', '') || 'v20.x';
          versionLine = `Python ${pythonVersion} | Node v${nodeVersion} | Bash`;
        }

        setHistory([
          {type:'system', text:'W3 Cloud OS Terminal v1.0'},
          {type:'system', text:versionLine || 'Python 3.x | Node v20.x | Bash'},
          {type:'system', text:"Type 'help' for commands\n"},
        ]);
      } catch (e) {
        setHistory([
          {type:'system', text:'W3 Cloud OS Terminal v1.0'},
          {type:'system', text:'Python 3.x | Node v20.x | Bash'},
          {type:'system', text:"Type 'help' for commands\n"},
        ]);
      }
    };

    initTerminal();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const focusInput = () => inputRef.current?.focus();

  const interactiveTUIPrograms = ['nano', 'vim', 'vi', 'htop', 'top', 'less', 'more'];

  const executeCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const promptDisplay = `user@w3-os:${getPrompt()}$ `;
    setHistory(h => [...h, {type:'prompt', text:`${promptDisplay}${trimmed}`}]);
    setCmdHistory(h => [...h, trimmed]);
    setHistoryIndex(-1);
    setInput('');
    setShowCompletions(false);
    setIsRunning(true);

    if (trimmed === 'clear') {
      setHistory([]);
      setIsRunning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    if (trimmed === 'help') {
      setHistory(h => [...h, {type:'stdout', text:'Available commands:\n  python3, node, npm, pip3, bash, ls, cat, mkdir, rm, cp, mv,\n  echo, curl, git, pwd, whoami, date, uname -a, df -h, free -h,\n  ps aux, which, find, grep, head, tail, wc, sort, touch, chmod\n\nTips:\n  cd ~ (or just cd) - go to home\n  cd - - go to previous directory\n  Use Tab for file/command completion'}]);
      setIsRunning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    // Check for interactive TUI programs (nano, vim, vi, etc.)
    const firstWord = trimmed.split(/\s+/)[0];
    if (interactiveTUIPrograms.includes(firstWord)) {
      // Extract filename if provided
      const parts = trimmed.split(/\s+/);
      if (parts.length > 1) {
        const relativePath = parts.slice(1).join(' ');

        // Construct full path if relative
        let fullPath = relativePath;
        if (!relativePath.startsWith('/')) {
          fullPath = cwd === '/tmp/w3-workspace' ? relativePath : `${cwd}/${relativePath}`;
          // If cwd is /tmp/w3-workspace, just use the relative path as-is
          if (cwd === '/tmp/w3-workspace') {
            fullPath = relativePath;
          } else {
            fullPath = `${cwd}/${relativePath}`;
          }
        }

        setHistory(h => [...h, {type:'stdout', text:`Opening ${relativePath} in Notepad editor...`}]);

        // Try to read the file first
        fetch('/api/terminal', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ command: `cat "${fullPath}"`, cwd }),
        }).then(res => res.json()).then(data => {
          // Dispatch event to open Notepad with file content
          window.dispatchEvent(new CustomEvent('w3-open-app', {
            detail: {
              type: 'notepad',
              filename: relativePath.split('/').pop(),
              filepath: fullPath,
              content: data.stdout || '',
            }
          }));
        }).catch(() => {
          // File doesn't exist, open empty Notepad
          window.dispatchEvent(new CustomEvent('w3-open-app', {
            detail: {
              type: 'notepad',
              filename: relativePath.split('/').pop(),
              filepath: fullPath,
              content: '',
            }
          }));
        });
      } else {
        setHistory(h => [...h, {type:'stderr', text:'⚠️ Usage: nano filename.txt  or  vim filename.txt\n💡 This will open the file in Notepad editor.'}]);
      }
      setIsRunning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    // Handle custom 'edit' command
    if (trimmed.startsWith('edit ')) {
      const filename = trimmed.slice(5).trim();
      setHistory(h => [...h, {type:'stdout', text:`Opening ${filename} in Notepad editor...`}]);

      // Try to read the file first
      fetch('/api/terminal', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ command: `cat "${filename}"`, cwd }),
      }).then(res => res.json()).then(data => {
        // Dispatch event to open Notepad with file content
        window.dispatchEvent(new CustomEvent('w3-open-app', {
          detail: {
            type: 'notepad',
            filename: filename.split('/').pop(),
            filepath: filename,
            content: data.stdout || '',
          }
        }));
      }).catch(() => {
        // File doesn't exist, open empty Notepad
        window.dispatchEvent(new CustomEvent('w3-open-app', {
          detail: {
            type: 'notepad',
            filename: filename.split('/').pop(),
            filepath: filename,
            content: '',
          }
        }));
      });
      setIsRunning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    try {
      // Handle cd command specially
      let commandToSend = trimmed;
      if (trimmed === 'cd' || trimmed === 'cd ~') {
        commandToSend = 'cd /tmp/w3-workspace && pwd';
      } else if (trimmed === 'cd -') {
        commandToSend = `cd "${previousCwd}" && pwd`;
      } else if (trimmed.startsWith('cd ')) {
        const target = trimmed.slice(3).trim();
        commandToSend = `cd "${target}" && pwd`;
      }
      // Handle python -> python3
      if (trimmed === 'python' || trimmed.startsWith('python ')) {
        commandToSend = 'python3' + trimmed.slice(6);
      }

      // Prepend bash aliases to every command
      const aliasSetup = 'alias python=python3; alias pip=pip3; alias ll="ls -la"; alias la="ls -A"; ';
      const finalCommand = commandToSend.startsWith('cd ') ? commandToSend : aliasSetup + commandToSend;

      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ command: finalCommand, cwd }),
      });
      const data = await res.json();

      // If this was a cd command, update cwd from pwd output
      if (trimmed === 'cd' || trimmed === 'cd ~' || trimmed === 'cd -' || trimmed.startsWith('cd ')) {
        const pwdOutput = data.stdout?.trim();
        if (pwdOutput && !data.stderr) {
          setPreviousCwd(cwd);
          setCwd(pwdOutput);
        }
        // Still show the pwd output
        if (data.stdout) setHistory(h => [...h, {type:'stdout', text: data.stdout}]);
      } else {
        if (data.stdout) setHistory(h => [...h, {type:'stdout', text: data.stdout}]);
        if (data.stderr) setHistory(h => [...h, {type:'stderr', text: data.stderr}]);
        if (!data.stdout && !data.stderr) setHistory(h => [...h, {type:'stdout', text:'(no output)'}]);
      }
    } catch (err: any) {
      setHistory(h => [...h, {type:'stderr', text:`Error: ${err.message}`}]);
    }
    setIsRunning(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const newIndex = historyIndex === -1 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(cmdHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= cmdHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(cmdHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();

      const currentInput = input;
      const parts = currentInput.split(/\s+/);
      const lastWord = parts[parts.length - 1] || '';
      const isFirstWord = parts.length === 1 && currentInput.length > 0;

      try {
        // Try to get completions
        const completionCmd = isFirstWord
          ? `compgen -c '${lastWord}' 2>/dev/null | head -20 | sort -u`
          : `compgen -f '${lastWord}' 2>/dev/null | head -20 | sort -u`;

        const res = await fetch('/api/terminal', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ command: completionCmd, cwd }),
        });
        const data = await res.json();
        const completions = (data.stdout || '').split('\n').filter((l: string) => l.trim());
        // Deduplicate completions
        const uniqueCompletions: string[] = Array.from(new Set(completions));

        if (uniqueCompletions.length === 1) {
          // Single match - auto-complete it
          const match = uniqueCompletions[0];
          const newInput = parts.slice(0, -1).join(' ') + (parts.length > 1 ? ' ' : '') + match;
          setInput(newInput);
          setShowCompletions(false);
        } else if (uniqueCompletions.length > 1) {
          // Multiple matches - show them on one line
          setHistory(h => [...h, {type:'stdout', text: uniqueCompletions.join(' ')}]);
          setShowCompletions(false);
          setTabCompletions(uniqueCompletions);
        }
      } catch (err) {
        // Silently ignore completion errors
      }
    }
  };

  return (
    <div onClick={focusInput} style={{background:'#000', color:'#fff', height:'100%', display:'flex', flexDirection:'column', fontFamily:"'Courier New',monospace", fontSize:'14px', cursor:'text'}}>
      <div ref={outputRef} style={{flex:1, overflowY:'auto', padding:'8px', whiteSpace:'pre-wrap', wordBreak:'break-all'}}>
        {history.map((item, i) => (
          <div key={i} style={{color: item.type==='stderr' ? '#ff4444' : item.type==='prompt' ? '#00ff00' : item.type==='system' ? '#888' : '#fff'}}>
            {item.text}
          </div>
        ))}
      </div>
      <div style={{display:'flex', alignItems:'center', padding:'4px 8px', borderTop:'1px solid #333', minHeight:'32px', flexShrink:0}}>
        <span style={{color:'#00ff00', whiteSpace:'nowrap'}}>user@w3-os:{getPrompt()}$&nbsp;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          autoFocus
          style={{flex:1, background:'transparent', color:'#00ff00', border:'none', outline:'none', fontFamily:'inherit', fontSize:'inherit', caretColor:'#00ff00', marginLeft:'4px'}}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
