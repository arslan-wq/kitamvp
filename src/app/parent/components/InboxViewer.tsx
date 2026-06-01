'use client';

import { useEffect, useState } from 'react';

interface Message {
  id: string;
  content: string;
  senderName: string;
  senderRole: string;
  attachments: string[];
  createdAt: string;
  replies?: Message[];
}

interface MessageThread {
  id: string;
  title?: string;
  childName?: string;
  messageCount: number;
  isResolved: boolean;
  startedByName: string;
  updatedAt: string;
  messages?: Message[];
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  attachments: string[];
  createdByName: string;
  publishedAt: string;
  expiresAt?: string;
}

interface InboxViewerProps {
  kitaId: string;
}

export default function InboxViewer({ kitaId }: InboxViewerProps) {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'announcements'>('messages');

  // Fetch threads and announcements
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch threads
        const threadsResponse = await fetch('/api/messages/threads');
        if (!threadsResponse.ok) throw new Error('Failed to fetch threads');
        const threadsData = await threadsResponse.json();
        setThreads(threadsData);

        // Fetch announcements
        const announcementsResponse = await fetch('/api/announcements');
        if (!announcementsResponse.ok) throw new Error('Failed to fetch announcements');
        const announcementsData = await announcementsResponse.json();
        setAnnouncements(announcementsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load inbox');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch thread details when selected
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
      // Re-fetch thread
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

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('messages');
            setSelectedThread(null);
          }}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'messages'
              ? 'text-primary border-primary'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          💬 Nachrichten ({threads.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('announcements');
            setSelectedThread(null);
          }}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'announcements'
              ? 'text-primary border-primary'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          📢 Ankündigungen ({announcements.length})
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          ❌ {error}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Thread List */}
          <div className="lg:col-span-1 space-y-2 max-h-[60vh] overflow-y-auto">
            {threads.length === 0 ? (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
                ℹ️ Keine Nachrichten vorhanden
              </div>
            ) : (
              threads.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition ${
                    selectedThread?.id === thread.id
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-200 hover:border-primary hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-gray-900">
                      {thread.childName || 'Nachricht'}
                    </p>
                    {thread.isResolved && <span className="text-green-600">✓</span>}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{thread.startedByName}</p>
                  <p className="text-xs text-gray-500">
                    {thread.messageCount} Nachricht{thread.messageCount !== 1 ? 'en' : ''}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Thread View */}
          <div className="lg:col-span-2">
            {selectedThread ? (
              <div className="bg-white rounded-xl shadow-soft p-6 space-y-6">
                {/* Header */}
                <div className="border-b pb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {selectedThread.childName || 'Nachricht'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Von {selectedThread.startedByName}
                  </p>
                </div>

                {/* Messages */}
                <div className="space-y-4 max-h-[40vh] overflow-y-auto">
                  {selectedThread.messages?.map(message => (
                    <div key={message.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-semibold text-gray-900">{message.senderName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleString('de-CH')}
                        </p>
                      </div>
                      <p className="text-gray-700">{message.content}</p>
                      {message.attachments?.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          📎 {message.attachments.length} Datei{message.attachments.length !== 1 ? 'n' : ''}
                        </div>
                      )}

                      {/* Nested replies */}
                      {message.replies?.length > 0 && (
                        <div className="mt-3 space-y-2 bg-gray-50 p-2 rounded">
                          {message.replies.map(reply => (
                            <div key={reply.id} className="border-l-2 border-gray-300 pl-3 py-1">
                              <div className="flex justify-between mb-1">
                                <p className="text-sm font-medium text-gray-900">{reply.senderName}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(reply.createdAt).toLocaleString('de-CH')}
                                </p>
                              </div>
                              <p className="text-sm text-gray-700">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="border-t pt-4 space-y-4">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Ihre Antwort..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    rows={3}
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || !replyContent.trim()}
                    className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                  >
                    {isSendingReply ? 'Wird gesendet...' : 'Antwort senden'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-soft p-8 text-center text-gray-500">
                Wählen Sie eine Nachricht aus, um zu antworten
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
              ℹ️ Keine Ankündigungen vorhanden
            </div>
          ) : (
            announcements.map(announcement => (
              <div key={announcement.id} className="bg-white rounded-xl shadow-soft p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{announcement.title}</h3>
                    <p className="text-sm text-gray-600">{announcement.createdByName}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(announcement.publishedAt).toLocaleDateString('de-CH')}
                  </p>
                </div>
                <p className="text-gray-700 mb-3">{announcement.content}</p>
                {announcement.attachments?.length > 0 && (
                  <div className="text-sm text-gray-600">
                    📎 {announcement.attachments.length} Datei{announcement.attachments.length !== 1 ? 'n' : ''}
                  </div>
                )}
                {announcement.expiresAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Gültig bis {new Date(announcement.expiresAt).toLocaleDateString('de-CH')}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
