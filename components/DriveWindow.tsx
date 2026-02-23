'use client';

import { useState, useEffect } from 'react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

interface DriveWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

const getMimeIcon = (mimeType: string): string => {
  if (mimeType === 'application/vnd.google-apps.folder') return '📁';
  if (mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('document')) return '📄';
  if (mimeType.includes('presentation')) return '🎨';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('video')) return '🎬';
  if (mimeType.includes('audio')) return '🎵';
  return '📎';
};

const formatFileSize = (bytes?: string): string => {
  if (!bytes) return '';
  const size = parseInt(bytes);
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  if (size < 1024 * 1024 * 1024)
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

export default function DriveWindow({
  windowId,
  onStateChange,
}: DriveWindowProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<
    Array<{ id: string; name: string }>
  >([{ id: 'root', name: 'My Drive' }]);

  useEffect(() => {
    fetchFiles('root');
  }, []);

  const handleSignIn = () => {
    const popup = window.open(
      '/api/auth/google',
      'google-auth',
      'width=500,height=600,left=200,top=100'
    );

    const listener = (event: MessageEvent) => {
      if (
        event.data?.type === 'oauth-success' &&
        event.data?.provider === 'google'
      ) {
        window.removeEventListener('message', listener);
        // Refresh files after successful auth
        fetchFiles(folderPath[folderPath.length - 1].id);
      }
    };
    window.addEventListener('message', listener);
  };

  const fetchFiles = async (folderId: string) => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const response = await fetch(
        `/api/google/drive?folderId=${folderId}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        setErrorStatus(response.status);
        if (response.status === 401) {
          setError('Sign in with Google to access Drive');
        } else {
          setError('Failed to fetch files');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      setError('Failed to load files');
    }
    setLoading(false);
  };

  const handleFolderClick = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      setFolderPath([...folderPath, { id: file.id, name: file.name }]);
      fetchFiles(file.id);
    } else if (file.webViewLink) {
      window.open(file.webViewLink, '_blank');
    }
  };

  const handleNavigateTo = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    fetchFiles(newPath[index].id);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-blue-500 text-white px-4 py-3 flex-shrink-0 flex justify-between items-center">
        <h2 className="font-semibold">📁 Google Drive</h2>
        <button
          onClick={() => fetchFiles(folderPath[folderPath.length - 1].id)}
          className="text-sm px-3 py-1 bg-white/20 hover:bg-white/30 rounded"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 flex-shrink-0 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2 overflow-auto text-sm">
        {folderPath.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            {index > 0 && <span className="text-zinc-400">›</span>}
            <button
              onClick={() => handleNavigateTo(index)}
              className="text-blue-500 hover:text-blue-600 hover:underline"
            >
              {item.name}
            </button>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-2">⏳</div>
              <p className="text-zinc-500">Loading files...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">{error}</p>
              <button
                onClick={
                  errorStatus === 401
                    ? handleSignIn
                    : () => fetchFiles('root')
                }
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
              >
                {errorStatus === 401 ? 'Sign in with Google' : 'Try Again'}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-auto h-full">
            {files.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-zinc-500">Empty folder</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => handleFolderClick(file)}
                    className={`p-4 flex items-center gap-3 ${
                      file.mimeType ===
                      'application/vnd.google-apps.folder'
                        ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        : 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    } transition`}
                  >
                    <span className="text-2xl flex-shrink-0">
                      {getMimeIcon(file.mimeType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(file.modifiedTime).toLocaleDateString()} •{' '}
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    {file.webViewLink && file.mimeType !==
                      'application/vnd.google-apps.folder' && (
                      <span className="text-xs text-zinc-400">🔗</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
