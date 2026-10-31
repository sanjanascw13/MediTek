import React, { useState } from 'react';
import { MessageSquare, Send, User, CheckCheck, Clock } from 'lucide-react';

export default function MessagesPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'Dr. Robert Chen',
      role: 'Chief Cardiologist',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      time: '10:45 AM',
      text: 'Patient John Deo exhibits stable vitals post-laparoscopy. Shift to step-down ward bed 205 at 14:00.',
      unread: false,
    },
    {
      id: 2,
      sender: 'Sister Clara Barton',
      role: 'Head Nurse - ETU',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
      time: '11:12 AM',
      text: 'Trauma Bay 2 restocked with sterile IV kits. Ready for afternoon surgeries.',
      unread: true,
    },
    {
      id: 3,
      sender: 'Dr. Sarah Connor',
      role: 'Neurology Department Head',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
      time: '11:30 AM',
      text: 'MRI report for Jens Brincker uploaded to lab reports repository.',
      unread: true,
    }
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setMessages([
      ...messages,
      {
        id: Date.now(),
        sender: 'Guy Hawkins (Manager)',
        role: 'Administration',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
        time: 'Just now',
        text: inputText.trim(),
        unread: false,
      }
    ]);
    setInputText('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Clinical Staff & Inter-Departmental Messaging</h2>
        <p className="text-sm text-gray-500">Real-time coordinated handovers, clinical alerts, and nursing notices</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-[650px] justify-between">
          <div className="space-y-4 overflow-y-auto pr-2 flex-1">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start space-x-3 p-4 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-all">
                <img
                  src={msg.avatar}
                  alt={msg.sender}
                  className="w-11 h-11 rounded-2xl object-cover ring-2 ring-lime-400/40"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900 text-sm">{msg.sender}</span>
                      <span className="text-xs text-lime-800 font-semibold ml-2">({msg.role})</span>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {msg.time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="pt-4 border-t border-gray-100 flex items-center gap-3">
            <input
              type="text"
              placeholder="Type urgent clinical dispatch or ward notification..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-sm hover:bg-[#8ddb16] transition-all flex items-center gap-2 shadow-md"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>Broadcast</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

