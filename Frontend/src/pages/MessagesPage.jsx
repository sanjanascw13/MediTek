import React, { useCallback, useEffect, useState } from 'react';
import { Clock, MessageSquare, Send } from 'lucide-react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState, UnavailableNotice } from '../components/ApiState';

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [recipient, setRecipient] = useState('ALL CLINICAL STAFF');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setMessages(await api.getMessages());
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load demo messages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (api.isMockMode()) loadMessages();
  }, [loadMessages]);

  if (!api.isMockMode()) {
    return <UnavailableNotice module="Clinical messaging" detail="The backend has no messaging or handover endpoint. Messages are not broadcast or persisted in live mode." />;
  }

  const handleSend = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const created = await api.sendMessage(inputText, recipient);
      setMessages((current) => [...current, created]);
      setInputText('');
      setSuccess('Demo message added to this local session only; it was not broadcast to hospital staff.');
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to send demo message.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"><h1 className="text-2xl font-black text-gray-900">Clinical Staff & Inter-Departmental Messaging</h1><p className="text-sm text-gray-500">Staff communications and clinical notices</p></header>
      {error && <ErrorState message={error} onRetry={loadMessages} />}
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
      <section className="flex h-[650px] flex-col justify-between rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="space-y-4 overflow-y-auto pr-2">
          {loading ? <LoadingState label="Loading demo messages..." /> : messages.length === 0 ? <EmptyState>No messages are available.</EmptyState> : messages.map((message) => (
            <article key={message.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-sm font-bold text-lime-900">{message.sender?.[0] || 'M'}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-gray-900">{message.sender} <span className="ml-1 text-xs font-semibold text-lime-800">({message.role})</span></p><span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="h-3 w-3" />{message.time}</span></div>{message.recipient && <p className="mt-1 text-[11px] font-semibold text-gray-500">To: {message.recipient}</p>}<p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{message.text}</p></div>
            </article>
          ))}
        </div>
        <form onSubmit={handleSend} className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row">
          <label className="sr-only" htmlFor="demo-message-recipient">Recipient</label>
          <select id="demo-message-recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm"><option>ALL CLINICAL STAFF</option><option>ADMIN</option><option>DOCTOR</option><option>STAFF</option></select>
          <label className="sr-only" htmlFor="demo-message-text">Message text</label>
          <input id="demo-message-text" required maxLength={1000} value={inputText} onChange={(event) => setInputText(event.target.value)} placeholder="Write a demo note..." className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400" />
          <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#a3e635] px-5 py-3 text-sm font-bold text-gray-900 disabled:opacity-50"><Send className="h-4 w-4" />{saving ? 'Sending…' : 'Add demo note'}</button>
        </form>
      </section>
    </div>
  );
}
