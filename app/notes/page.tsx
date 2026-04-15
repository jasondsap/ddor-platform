'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    FileText, Plus, Loader2, Search, X, Pin, Clock,
    User, ChevronRight, Tag, Calendar, Trash2, CheckCircle2,
    AlertCircle, ArrowLeft
} from 'lucide-react';
import { REPORT_TYPE_LABELS } from '@/types';
import { Suspense } from 'react';

const NOTE_TYPES = ['General Note', 'Follow-up', 'Phone Call', 'Case Conference', 'Court Update', 'Treatment Update', 'Barrier', 'Other'];
const TAGS = ['Follow-up needed', 'Housing', 'Employment', 'Transportation', 'Mental Health', 'Substance Use', 'Family', 'Medical', 'Legal', 'Financial', 'Education'];

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
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const [form, setForm] = useState({
        title: '', content: '', note_type: 'General Note', note_date: new Date().toISOString().split('T')[0],
        client_id: preClientId || '', referral_id: '', report_id: '',
        tags: [] as string[], is_pinned: false,
    });

    useEffect(() => {
        if (!ddor) return;
        const p = new URLSearchParams();
        if (preClientId) p.set('client_id', preClientId);
        fetch(`/api/notes?${p}`).then(r => r.json()).then(d => setNotes(d.notes || [])).finally(() => setLoading(false));
        fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients || []));
    }, [ddor, preClientId]);

    const toggleTag = (tag: string) => setForm(p => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag] }));
    const u = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const handleCreate = async () => {
        if (!form.content.trim()) return;
        setSaving(true);
        const res = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (res.ok) {
            setShowCreate(false);
            setForm({ title: '', content: '', note_type: 'General Note', note_date: new Date().toISOString().split('T')[0], client_id: preClientId || '', referral_id: '', report_id: '', tags: [], is_pinned: false });
            setSuccessMsg('Note saved'); setTimeout(() => setSuccessMsg(''), 3000);
            // Refetch
            const p = new URLSearchParams();
            if (preClientId) p.set('client_id', preClientId);
            const d = await fetch(`/api/notes?${p}`).then(r => r.json());
            setNotes(d.notes || []);
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Archive this note?')) return;
        await fetch(`/api/notes/${id}`, { method: 'DELETE' });
        setNotes(prev => prev.filter(n => n.id !== id));
    };

    const handlePin = async (id: string, current: boolean) => {
        await fetch(`/api/notes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_pinned: !current }) });
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

                {successMsg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><p className="text-xs text-green-700">{successMsg}</p></div>}

                {/* Create Note */}
                {showCreate && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-ddor-blue/20">
                        <h2 className="font-semibold text-ddor-navy mb-4">Quick Note</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Title (optional)</label>
                                <input value={form.title} onChange={e => u('title', e.target.value)}
                                    className="w-full p-2.5 border rounded-lg text-sm" placeholder="Give your note a title..." />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                                    <input type="date" value={form.note_date} onChange={e => u('note_date', e.target.value)}
                                        className="w-full p-2.5 border rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                                    <select value={form.note_type} onChange={e => u('note_type', e.target.value)}
                                        className="w-full p-2.5 border rounded-lg text-sm">
                                        {NOTE_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Participant (optional)</label>
                                    <select value={form.client_id} onChange={e => u('client_id', e.target.value)}
                                        className="w-full p-2.5 border rounded-lg text-sm">
                                        <option value="">— None —</option>
                                        {clients.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} {c.ddor_id ? `(${c.ddor_id})` : ''}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Tags</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {TAGS.map(tag => (
                                        <button key={tag} type="button" onClick={() => toggleTag(tag)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${form.tags.includes(tag) ? 'bg-ddor-blue text-white border-ddor-blue' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Note Content *</label>
                                <textarea value={form.content} onChange={e => u('content', e.target.value)}
                                    className="w-full p-3 border rounded-lg text-sm min-h-[120px]"
                                    placeholder="Start typing your note... (Markdown supported)" />
                                <p className="text-xs text-gray-400 mt-1">Supports Markdown: **bold**, *italic*, - lists, &gt; quotes</p>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-white border rounded-lg text-sm">Cancel</button>
                                <button onClick={handleCreate} disabled={saving || !form.content.trim()}
                                    className="px-4 py-2 bg-ddor-blue text-white rounded-lg text-sm font-medium disabled:opacity-40 flex items-center gap-1">
                                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Save Note
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search notes..." className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm" />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
                </div>

                {/* Notes List */}
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">{search ? 'No notes match your search.' : 'No notes yet. Create your first note above.'}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(note => (
                            <div key={note.id} className={`bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow ${note.is_pinned ? 'border-l-4 border-amber-400' : ''}`}>
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {note.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                                            <p className="font-medium text-gray-900 truncate">{note.title || note.note_type || 'Untitled'}</p>
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs flex-shrink-0">{note.note_type}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{note.content}</p>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(note.note_date || note.created_at).toLocaleDateString()}</span>
                                            <span className="text-xs text-gray-400 flex items-center gap-1"><User className="w-3 h-3" />{note.author_name}</span>
                                            {note.client_name && (
                                                <button onClick={() => router.push(`/clients/${note.client_id}`)}
                                                    className="text-xs text-ddor-blue hover:underline flex items-center gap-1">
                                                    <User className="w-3 h-3" />{note.client_name}
                                                </button>
                                            )}
                                            {note.report_type && <span className="text-xs text-purple-600">{REPORT_TYPE_LABELS[note.report_type as keyof typeof REPORT_TYPE_LABELS] || note.report_type}</span>}
                                        </div>
                                        {note.tags && note.tags.length > 0 && note.tags[0] !== '' && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {note.tags.map((tag: string) => (
                                                    <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button onClick={() => handlePin(note.id, note.is_pinned)} className="p-1.5 hover:bg-gray-100 rounded" title={note.is_pinned ? 'Unpin' : 'Pin'}>
                                            <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'text-amber-500' : 'text-gray-300'}`} />
                                        </button>
                                        <button onClick={() => handleDelete(note.id)} className="p-1.5 hover:bg-red-50 rounded" title="Archive">
                                            <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
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
