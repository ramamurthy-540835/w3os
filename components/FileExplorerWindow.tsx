'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}

interface FileExplorerWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

export default function FileExplorerWindow({
  windowId,
  onStateChange,
}: FileExplorerWindowProps) {
  const [currentPath, setCurrentPath] = useState('/home');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState(['/home']);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renamingTo, setRenamingTo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load directory from API
  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/fs?path=${encodeURIComponent(path)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load directory');
      }

      if (data.type === 'file') {
        // If it's a file, show its content (for now, just navigate back)
        setError('Cannot navigate to file');
        return;
      }

      // Sort: directories first, then by name
      const sorted = (data.items || []).sort((a: FileItem, b: FileItem) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      setFiles(sorted);
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load directory');
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load initial directory
  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath, loadDirectory]);

  // Handle drag and drop
  useEffect(() => {
    const zone = dropZoneRef.current;
    if (!zone) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add('bg-blue-50', 'dark:bg-blue-900/20');
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');

      if (!e.dataTransfer?.files) return;

      for (const file of e.dataTransfer.files) {
        await uploadFile(file);
      }
    };

    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('dragleave', handleDragLeave);
    zone.addEventListener('drop', handleDrop);

    return () => {
      zone.removeEventListener('dragover', handleDragOver);
      zone.removeEventListener('dragleave', handleDragLeave);
      zone.removeEventListener('drop', handleDrop);
    };
  }, [currentPath]);

  const uploadFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        const filePath = `${currentPath}/${file.name}`;

        const response = await fetch('/api/fs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload',
            path: filePath,
            content: base64,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload failed');
        }

        // Reload directory
        loadDirectory(currentPath);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    }
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    const parts = path.split('/').filter(Boolean);
    setBreadcrumbs(['/' + parts[0], ...parts.slice(1).map((p) => p)]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const parts = breadcrumbs.slice(0, index + 1);
    const newPath =
      parts.length === 1 ? parts[0] : parts.join('/').replace(/^\//, '');
    setCurrentPath(newPath || '/home');
    setBreadcrumbs(parts);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const folderPath = `${currentPath}/${newFolderName}`;
      const response = await fetch('/api/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mkdir',
          path: folderPath,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create folder');
      }

      setShowNewFolder(false);
      setNewFolderName('');
      loadDirectory(currentPath);
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    }
  };

  const handleDelete = async (path: string) => {
    if (!confirm(`Delete "${path.split('/').pop()}"?`)) return;

    try {
      const response = await fetch('/api/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          path,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      loadDirectory(currentPath);
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  const handleRename = async (oldPath: string) => {
    if (!renamingTo.trim()) {
      setRenaming(null);
      return;
    }

    try {
      const dir = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const newPath = `${dir}/${renamingTo}`;

      const response = await fetch('/api/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rename',
          path: oldPath,
          newPath,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rename');
      }

      setRenaming(null);
      setRenamingTo('');
      loadDirectory(currentPath);
    } catch (err: any) {
      setError(err.message || 'Failed to rename');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const getFileIcon = (name: string, type: 'file' | 'directory') => {
    if (type === 'directory') return '📁';
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'txt':
      case 'md':
        return '📝';
      case 'zip':
      case 'rar':
      case '7z':
        return '📦';
      case 'exe':
      case 'msi':
        return '⚙️';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mkv':
        return '🎬';
      case 'mp3':
      case 'wav':
      case 'flac':
        return '🎵';
      case 'py':
        return '🐍';
      case 'js':
      case 'ts':
        return '📜';
      default:
        return '📄';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* Toolbar */}
      <div className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700 p-3 flex gap-2 items-center flex-shrink-0">
        <button
          onClick={() => loadDirectory(currentPath)}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
          title="Refresh"
        >
          🔄
        </button>
        <button
          onClick={() => setShowNewFolder(true)}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
          title="New Folder"
        >
          📁➕
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
          title="Upload File"
        >
          📤
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) {
              for (const file of e.target.files) {
                uploadFile(file);
              }
            }
          }}
        />
        <div className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 font-mono truncate">
          {currentPath}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 px-4 py-2 flex items-center gap-1 flex-shrink-0 flex-wrap">
        {breadcrumbs.map((crumb, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <button
              onClick={() => handleBreadcrumbClick(idx)}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
            >
              {crumb === '/home' ? '🏠 Home' : crumb.split('/').pop()}
            </button>
            {idx < breadcrumbs.length - 1 && (
              <span className="text-zinc-400 dark:text-zinc-600">›</span>
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border-b border-red-300 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="text-red-600 dark:text-red-400 hover:underline"
          >
            ✕
          </button>
        </div>
      )}

      {/* File List */}
      <div
        ref={dropZoneRef}
        className="flex-1 overflow-auto transition-colors"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-zinc-600 dark:text-zinc-400">
                Empty folder (drag files here to upload)
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {/* Header */}
            <div className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 flex gap-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-300 dark:border-zinc-700">
              <div className="flex-1">Name</div>
              <div className="w-20 text-right">Size</div>
              <div className="w-32 text-right">Modified</div>
              <div className="w-16 text-right">Actions</div>
            </div>

            {/* Files */}
            {files.map((file) => (
              <div
                key={file.path}
                onClick={() => {
                  if (file.type === 'directory') {
                    handleNavigate(file.path);
                  } else {
                    setSelectedFile(file.path);
                  }
                }}
                onDoubleClick={() => {
                  if (file.type === 'directory') {
                    handleNavigate(file.path);
                  }
                }}
                className={`px-4 py-3 flex gap-4 items-center cursor-pointer transition-colors ${
                  selectedFile === file.path
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">
                    {getFileIcon(file.name, file.type)}
                  </span>
                  {renaming === file.path ? (
                    <input
                      autoFocus
                      type="text"
                      value={renamingTo}
                      onChange={(e) => setRenamingTo(e.target.value)}
                      onBlur={() => handleRename(file.path)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(file.path);
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-2 py-1 rounded border border-blue-400 dark:border-blue-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none"
                    />
                  ) : (
                    <span className="text-sm text-zinc-900 dark:text-zinc-50 truncate">
                      {file.name}
                    </span>
                  )}
                </div>
                <div className="w-20 text-right text-xs text-zinc-600 dark:text-zinc-400">
                  {file.type === 'file' ? formatFileSize(file.size) : '-'}
                </div>
                <div className="w-32 text-right text-xs text-zinc-600 dark:text-zinc-400 truncate">
                  {formatDate(file.modified)}
                </div>
                <div
                  className="w-16 flex justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setRenaming(file.path);
                      setRenamingTo(file.name);
                    }}
                    className="p-1 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded text-xs"
                    title="Rename"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(file.path)}
                    className="p-1 hover:bg-red-200 dark:hover:bg-red-900 rounded text-xs"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      {showNewFolder && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-50">
              New Folder
            </h3>
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowNewFolder(false);
              }}
              placeholder="Folder name..."
              className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNewFolder(false)}
                className="px-4 py-2 rounded bg-zinc-300 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-400 dark:hover:bg-zinc-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400">
        {files.length} item{files.length !== 1 ? 's' : ''} • Drag and drop
        files to upload
      </div>
    </div>
  );
}
