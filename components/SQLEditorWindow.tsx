'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

interface SchemaColumn {
  name: string;
  type: string;
}

interface SchemaDataset {
  name: string;
  tables: SchemaTable[];
}

interface QueryResult {
  rows: any[];
  schema: any[];
  rowCount: number;
  error?: string;
}

interface SQLEditorWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

export default function SQLEditorWindow({ windowId, onStateChange }: SQLEditorWindowProps) {
  const [sql, setSql] = useState(`SELECT 1 as test, 'example' as name`);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<SchemaDataset[]>([]);
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [projectId, setProjectId] = useState('ctoteam');
  const [showSettings, setShowSettings] = useState(false);
  const [schemaSearch, setSchemaSearch] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sqlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const rowsPerPage = 50;

  // Load schema on mount
  useEffect(() => {
    loadSchema();
  }, []);

  const loadSchema = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bigquery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sql: `SELECT table_schema, table_name, column_name, data_type
                 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE table_schema NOT IN ('INFORMATION_SCHEMA', 'information_schema')
                 ORDER BY table_schema, table_name, ordinal_position`,
        }),
      });

      const data = await response.json();
      if (data.error) {
        console.error('Schema load error:', data.error);
        return;
      }

      // Group into datasets and tables
      const datasetMap = new Map<string, Map<string, SchemaColumn[]>>();
      data.rows.forEach((row: any) => {
        const dataset = row.table_schema;
        const table = row.table_name;
        const column = { name: row.column_name, type: row.data_type };

        if (!datasetMap.has(dataset)) {
          datasetMap.set(dataset, new Map());
        }
        const tableMap = datasetMap.get(dataset)!;
        if (!tableMap.has(table)) {
          tableMap.set(table, []);
        }
        tableMap.get(table)!.push(column);
      });

      const schemaDatasets: SchemaDataset[] = Array.from(datasetMap.entries()).map(
        ([name, tableMap]) => ({
          name,
          tables: Array.from(tableMap.entries()).map(([tableName, columns]) => ({
            name: tableName,
            columns,
          })),
        })
      );

      setSchema(schemaDatasets);
    } catch (error) {
      console.error('Failed to load schema:', error);
    } finally {
      setLoading(false);
    }
  };

  const runQuery = async () => {
    try {
      setLoading(true);
      setResults(null);
      setCurrentPage(1);

      const response = await fetch('/api/bigquery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sql, maxResults: 1000 }),
      });

      const data = await response.json();
      setResults(data);
    } catch (error: any) {
      setResults({ rows: [], schema: [], rowCount: 0, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!results || results.rows.length === 0) return;

    const headers = results.schema.map((col: any) => col.name);
    const csvContent = [
      headers.join(','),
      ...results.rows.map((row: any) =>
        headers.map((h) => {
          const val = row[h];
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val ?? '';
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const insertTableIntoEditor = (dataset: string, table: string) => {
    const snippet = `SELECT * FROM \`${projectId}.${dataset}.${table}\` LIMIT 100`;
    setSql(snippet);
  };

  const toggleDataset = (name: string) => {
    const newSet = new Set(expandedDatasets);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setExpandedDatasets(newSet);
  };

  const toggleTable = (key: string) => {
    const newSet = new Set(expandedTables);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setExpandedTables(newSet);
  };

  const getColumnTypeBadge = (type: string): { bg: string; text: string } => {
    const upper = type.toUpperCase();
    if (/^(INT|FLOAT|NUMERIC|DECIMAL|BIGINT|SMALLINT|INTEGER)/.test(upper)) {
      return { bg: 'bg-yellow-900', text: 'text-yellow-300' };
    }
    if (/^(STRING|BYTES|VARCHAR|TEXT|CHAR)/.test(upper)) {
      return { bg: 'bg-green-900', text: 'text-green-300' };
    }
    if (/^(TIMESTAMP|DATE|TIME|DATETIME)/.test(upper)) {
      return { bg: 'bg-blue-900', text: 'text-blue-300' };
    }
    if (/^BOOL/.test(upper)) {
      return { bg: 'bg-purple-900', text: 'text-purple-300' };
    }
    if (/^(RECORD|STRUCT|ARRAY|JSON)/.test(upper)) {
      return { bg: 'bg-pink-900', text: 'text-pink-300' };
    }
    return { bg: 'bg-gray-700', text: 'text-gray-300' };
  };

  const insertColumnIntoEditor = useCallback((columnName: string) => {
    if (sqlTextareaRef.current) {
      const textarea = sqlTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = sql.slice(0, start) + columnName + sql.slice(end);
      setSql(newValue);
      // Restore cursor position
      setTimeout(() => {
        if (sqlTextareaRef.current) {
          const newPos = start + columnName.length;
          sqlTextareaRef.current.selectionStart = newPos;
          sqlTextareaRef.current.selectionEnd = newPos;
          sqlTextareaRef.current.focus();
        }
      }, 0);
    }
  }, [sql]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
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
            setSql((prev) => prev + '\n' + data.transcription);
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

  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const paginatedRows = results?.rows.slice(startIdx, endIdx) ?? [];
  const totalPages = results ? Math.ceil(results.rows.length / rowsPerPage) : 0;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-4">
        <div className="text-sm font-semibold">
          Project: <span className="text-blue-400">{projectId}</span>
        </div>
        <button
          onClick={runQuery}
          disabled={loading}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm font-semibold transition-colors"
        >
          ▶ Run Query
        </button>
        <button
          onClick={exportCSV}
          disabled={!results || results.rows.length === 0}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm font-semibold transition-colors"
        >
          ⬇ Export CSV
        </button>
        <button
          onClick={loadSchema}
          disabled={loading}
          className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded text-sm font-semibold transition-colors"
        >
          🔄 Refresh Schema
        </button>
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
          onClick={() => setShowSettings(!showSettings)}
          className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-semibold transition-colors"
        >
          ⚙️ Settings
        </button>
        {loading && <span className="text-yellow-400 text-sm">Loading...</span>}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md">
            <div className="text-lg font-bold mb-4 text-white">BigQuery Settings</div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-300 mb-2">GCP Project ID:</label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., my-project-123"
              />
              <p className="text-xs text-gray-500 mt-2">
                This must be a valid GCP project where you have BigQuery enabled and credentials configured.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-semibold transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  loadSchema();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-colors"
              >
                Save & Reload Schema
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-0">
        {/* Schema Browser */}
        <div className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col text-xs">
          <div className="border-b border-gray-700 p-3">
            <div className="font-bold mb-2 text-blue-300 flex items-center gap-2">🗄️ <span>Schema</span></div>
            <input
              type="text"
              placeholder="Search columns..."
              value={schemaSearch}
              onChange={(e) => setSchemaSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {schema.map((dataset) => {
              const matchingTables = dataset.tables.filter((table) =>
                schemaSearch === '' ||
                table.name.includes(schemaSearch) ||
                table.columns.some((col) => col.name.includes(schemaSearch))
              );

              if (schemaSearch && matchingTables.length === 0) return null;

              return (
                <div key={dataset.name}>
                  <button
                    onClick={() => toggleDataset(dataset.name)}
                    className="w-full text-left px-2 py-1.5 hover:bg-gray-700 rounded transition-colors text-gray-300 hover:text-white font-medium"
                  >
                    <span className="mr-2">{expandedDatasets.has(dataset.name) ? '▼' : '▶'}</span>
                    {dataset.name}
                    <span className="text-gray-600 ml-2">({matchingTables.length} tables)</span>
                  </button>
                  {expandedDatasets.has(dataset.name) && (
                    <div className="ml-2 space-y-0.5 bg-gray-900/50 rounded my-1 py-1">
                      {matchingTables.map((table) => {
                        const tableKey = `${dataset.name}.${table.name}`;
                        return (
                          <div key={tableKey}>
                            <button
                              onClick={() => toggleTable(tableKey)}
                              className="w-full text-left px-2 py-1 hover:bg-gray-700 rounded text-gray-400 hover:text-green-400 transition-colors text-xs group flex items-center justify-between"
                            >
                              <div className="flex items-center flex-1 min-w-0">
                                <span className="mr-1">{expandedTables.has(tableKey) ? '▼' : '▶'}</span>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    insertTableIntoEditor(dataset.name, table.name);
                                  }}
                                  className="cursor-pointer hover:underline truncate"
                                >
                                  {table.name}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(`${dataset.name}.${table.name}`);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-400 transition-opacity ml-1 flex-shrink-0"
                                title="Copy path"
                              >
                                📋
                              </button>
                            </button>
                            {expandedTables.has(tableKey) && (
                              <div className="ml-4 text-xs space-y-1 py-1">
                                {table.columns.map((col) => {
                                  if (schemaSearch && !col.name.includes(schemaSearch)) return null;
                                  const badge = getColumnTypeBadge(col.type);
                                  return (
                                    <div
                                      key={col.name}
                                      onClick={() => insertColumnIntoEditor(col.name)}
                                      className="cursor-pointer hover:bg-gray-700 px-1 py-0.5 rounded transition-colors flex items-center justify-between group"
                                      title={`Insert '${col.name}' into editor`}
                                    >
                                      <span className="text-gray-500">●</span>
                                      <span className="text-gray-400 flex-1 ml-1 truncate">{col.name}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap ml-1 ${badge.bg} ${badge.text}`}>
                                        {col.type}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor and Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* SQL Editor */}
          <div className="flex-1 flex flex-col border-r border-gray-700 min-h-0">
            <div className="bg-gray-800 px-4 py-2.5 text-xs font-semibold text-gray-300 border-b border-gray-700 flex justify-between items-center">
              <span>📝 SQL EDITOR</span>
              <span className="text-gray-500 text-xs">Ctrl+Enter to run</span>
            </div>
            <textarea
              ref={sqlTextareaRef}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  runQuery();
                }
              }}
              className="flex-1 bg-gray-900 text-white p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="SELECT * FROM `project.dataset.table` LIMIT 10"
            />
          </div>

          {/* Results Table */}
          <div className="flex-1 flex flex-col border-t border-gray-700 overflow-hidden min-h-0">
            <div className="bg-gray-800 px-4 py-2.5 text-xs font-semibold text-gray-300 border-b border-gray-700 flex justify-between items-center">
              <span>📊 RESULTS</span>
              {results && !results.error && (
                <span className="text-gray-400 text-xs">
                  {results.rows.length} rows
                  {results.rowCount > results.rows.length && ` of ${results.rowCount}`}
                </span>
              )}
            </div>
            {results && results.error ? (
              <div className="flex-1 p-4 text-red-400 overflow-auto">
                <div className="font-semibold mb-2">❌ Query Error:</div>
                <pre className="text-xs bg-gray-800 p-3 rounded overflow-auto">{results.error}</pre>
              </div>
            ) : results && results.rows.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Run a query to see results
              </div>
            ) : results && results.rows.length > 0 ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Table */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-gray-800 border-b border-gray-700">
                      <tr>
                        {/* Use schema if available, otherwise extract from first row */}
                        {(results?.schema && results.schema.length > 0
                          ? results.schema
                          : (results?.rows[0] ? Object.keys(results.rows[0]).map((k) => ({ name: k })) : [])
                        ).map((col: any) => (
                          <th key={col.name} className="px-3 py-2 text-left border-r border-gray-700 whitespace-nowrap">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-700 hover:bg-gray-800">
                          {(results?.schema && results.schema.length > 0
                            ? results.schema
                            : (results?.rows[0] ? Object.keys(results.rows[0]).map((k) => ({ name: k })) : [])
                          ).map((col: any) => (
                            <td key={col.name} className="px-3 py-2 border-r border-gray-700 truncate max-w-xs">
                              {String(row[col.name] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && results && (
                  <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      Showing {startIdx + 1}-{Math.min(endIdx, results.rows.length)} of {results.rows.length} rows
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded"
                      >
                        ← Prev
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-2 py-1 rounded ${
                              currentPage === page ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Run a query to see results
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
