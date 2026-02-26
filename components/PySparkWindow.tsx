'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface PySparkJob {
  id: string;
  timestamp: number;
  status: 'running' | 'completed' | 'failed';
  duration?: number;
  output: string;
}

interface PySparkWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

const TEMPLATES: Record<string, { name: string; code: string }> = {
  word_count: {
    name: 'Word Count',
    code: `from pyspark.sql import SparkSession
import re

spark = SparkSession.builder.appName("WordCount").getOrCreate()

# Sample text
text = """PySpark is a Python API for Apache Spark
Apache Spark is a unified analytics engine
PySpark provides high-level APIs"""

# Split into words and count
words = re.findall(r'\\w+', text.lower())
word_freq = {}
for word in words:
    word_freq[word] = word_freq.get(word, 0) + 1

# Display results
print("Word Frequency:")
for word, count in sorted(word_freq.items(), key=lambda x: -x[1])[:10]:
    print(f"  {word}: {count}")

print("\\n✓ Word count job completed")
spark.stop()`,
  },
  csv_processor: {
    name: 'CSV Processor',
    code: `from pyspark.sql import SparkSession
import os

spark = SparkSession.builder.appName("CSVProcessor").getOrCreate()

# Create sample CSV data
csv_data = """id,name,value
1,Alice,100
2,Bob,200
3,Charlie,150"""

csv_file = '/tmp/sample_data.csv'
with open(csv_file, 'w') as f:
    f.write(csv_data)

# Read CSV
df = spark.read.option("header", "true").option("inferSchema", "true").csv(csv_file)

print("DataFrame Schema:")
df.printSchema()

print("\\nData Preview:")
df.show()

print(f"\\nStatistics:")
print(f"  Total rows: {df.count()}")
print(f"  Columns: {', '.join(df.columns)}")

print("\\n✓ CSV processing completed")
spark.stop()`,
  },
  bq_to_parquet: {
    name: 'BigQuery → Parquet',
    code: `from pyspark.sql import SparkSession
import os

spark = SparkSession.builder \\
    .appName("BQToParquet") \\
    .config("spark.hadoop.fs.gs.impl", "com.google.cloud.hadoop.fs.gcs.GoogleHadoopFileSystem") \\
    .config("spark.hadoop.fs.AbstractFileSystem.gs.impl", "com.google.cloud.hadoop.fs.gcs.GoogleHadoopFS") \\
    .getOrCreate()

try:
    # Read from BigQuery
    project = "ctoteam"
    dataset = "your_dataset"
    table = "your_table"

    df = spark.read \\
        .format("bigquery") \\
        .option("project", project) \\
        .option("dataset", dataset) \\
        .option("table", table) \\
        .load()

    print(f"Loaded {df.count()} rows from {project}.{dataset}.{table}")

    # Write to Parquet
    output_path = f"/tmp/data_{table}.parquet"
    df.write.mode("overwrite").parquet(output_path)

    print(f"\\n✓ Saved to {output_path}")

except Exception as e:
    print(f"Note: Make sure to replace dataset/table names")
    print(f"Error: {e}")

spark.stop()`,
  },
  schema_discovery: {
    name: 'Schema Discovery',
    code: `from pyspark.sql import SparkSession
import json

spark = SparkSession.builder.appName("SchemaDiscovery").getOrCreate()

# Create sample data
data = [
    (1, "Alice", 28, True),
    (2, "Bob", 34, False),
    (3, "Charlie", 45, True),
]

df = spark.createDataFrame(data, ["id", "name", "age", "active"])

print("Inferred Schema:")
df.printSchema()

print("\\nSchema Details:")
for field in df.schema:
    print(f"  Field: {field.name}")
    print(f"    Type: {field.dataType}")
    print(f"    Nullable: {field.nullable}")

print(f"\\nDataFrame Info:")
print(f"  Columns: {df.columns}")
print(f"  Count: {df.count()}")
print(f"  Partitions: {df.rdd.getNumPartitions()}")

print("\\n✓ Schema discovery completed")
spark.stop()`,
  },
  custom: {
    name: 'Custom',
    code: `from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("MyApp").getOrCreate()

# Write your PySpark code here
print("Hello from PySpark!")

spark.stop()`,
  },
};

