'use client';

import { useEffect, useState } from 'react';

interface Message {
  id: string;
  content: string;
  senderName: string;
  senderRole: string;
  senderEmail: string;
  attachments: string[];
  createdAt: string;
  readBy: string[];
  replies?: Message[];
}

interface MessageThread {
  id: string;
  title?: string;
  childId?: string;
  childName?: string;
  startedBy: string;
  startedByName: string;
  startedByRole: string;
  isAnnouncement: boolean;
  isResolved: boolean;
  messageCount: number;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
  };
  updatedAt: string;
  messages?: Message[];
}

interface MessagingClientProps {
  children: Array<{ id: string; firstName: string; lastName: string }>;
  kitaId: string;
}

export default function MessagingClient({ children, kitaId }: MessagingClientProps) {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch threads
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = new URL('/api/messages/threads', window.location.origin);
        if (selectedChildId) {
          url.searchParams.append('childId', selectedChildId);
        }

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error('Failed to fetch threads');

        const data = await response.json();
        setThreads(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch threads');
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, [selectedChildId]);

  // Fetch selected thread details
  useEffect(() => {
    if (!selectedThread) return;

    const fetchThreadDetails = async () => {
      try {
        const response = await fetch(`/api/messages/threads/${selectedThread.id}`);
        if (!response.ok) throw new Error('Failed to fetch thread');

        const data = await response.json();
        setSelectedThread(data);
      } catch (err) {
        console.error('Error fetching thread details:', err);
      }
    };

    fetchThreadDetails();
  }, [selectedThread?.id]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadContent.trim()) return;

    try {
      setIsSendingReply(true);
      const response = await fetch('/api/messages/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newThreadTitle || undefined,
          content: newThreadContent,
          childId: selectedChildId || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create thread');

      const newThread = await response.json();
      setThreads([newThread, ...threads]);
      setSelectedThread(newThread);
      setNewThreadTitle('');
      setNewThreadContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create thread');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyContent.trim()) return;

    try {
      setIsSendingReply(true);
      const response = await fetch(`/api/messages/threads/${selectedThread.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent,
        }),
      });

      if (!response.ok) throw new Error('Failed to send reply');

      setReplyContent('');
      // Re-fetch thread to get updated messages
      const threadResponse = await fetch(`/api/messages/threads/${selectedThread.id}`);
      if (threadResponse.ok) {
        const updatedThread = await threadResponse.json();
        setSelectedThread(updatedThread);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleResolveThread = async () => {
    if (!selectedThread) return;

    try {
      const response = await fetch(`/api/messages/threads/${selectedThread.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isResolved: !selectedThread.isResolved,
        }),
      });

      if (!response.ok) throw new Error('Failed to update thread');

      const updated = await response.json();
      setSelectedThread(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update thread');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Thread List */}
      <div className="lg:col-span-1 card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-secondary-900">Nachrichten</h3>
          <span className="chip chip-neutral">{threads.length}</span>
        </div>

        {/* Child Filter */}
        <div>
          <label className="label">Kind filtern (optional)</label>
          <select
            value={selectedChildId}
            onChange={(e) => {
              setSelectedChildId(e.target.value);
              setSelectedThread(null);
            }}
            className="input"
          >
            <option value="">Alle Nachrichten</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.firstName} {child.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Thread List */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto -mr-1 pr-1">
          {loading ? (
            <div className="text-secondary-500 text-sm py-4 text-center">Nachrichten werden geladen…</div>
          ) : threads.length === 0 ? (
            <div className="surface p-6 text-center text-secondary-500 text-sm">Keine Nachrichten vorhanden</div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${
                  selectedThread?.id === thread.id
                    ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="avatar avatar-sm">
                    {(thread.startedByName || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <p className="font-semibold text-secondary-900 text-sm truncate">
                        {thread.title || thread.childName || 'Neue Nachricht'}
                      </p>
                      {thread.isAnnouncement && <span className="chip chip-primary">📢 Ankündigung</span>}
                      {thread.isResolved && <span className="chip chip-success">✓ Gelöst</span>}
                    </div>
                    <p className="text-xs text-secondary-500">{thread.startedByName}</p>
                    {thread.lastMessage && (
                      <p className="text-xs text-secondary-500 truncate mt-1">
                        {thread.lastMessage.senderName}: {thread.lastMessage.content.substring(0, 40)}…
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Thread View & Reply */}
      <div className="lg:col-span-2 space-y-4">
        {selectedThread ? (
          <div className="card p-6 space-y-6">
            {/* Thread Header */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="avatar avatar-md">
                  {(selectedThread.startedByName || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-secondary-900 truncate">
                    {selectedThread.title || selectedThread.childName || 'Nachrichten'}
                  </h2>
                  <p className="text-sm text-secondary-500">
                    {selectedThread.startedByName} · {selectedThread.startedByRole}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {selectedThread.isAnnouncement && <span className="chip chip-primary">📢 Ankündigung</span>}
                    <span className="chip chip-neutral">
                      {selectedThread.messageCount} Nachricht{selectedThread.messageCount !== 1 ? 'en' : ''}
                    </span>
                  </div>
                </div>
              </div>
              {!selectedThread.isAnnouncement && (
                <button
                  onClick={handleResolveThread}
                  className={
                    selectedThread.isResolved
                      ? 'btn btn-sm chip-success'
                      : 'btn btn-secondary btn-sm'
                  }
                >
                  {selectedThread.isResolved ? '✓ Gelöst' : 'Als gelöst markieren'}
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="space-y-3 max-h-[40vh] overflow-y-auto -mr-1 pr-1">
              {selectedThread.messages?.map((message) => (
                <div key={message.id} className="surface p-4">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="avatar avatar-sm">
                        {(message.senderName || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-secondary-900 text-sm truncate">{message.senderName}</p>
                        <p className="text-xs text-secondary-500">{message.senderRole}</p>
                      </div>
                    </div>
                    <p className="text-xs text-secondary-500 whitespace-nowrap">
                      {new Date(message.createdAt).toLocaleString('de-CH')}
                    </p>
                  </div>
                  <p className="text-secondary-700 text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.attachments?.length > 0 && (
                    <div className="mt-2">
                      <span className="chip chip-neutral">
                        📎 {message.attachments.length} Datei{message.attachments.length !== 1 ? 'n' : ''}
                      </span>
                    </div>
                  )}

                  {/* Nested Replies */}
                  {message.replies?.length > 0 && (
                    <div className="mt-3 space-y-2 pl-3 border-l-2 border-gray-200">
                      {message.replies.map((reply) => (
                        <div key={reply.id} className="py-1">
                          <div className="flex justify-between items-baseline gap-3 mb-0.5">
                            <p className="text-sm font-medium text-secondary-900">{reply.senderName}</p>
                            <p className="text-xs text-secondary-500 whitespace-nowrap">
                              {new Date(reply.createdAt).toLocaleString('de-CH')}
                            </p>
                          </div>
                          <p className="text-sm text-secondary-700 whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSendReply} className="border-t border-gray-100 pt-4 space-y-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Ihre Antwort…"
                className="input resize-none"
                rows={3}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSendingReply || !replyContent.trim()}
                  className="btn btn-primary px-6"
                >
                  {isSendingReply ? 'Wird gesendet…' : 'Antwort senden'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card p-6 sm:p-8">
            <div className="mb-5">
              <p className="eyebrow">Neue Mitteilung</p>
              <h2 className="text-lg font-bold text-secondary-900 mt-1">Nachricht an Eltern starten</h2>
              <p className="page-subtitle">Schreiben Sie eine Mitteilung oder Ankündigung.</p>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="label">Betreff (optional)</label>
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  placeholder="Betreff (optional)"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Nachricht</label>
                <textarea
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
                  placeholder="Nachricht schreiben…"
                  className="input resize-none"
                  rows={4}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isCreatingThread || !newThreadContent.trim()}
                  className="btn btn-primary px-6"
                >
                  {isCreatingThread ? 'Wird erstellt…' : 'Nachricht starten'}
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  );
}
