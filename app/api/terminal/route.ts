import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const ALLOWED_COMMANDS = ['ls', 'cat', 'echo', 'pwd', 'whoami', 'date', 'uname', 'python3', 'python', 'node', 'npm', 'pip3', 'git', 'curl', 'wget', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'head', 'tail', 'grep', 'find', 'wc', 'sort', 'uniq', 'df', 'free', 'ps', 'env', 'which', 'file', 'tar', 'gzip', 'gunzip', 'vi', 'nano', 'clear', 'history', 'man', 'apt', 'bash', 'sh', 'cd'];

export async function POST(req: NextRequest) {
  try {
    const { command, cwd = '/tmp/w3-workspace' } = await req.json();

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Command required' }, { status: 400 });
    }

    // Initialize workspace on first use
    try {
      await execAsync('mkdir -p /tmp/w3-workspace/Documents /tmp/w3-workspace/projects /tmp/w3-workspace/Downloads /tmp/w3-workspace/Desktop /tmp/w3-workspace/Pictures', { timeout: 5000, shell: '/bin/bash' });
    } catch (e) {
      // workspace might already exist
    }

    // Source .bashrc to get aliases (don't prepend them directly - breaks interactive commands like 'gemini')
    const result = await execAsync(`source /tmp/.w3bashrc 2>/dev/null; ${command}`, {
      cwd,
      timeout: 30000,
      maxBuffer: 5 * 1024 * 1024,
      shell: '/bin/bash',
      env: { ...process.env, HOME: '/tmp/w3-workspace', TERM: 'xterm-256color', PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' },
    });

    return NextResponse.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
      cwd,
    });
  } catch (error: any) {
    return NextResponse.json({
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1,
      cwd: '/tmp/w3-workspace',
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    features: ['bash', 'python3', 'node', 'git', 'pip3'],
    info: 'POST with {command: "your command"} to execute',
  });
}