export default function PySparkWindow({ windowId, onStateChange }: PySparkWindowProps) {
  const [code, setCode] = useState(TEMPLATES.word_count.code);
  const [selectedTemplate, setSelectedTemplate] = useState('word_count');
  const [loading, setLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState<PySparkJob | null>(null);
  const [jobHistory, setJobHistory] = useState<PySparkJob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Load job history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('w3-pyspark-history');
    if (saved) {
      try {
        setJobHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load job history:', e);
      }
    }
  }, []);

  // Scroll output to bottom when new output arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [currentJob?.output]);

  const selectTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    setCode(TEMPLATES[templateKey].code);
  };

  const runJob = async () => {
    if (!code.trim() || loading) return;

    const jobId = `job_${Date.now()}`;
    setLoading(true);
    setCurrentJob({
      id: jobId,
      timestamp: Date.now(),
      status: 'running',
      output: '[Starting PySpark job...]\n',
    });

    try {
      const response = await fetch('/api/pyspark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      const completedJob: PySparkJob = {
        id: jobId,
        timestamp: Date.now(),
        status: data.exitCode === 0 ? 'completed' : 'failed',
        duration: data.duration,
        output: `[${new Date().toLocaleTimeString()}] Starting job...\n${data.stdout}${
          data.stderr ? `\n[STDERR]\n${data.stderr}` : ''
        }\n[${data.exitCode === 0 ? '✓' : '✗'} Job ${data.exitCode === 0 ? 'completed' : 'failed'} in ${(data.duration / 1000).toFixed(1)}s]`,
      };

      setCurrentJob(completedJob);

      // Add to history
      const newHistory = [completedJob, ...jobHistory].slice(0, 20);
      setJobHistory(newHistory);
      localStorage.setItem('w3-pyspark-history', JSON.stringify(newHistory));
    } catch (error: any) {
      const failedJob: PySparkJob = {
        id: jobId,
        timestamp: Date.now(),
        status: 'failed',
        output: `[ERROR] ${error.message}`,
      };
      setCurrentJob(failedJob);
    } finally {
      setLoading(false);
    }
  };

  const clearOutput = () => {
    setCurrentJob(null);
  };

  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessingVoice(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob);

        try {
          const response = await fetch('/api/ai/voice', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Voice transcription failed');

          const data = await response.json();
          if (data.transcription) {
            setCode((prev) => prev + '\n# ' + data.transcription);
          }
        } catch (error) {
          console.error('Voice transcription error:', error);
        } finally {
          setIsProcessingVoice(false);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Microphone access denied');
    }
  }, []);

  const stopVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  }, [isRecording]);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-4">
        <span className="text-lg">⚡ PySpark Job Runner</span>
        <button
          onClick={runJob}
          disabled={loading || !code.trim()}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm font-semibold transition-colors"
        >
          ▶ Run
        </button>
        {loading && <span className="animate-spin">⏳</span>}
        <button
          onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
          disabled={isProcessingVoice}
          className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors text-white ${
            isRecording
              ? 'bg-red-600 hover:bg-red-700 animate-pulse'
              : isProcessingVoice
              ? 'bg-amber-600'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isRecording ? 'Recording...' : isProcessingVoice ? 'Processing...' : 'Record voice input'}
        >
          {isRecording ? '⏹ Stop' : isProcessingVoice ? '⏳' : '🎤'}
        </button>
        <button
          onClick={clearOutput}
          disabled={!currentJob}
          className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded text-sm font-semibold transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-0">
        {/* Templates & History Sidebar */}
        <div className="w-56 bg-gray-800 border-r border-gray-700 overflow-y-auto p-4 flex flex-col">
          {/* Templates Section */}
          <div className="mb-6">
            <div className="text-xs font-bold text-blue-300 mb-2 flex items-center gap-2">📋 <span>Templates</span></div>
            <div className="space-y-1.5">
              {Object.entries(TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => selectTemplate(key)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-all duration-200 ${
                    selectedTemplate === key
                      ? 'bg-blue-600 text-white font-semibold shadow-lg'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Jobs Section */}
          <div className="mt-auto">
            <div className="text-xs font-bold text-blue-300 mb-2 flex items-center gap-2">📚 <span>Jobs</span></div>
            {jobHistory.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No jobs yet</div>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {jobHistory.slice(0, 10).map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setCurrentJob(job)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                      currentJob?.id === job.id
                        ? 'bg-purple-600 text-white font-semibold'
                        : `bg-gray-700 hover:bg-gray-600 ${
                            job.status === 'completed' ? 'text-green-400' : 'text-red-400'
                          }`
                    }`}
                    title={new Date(job.timestamp).toLocaleString()}
                  >
                    <span className="mr-1">{job.status === 'completed' ? '✓' : '✗'}</span>
                    <span className="truncate">{job.id.slice(0, 10)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor and Output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col border-r border-gray-700">
            <div className="bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-300 border-b border-gray-700">
              EDITOR
            </div>
            <textarea
              ref={codeTextareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 bg-gray-900 text-white p-4 font-mono text-sm resize-none focus:outline-none"
              placeholder="Write your PySpark code here..."
            />
          </div>

          {/* Output Terminal */}
          <div className="flex-1 flex flex-col border-t border-gray-700 overflow-hidden min-h-0">
            <div className="bg-gray-800 px-4 py-2.5 text-xs font-semibold text-gray-300 border-b border-gray-700 flex justify-between items-center">
              <span>⚙️ OUTPUT</span>
              {currentJob && (
                <span className={`text-xs font-medium ${
                  currentJob.status === 'completed' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {currentJob.status === 'completed' ? '✓ Success' : '✗ Failed'}
                </span>
              )}
            </div>
            <div
              ref={outputRef}
              className="flex-1 overflow-auto p-4 font-mono text-xs bg-black/80 space-y-0.5"
              style={{ lineHeight: '1.5' }}
            >
              {currentJob ? (
                <div className="space-y-0">
                  {currentJob.output.split('\n').map((line, i) => (
                    <div key={i} className={`${getLineColor(line)} whitespace-pre-wrap break-words`}>
                      {line || ' '}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-600 italic flex items-center justify-center h-full">
                  Run a job to see output...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getLineColor(line: string): string {
  if (line.includes('✓') || line.includes('completed')) return 'text-green-400';
  if (line.includes('✗') || line.includes('ERROR') || line.includes('failed')) return 'text-red-400';
  if (line.includes('Starting') || line.includes('[')) return 'text-yellow-400';
  if (line.includes('STDERR')) return 'text-red-300';
  return 'text-gray-200';
}
