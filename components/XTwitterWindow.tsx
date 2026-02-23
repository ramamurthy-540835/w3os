'use client';

import { useState, useEffect } from 'react';

interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
}

interface XTwitterWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

export default function XTwitterWindow({
  windowId,
  onStateChange,
}: XTwitterWindowProps) {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [tweetText, setTweetText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchTimeline();
  }, []);

  const handleSignIn = () => {
    console.log('[XTwitterWindow] Sign in button clicked');
    const popup = window.open(
      '/api/auth/x',
      'x-auth',
      'width=500,height=600,left=200,top=100'
    );

    console.log('[XTwitterWindow] Popup opened:', popup);

    if (!popup) {
      console.error('[XTwitterWindow] Popup blocked! Check browser popup settings');
      setError('Popup blocked. Please allow popups for this site.');
      return;
    }

    const listener = (event: MessageEvent) => {
      console.log('[XTwitterWindow] Received message:', event.data);
      if (
        event.data?.type === 'oauth-success' &&
        event.data?.provider === 'x'
      ) {
        console.log('[XTwitterWindow] OAuth success! Fetching timeline...');
        window.removeEventListener('message', listener);
        // Refresh timeline after successful auth
        fetchTimeline();
      }
    };
    window.addEventListener('message', listener);
  };

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const response = await fetch('/api/social/x/timeline', { credentials: 'include' });
      if (!response.ok) {
        setErrorStatus(response.status);
        if (response.status === 401) {
          setError('Sign in with X to view timeline');
        } else {
          setError('Failed to fetch timeline');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setTweets(data.tweets || []);
      setUser(data.user);
    } catch (err) {
      setError('Failed to load timeline');
    }
    setLoading(false);
  };

  const handlePostTweet = async () => {
    if (!tweetText.trim()) return;

    setPosting(true);
    try {
      const response = await fetch('/api/social/x/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: tweetText }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to post tweet');
        setPosting(false);
        return;
      }

      setTweetText('');
      setComposing(false);
      fetchTimeline();
    } catch (err) {
      alert('Failed to post tweet');
    }
    setPosting(false);
  };

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-700 px-4 py-3 flex-shrink-0 flex justify-between items-center">
        <h2 className="font-bold text-xl">𝕏</h2>
        <button
          onClick={fetchTimeline}
          className="text-sm px-3 py-1 bg-white/10 hover:bg-white/20 rounded"
        >
          ↻
        </button>
      </div>

      {/* Compose Area */}
      {user && !composing && (
        <div
          onClick={() => setComposing(true)}
          className="border-b border-zinc-700 px-4 py-3 flex gap-4 cursor-pointer hover:bg-white/5 transition"
        >
          <img
            src={user.profile_image_url}
            alt={user.name}
            className="w-12 h-12 rounded-full flex-shrink-0"
          />
          <div className="flex-1">
            <p className="text-zinc-500 text-sm">What's happening!?</p>
          </div>
        </div>
      )}

      {composing && (
        <div className="border-b border-zinc-700 px-4 py-3 space-y-3">
          <div className="flex gap-4">
            <img
              src={user?.profile_image_url}
              alt={user?.name}
              className="w-12 h-12 rounded-full flex-shrink-0"
            />
            <textarea
              value={tweetText}
              onChange={(e) => setTweetText(e.target.value)}
              placeholder="What's happening!?"
              className="flex-1 bg-transparent text-xl text-white placeholder-zinc-500 focus:outline-none resize-none"
              rows={4}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setComposing(false);
                setTweetText('');
              }}
              className="px-4 py-2 rounded-full border border-zinc-600 hover:bg-white/10 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handlePostTweet}
              disabled={!tweetText.trim() || posting}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-full text-sm font-bold"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            {tweetText.length}/280
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-2">⏳</div>
              <p className="text-zinc-500">Loading timeline...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-zinc-400 mb-4">{error}</p>
              <button
                onClick={errorStatus === 401 ? handleSignIn : fetchTimeline}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
              >
                {errorStatus === 401 ? 'Sign in with X' : 'Try Again'}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-auto h-full">
            {tweets.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-2">🐦</div>
                  <p className="text-zinc-500">No tweets yet</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-zinc-700">
                {tweets.map((tweet) => (
                  <div
                    key={tweet.id}
                    className="px-4 py-3 hover:bg-white/5 transition cursor-pointer border-b border-zinc-700 last:border-b-0"
                  >
                    <p className="text-white text-sm leading-normal break-words mb-3">
                      {tweet.text}
                    </p>

                    <p className="text-xs text-zinc-500 mb-3">
                      {new Date(tweet.createdAt).toLocaleDateString()}{' '}
                      {new Date(tweet.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>

                    <div className="flex gap-8 text-xs text-zinc-500">
                      <span>💬 {tweet.replies}</span>
                      <span>🔄 {tweet.retweets}</span>
                      <span>❤️ {tweet.likes}</span>
                    </div>
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
