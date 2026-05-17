'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { MentionTextarea } from '@/components/MentionTextarea';
import { parseMentions, type MentionSuggestion } from '@/lib/mentions';

export const NOTE_TYPES = ['General Note', 'Follow-up', 'Phone Call', 'Case Conference', 'Court Update', 'Treatment Update', 'Barrier', 'Other'];
export const NOTE_TAGS = ['Follow-up needed', 'Housing', 'Employment', 'Transportation', 'Mental Health', 'Substance Use', 'Family', 'Medical', 'Legal', 'Financial', 'Education'];

export interface NoteFormValues {
    title: string;
    content: string;
    note_type: string;
    note_date: string;
    client_id: string;
    referral_id: string;
    report_id: string;
    tags: string[];
    is_pinned: boolean;
    /**
     * Parsed at submit-time from the content via parseMentions(). The caller
     * forwards this to POST /api/notes so the server can persist them.
     */
    mentions: ReturnType<typeof parseMentions>;
}

export interface NoteFormProps {
    /** Pre-fill client_id (e.g., when on the client detail page). */
    initialClientId?: string;
    /** Hide the participant picker entirely (used on client detail page). */
    hideParticipantField?: boolean;
    /** Required when hideParticipantField is false. Used to populate the dropdown. */
    clients?: { id: string; first_name: string; last_name: string; ddor_id?: string }[];
    /**
     * When provided, the content area becomes a MentionTextarea using these
     * suggestions. When omitted, a plain textarea is used (standalone /notes
     * page does not have a single client context until you pick a participant).
     */
    getMentionSuggestions?: (query: string) => Promise<MentionSuggestion[]>;
    /** Caller handles the POST and any side effects. */
    onSave: (values: NoteFormValues) => Promise<void>;
    onCancel: () => void;
}

/**
 * Quick note form. Mirrors the form pattern from app/notes/page.tsx but is
 * extracted so the client detail page (with hideParticipantField) and the
 * standalone /notes page share the same UI.
 */
export function NoteForm({
    initialClientId,
    hideParticipantField,
    clients = [],
    getMentionSuggestions,
    onSave,
    onCancel,
}: NoteFormProps) {
    const [form, setForm] = useState<Omit<NoteFormValues, 'mentions'>>({
        title: '',
        content: '',
        note_type: 'General Note',
        note_date: new Date().toISOString().split('T')[0],
        client_id: initialClientId || '',
        referral_id: '',
        report_id: '',
        tags: [],
        is_pinned: false,
    });
    const [saving, setSaving] = useState(false);

    const u = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));
    const toggleTag = (tag: string) => setForm(p => ({
        ...p,
        tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag],
    }));

    const handleSave = async () => {
        if (!form.content.trim()) return;
        setSaving(true);
        try {
            await onSave({
                ...form,
                mentions: parseMentions(form.content),
            });
        } finally {
            setSaving(false);
        }
    };

    const showParticipant = !hideParticipantField;
    const gridCols = showParticipant ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-ddor-blue/20">
            <h2 className="font-semibold text-ddor-navy mb-4">Quick Note</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title (optional)</label>
                    <input value={form.title} onChange={e => u('title', e.target.value)}
                        className="w-full p-2.5 border rounded-lg text-sm" placeholder="Give your note a title..." />
                </div>

                <div className={`grid grid-cols-1 ${gridCols} gap-3`}>
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
                    {showParticipant && (
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Participant (optional)</label>
                            <select value={form.client_id} onChange={e => u('client_id', e.target.value)}
                                className="w-full p-2.5 border rounded-lg text-sm">
                                <option value="">— None —</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.first_name} {c.last_name} {c.ddor_id ? `(${c.ddor_id})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tags</label>
                    <div className="flex flex-wrap gap-1.5">
                        {NOTE_TAGS.map(tag => (
                            <button key={tag} type="button" onClick={() => toggleTag(tag)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                    form.tags.includes(tag)
                                        ? 'bg-ddor-blue text-white border-ddor-blue'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}>
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Note Content *</label>
                    {getMentionSuggestions ? (
                        <MentionTextarea
                            value={form.content}
                            onChange={(v) => u('content', v)}
                            getSuggestions={getMentionSuggestions}
                            placeholder="Start typing your note... (@ to mention, Markdown supported)"
                            rows={5}
                            className="w-full p-3 border rounded-lg text-sm min-h-[120px]"
                            helperText="@ to mention a user. Supports Markdown: **bold**, *italic*, - lists, > quotes"
                        />
                    ) : (
                        <>
                            <textarea value={form.content} onChange={e => u('content', e.target.value)}
                                className="w-full p-3 border rounded-lg text-sm min-h-[120px]"
                                placeholder="Start typing your note... (Markdown supported)" />
                            <p className="text-xs text-gray-400 mt-1">Supports Markdown: **bold**, *italic*, - lists, &gt; quotes</p>
                        </>
                    )}
                </div>

                <div className="flex gap-2">
                    <button onClick={onCancel} className="px-4 py-2 bg-white border rounded-lg text-sm">Cancel</button>
                    <button onClick={handleSave} disabled={saving || !form.content.trim()}
                        className="px-4 py-2 bg-ddor-blue text-white rounded-lg text-sm font-medium disabled:opacity-40 flex items-center gap-1">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Save Note
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NoteForm;
