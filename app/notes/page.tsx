'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    FileText, Plus, Loader2, Search, X, CheckCircle2,
} from 'lucide-react';
import { NoteCard } from '@/components/NoteCard';
import { NoteForm, type NoteFormValues } from '@/components/NoteForm';

function NotesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preClientId = searchParams.get('client_id');
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;

    const [notes, setNotes] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(!!preClientId);
    const [successMsg, setSuccessMsg] = useState('');

    const fetchNotes = async () => {
        const p = new URLSearchParams();
        if (preClientId) p.set('client_id', preClientId);
        const d = await fetch(`/api/notes?${p}`).then(r => r.json());
        setNotes(d.notes || []);
    };

    useEffect(() => {
        if (!ddor) return;
        fetchNotes().finally(() => setLoading(false));
        fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients || []));
    }, [ddor, preClientId]);

    const handleSave = async (values: NoteFormValues) => {
        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });
        if (res.ok) {
            setShowCreate(false);
            setSuccessMsg('Note saved');
            setTimeout(() => setSuccessMsg(''), 3000);
            await fetchNotes();
        }
    };

    const handleArchive = async (id: string) => {
        if (!confirm('Archive this note?')) return;
        await fetch(`/api/notes/${id}`, { method: 'DELETE' });
        setNotes(prev => prev.filter(n => n.id !== id));
    };

    const handlePin = async (id: string, current: boolean) => {
        await fetch(`/api/notes/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_pinned: !current }),
        });
        setNotes(prev => prev.map(n => n.id === id ? { ...n, is_pinned: !current } : n));
    };

    const filtered = notes.filter(n =>
        !search || `${n.title || ''} ${n.content} ${n.client_name || ''} ${n.author_name || ''}`.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-ddor-navy">Notes</h1>
                        <p className="text-sm text-gray-500 mt-1">{notes.length} notes • Quick documentation for clients, referrals, and cases</p>
                    </div>
                    <button onClick={() => setShowCreate(!showCreate)}
                        className="flex items-center gap-2 px-4 py-2 bg-ddor-blue text-white rounded-lg font-medium hover:bg-[#156090] text-sm">
                        <Plus className="w-4 h-4" /> New Note
                    </button>
                </div>

                {successMsg && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <p className="text-xs text-green-700">{successMsg}</p>
                    </div>
                )}

                {showCreate && (
                    <NoteForm
                        initialClientId={preClientId || ''}
                        clients={clients}
                        onSave={handleSave}
                        onCancel={() => setShowCreate(false)}
                    />
                )}

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search notes..." className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm" />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                </div>

                {filtered.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">{search ? 'No notes match your search.' : 'No notes yet. Create your first note above.'}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(note => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                onPin={handlePin}
                                onArchive={handleArchive}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function NotesPage() {
    return <Suspense fallback={<div className="min-h-screen bg-gray-50" />}><NotesContent /></Suspense>;
}
