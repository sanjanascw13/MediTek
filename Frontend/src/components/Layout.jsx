import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ErrorBoundary from './ErrorBoundary';
import { Sparkles, X, PlusCircle, Check } from 'lucide-react';

export default function Layout() {
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [notes, setNotes] = useState([
    'Review ETU trauma surge protocol with Dr. Chen.',
    'Verify delivery of 450ml O+ blood units from regional depot.',
    'Confirm ICU Bed #04 ventilator maintenance check before 15:00.'
  ]);
  const [newNote, setNewNote] = useState('');

  const addNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNotes([...notes, newNote.trim()]);
    setNewNote('');
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7f4] text-gray-900 font-sans">
      {/* Sidebar with dark forest green gradient styling matching reference */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Header onQuickAction={() => setShowSpaceModal(true)} />

        <main className="flex-1 px-8 py-6 max-w-7xl w-full mx-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* + Space Quick Action Drawer / Modal */}
      {showSpaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-lime-100 text-lime-800">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">MediTek Space</h3>
                  <p className="text-xs text-gray-500">Quick clinical notepad & team directives</p>
                </div>
              </div>
              <button
                onClick={() => setShowSpaceModal(false)}
                className="p-1 rounded-xl text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={addNote} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add quick clinical directive..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-[#a3e635] text-[#142008] font-semibold text-xs hover:bg-[#8ddb16] transition-all flex items-center gap-1"
                >
                  <PlusCircle className="w-4 h-4" /> Add
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {notes.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-500"></span>
                    <span>{item}</span>
                  </div>
                  <button
                    onClick={() => setNotes(notes.filter((_, i) => i !== idx))}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

