'use client';

import { useState, useEffect } from 'react';

interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

interface GmailWindowProps {
  windowId: string;
  onStateChange: (state: Record<string, any>) => void;
}

export default function GmailWindow({
  windowId,
  onStateChange,
}: GmailWindowProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [emailBody, setEmailBody] = useState<string>('');
  const [fullEmail, setFullEmail] = useState<any>(null);

  useEffect(() => {
    fetchEmails();
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
        // Refresh emails after successful auth
        fetchEmails();
      }
    };
    window.addEventListener('message', listener);
  };

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const response = await fetch('/api/google/gmail');
      if (!response.ok) {
        setErrorStatus(response.status);
        if (response.status === 401) {
          setError('Sign in with Google to access Gmail');
        } else {
          setError('Failed to fetch emails');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setEmails(data.emails || []);
    } catch (err) {
      setError('Failed to load emails');
    }
    setLoading(false);
  };

  const fetchEmailDetail = async (emailId: string) => {
    try {
      const response = await fetch(`/api/google/gmail/${emailId}`);
      if (response.ok) {
        const data = await response.json();
        setFullEmail(data);
        setEmailBody(data.body);
      }
    } catch (err) {
      console.error('Failed to fetch email details', err);
    }
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email.id);
    fetchEmailDetail(email.id);
  };

  const handleBack = () => {
    setSelectedEmail(null);
    setFullEmail(null);
    setEmailBody('');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-3 flex-shrink-0 flex justify-between items-center">
        <h2 className="font-semibold">📧 Gmail</h2>
        <button
          onClick={fetchEmails}
          className="text-sm px-3 py-1 bg-white/20 hover:bg-white/30 rounded"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-2">⏳</div>
              <p className="text-zinc-500">Loading emails...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">{error}</p>
              <button
                onClick={errorStatus === 401 ? handleSignIn : fetchEmails}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
              >
                {errorStatus === 401 ? 'Sign in with Google' : 'Try Again'}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && selectedEmail && (
          <div className="flex flex-col h-full overflow-auto p-4">
            <button
              onClick={handleBack}
              className="text-blue-500 hover:text-blue-600 text-sm mb-4"
            >
              ← Back to inbox
            </button>

            {fullEmail && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    From:
                  </p>
                  <p className="text-sm">{fullEmail.from}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    To:
                  </p>
                  <p className="text-sm">{fullEmail.to}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    Subject:
                  </p>
                  <p className="text-sm font-medium">{fullEmail.subject}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    Date:
                  </p>
                  <p className="text-sm">{fullEmail.date}</p>
                </div>

                <div className="border-t border-zinc-300 dark:border-zinc-700 pt-4">
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                    Message:
                  </p>
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded text-sm whitespace-pre-wrap overflow-auto max-h-64">
                    {emailBody || '(no message body)'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !selectedEmail && (
          <div className="overflow-auto h-full">
            {emails.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-zinc-500">No emails</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => handleEmailClick(email)}
                    className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-sm truncate flex-1">
                        {email.from}
                      </p>
                      <span className="text-xs text-zinc-500 ml-2 flex-shrink-0">
                        {new Date(email.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-semibold mb-1 truncate">
                      {email.subject}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                      {email.snippet}
                    </p>
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
