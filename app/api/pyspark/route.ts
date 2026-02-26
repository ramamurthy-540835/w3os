import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  let tempFile: string | null = null;

  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return Response.json({ error: 'PySpark code is required' }, { status: 400 });
    }

    // Create temp file for the PySpark job
    const timestamp = Date.now();
    tempFile = `/tmp/pyspark_job_${timestamp}.py`;

    fs.writeFileSync(tempFile, code);

    const startTime = Date.now();

    // Execute PySpark job with BigQuery connector using spark-submit
    const { stdout, stderr } = await execAsync(
      `spark-submit --packages com.google.cloud.spark:spark-bigquery-with-dependencies_2.13:0.40.0 ${tempFile} 2>&1`,
      {
        timeout: 120000, // 2 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
      }
    ).catch((error) => ({
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      code: error.code || 1,
    }));

    const duration = Date.now() - startTime;

    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    // Determine exit code
    const exitCode = (stdout + stderr).includes('Traceback') ? 1 : 0;

    return Response.json({
      jobId: `job_${timestamp}`,
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode,
      duration,
      success: exitCode === 0,
    });
  } catch (error: any) {
    // Clean up on error
    if (tempFile && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.error('Failed to clean up temp file:', e);
      }
    }

    console.error('PySpark execution error:', error);

    const errorMessage = error.message || 'Failed to execute PySpark job';
    return Response.json(
      {
        jobId: `job_${Date.now()}`,
        stdout: '',
        stderr: errorMessage,
        exitCode: 1,
        duration: 0,
        success: false,
      },
      { status: 500 }
    );
  }
}
