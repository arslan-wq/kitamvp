'use client';

import { useState, useEffect } from 'react';

export default function MessageView() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const childRes = await fetch('/api/children');
        if (!childRes.ok) throw new Error('Failed to fetch children');
        const childData = await childRes.json();
        setChildren(childData);

        if (childData.length > 0) {
          setSelectedChildId(childData[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/messages?childId=${selectedChildId}`);
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
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChildId,
          content: newMessage,
          attachments: [],
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      const data = await response.json();

      setMessages([...messages, data]);
      setNewMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-secondary-500">Laden...</div>;
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const childInitials = selectedChild
    ? `${selectedChild.firstName?.[0] ?? ''}${selectedChild.lastName?.[0] ?? ''}`.toUpperCase()
    : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="eyebrow">Kommunikation</p>
          <h1 className="page-title">Nachrichten</h1>
          <p className="page-subtitle">Austausch mit den Eltern pro Kind</p>
        </div>
        <div className="w-full sm:w-64">
          <label className="label">Kind auswählen</label>
          <select
            value={selectedChildId || ''}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="input"
          >
            <option value="">-- Bitte wählen --</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.firstName} {child.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="chip chip-error w-full justify-start px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Messages Thread */}
      {selectedChildId ? (
        <div className="card overflow-hidden">
          {/* Thread-Kopf */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="avatar avatar-md">{childInitials || '·'}</div>
            <div className="min-w-0">
              <p className="font-semibold text-secondary-900 truncate">
                {selectedChild ? `${selectedChild.firstName} ${selectedChild.lastName}` : 'Konversation'}
              </p>
              <p className="text-xs text-secondary-500">
                {messages.length} {messages.length === 1 ? 'Nachricht' : 'Nachrichten'}
              </p>
            </div>
          </div>

          {/* Verlauf */}
          <div className="surface m-4 p-4 h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="empty-state-icon">💬</div>
                <p className="text-secondary-500">Noch keine Nachrichten</p>
                <p className="text-sm text-secondary-400 mt-1">Schreibe die erste Nachricht unten.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const senderInitials = (msg.senderName || '?')
                    .split(' ')
                    .map((p: string) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  return (
                    <div key={msg.id} className="flex gap-3">
                      <div className="avatar avatar-sm">{senderInitials}</div>
                      <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 shadow-card p-4">
                        <div className="flex items-baseline justify-between gap-3 mb-1.5">
                          <div className="min-w-0">
                            <span className="font-semibold text-secondary-900">{msg.senderName}</span>
                            <span className="text-xs text-secondary-400 ml-2 truncate">{msg.senderEmail}</span>
                          </div>
                          <span className="text-xs text-secondary-400 shrink-0">
                            {new Date(msg.createdAt).toLocaleString('de-CH')}
                          </span>
                        </div>
                        <p className="text-secondary-700 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Eingabe-Leiste */}
          <form onSubmit={handleSendMessage} className="border-t border-gray-100 p-4">
            <div className="flex items-end gap-3">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Nachricht eingeben..."
                rows={2}
                className="input flex-1 resize-none"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="btn btn-primary px-6 shrink-0"
              >
                {sending ? 'Senden...' : 'Senden'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <p className="text-secondary-500">Wähle ein Kind aus, um die Nachrichten anzuzeigen.</p>
        </div>
      )}
    </div>
  );
}
