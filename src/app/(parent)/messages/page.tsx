'use client';

import { useState, useEffect } from 'react';

interface Message {
  id: string;
  childId: string;
  child: { firstName: string; lastName: string };
  content: string;
  senderName: string;
  createdAt: string;
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

export default function ParentMessagesPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await fetch('/api/parent/children');
        if (!response.ok) throw new Error('Failed to fetch children');
        const data = await response.json();
        setChildren(data);
        if (data.length > 0) {
          setSelectedChildId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/parent/messages?childId=${selectedChildId}`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        setMessages(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    fetchMessages();
  }, [selectedChildId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChildId) return;

    setSending(true);
    try {
      const response = await fetch('/api/parent/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChildId,
          content: newMessage,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      const data = await response.json();

      setMessages([data, ...messages]);
      setNewMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-secondary-500">Lädt...</div>;
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">💬 Nachrichten</h1>
          <p className="page-subtitle">Im Austausch mit dem KiTA-Team bleiben</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-value">{children.length}</p>
          <p className="stat-label">Kinder</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{messages.length}</p>
          <p className="stat-label">Nachrichten</p>
        </div>
        <div className="stat-card col-span-2 lg:col-span-1">
          <p className="stat-value">{selectedChild ? selectedChild.firstName : '—'}</p>
          <p className="stat-label">Aktiver Chat</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="card p-5 lg:col-span-1">
          <p className="eyebrow mb-3">Kind auswählen</p>
          {children.length === 0 ? (
            <p className="text-sm text-secondary-500">Keine Kinder hinterlegt</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              {children.map((child) => {
                const active = child.id === selectedChildId;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedChildId(child.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
                      active
                        ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="avatar avatar-md">
                      {child.firstName.charAt(0)}
                      {child.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-secondary-900 truncate">{child.firstName}</p>
                      <p className="text-xs text-secondary-500 truncate">{child.lastName}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedChildId && (
          <div className="card p-0 lg:col-span-2 flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="avatar avatar-sm">
                {selectedChild?.firstName.charAt(0)}
                {selectedChild?.lastName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-secondary-900 truncate">
                  {selectedChild ? `${selectedChild.firstName} ${selectedChild.lastName}` : 'Chat'}
                </p>
                <p className="text-xs text-secondary-500">Verlauf mit dem KiTA-Team</p>
              </div>
            </div>

            <div className="surface m-4 p-4 h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="empty-state border-0 shadow-none bg-transparent p-0 h-full flex flex-col items-center justify-center">
                  <div className="empty-state-icon">📭</div>
                  <p className="text-secondary-500">Noch keine Nachrichten</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-white rounded-xl border border-gray-100 shadow-card p-4"
                    >
                      <div className="flex justify-between items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="avatar avatar-sm">{msg.senderName.charAt(0)}</div>
                          <p className="font-semibold text-secondary-900 truncate">{msg.senderName}</p>
                        </div>
                        <p className="text-xs text-secondary-500 shrink-0">
                          {new Date(msg.createdAt).toLocaleString('de-CH')}
                        </p>
                      </div>
                      <p className="text-secondary-700 leading-relaxed">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="border-t border-gray-100 px-4 py-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Nachricht eingeben..."
                  rows={3}
                  className="input flex-1 resize-none"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="btn btn-primary px-6 sm:self-end"
                >
                  {sending ? 'Senden...' : 'Senden'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
