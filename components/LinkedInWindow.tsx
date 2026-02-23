'use client';

import { useState, useEffect } from 'react';

interface LinkedInWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

export default function LinkedInWindow({
  windowId,
  onStateChange,
}: LinkedInWindowProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSignIn = () => {
    console.log('[LinkedInWindow] Sign in button clicked');
    const popup = window.open(
      '/api/auth/linkedin',
      'linkedin-auth',
      'width=500,height=600,left=200,top=100'
    );

    console.log('[LinkedInWindow] Popup opened:', popup);

    if (!popup) {
      console.error('[LinkedInWindow] Popup blocked! Check browser popup settings');
      setError('Popup blocked. Please allow popups for this site.');
      return;
    }

    const listener = (event: MessageEvent) => {
      console.log('[LinkedInWindow] Received message:', event.data);
      if (
        event.data?.type === 'oauth-success' &&
        event.data?.provider === 'linkedin'
      ) {
        console.log('[LinkedInWindow] OAuth success! Fetching profile...');
        window.removeEventListener('message', listener);
        // Refresh profile after successful auth
        fetchProfile();
      }
    };
    window.addEventListener('message', listener);
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const response = await fetch('/api/social/linkedin/feed', { credentials: 'include' });
      if (!response.ok) {
        setErrorStatus(response.status);
        if (response.status === 401) {
          setError('Sign in with LinkedIn to view your profile');
        } else {
          setError('Failed to fetch profile');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setProfile(data.profile);
    } catch (err) {
      setError('Failed to load profile');
    }
    setLoading(false);
  };

  const handlePostUpdate = async () => {
    if (!postText.trim()) return;

    setPosting(true);
    try {
      const response = await fetch('/api/social/linkedin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: postText }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to post');
        setPosting(false);
        return;
      }

      setPostText('');
      setComposing(false);
      // Refresh profile
      fetchProfile();
    } catch (err) {
      alert('Failed to post update');
    }
    setPosting(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-3 flex-shrink-0 flex justify-between items-center">
        <h2 className="font-bold text-lg">💼 LinkedIn</h2>
        <button
          onClick={fetchProfile}
          className="text-sm px-3 py-1 bg-white/20 hover:bg-white/30 rounded"
        >
          ↻
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-2">⏳</div>
              <p className="text-zinc-500">Loading profile...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">{error}</p>
              <button
                onClick={errorStatus === 401 ? handleSignIn : fetchProfile}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-sm"
              >
                {errorStatus === 401 ? 'Sign in with LinkedIn' : 'Try Again'}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && profile && (
          <div className="space-y-4 p-4">
            {/* Profile Card */}
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-start gap-4">
                {profile.picture && (
                  <img
                    src={profile.picture}
                    alt={profile.name}
                    className="w-16 h-16 rounded-full flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{profile.name}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {profile.email}
                  </p>
                </div>
              </div>

              {!composing && (
                <button
                  onClick={() => setComposing(true)}
                  className="w-full mt-4 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm font-medium transition"
                >
                  Start a post
                </button>
              )}
            </div>

            {/* Compose Area */}
            {composing && (
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 space-y-3">
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder="What do you want to talk about?"
                  className="w-full p-3 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-black dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  autoFocus
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setComposing(false);
                      setPostText('');
                    }}
                    className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePostUpdate}
                    disabled={!postText.trim() || posting}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded text-sm font-medium transition"
                  >
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}

            {/* Limited Feed Message */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <span className="font-semibold">Note:</span> LinkedIn API v2 has
                limited feed access. For full functionality, use the web browser
                to view posts and engage with your network.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
