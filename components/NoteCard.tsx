'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Pin, Trash2, User } from 'lucide-react';
import { REPORT_TYPE_LABELS } from '@/types';
import { renderMentions } from '@/lib/mentions';

export interface NoteCardProps {
    note: any;
    onPin: (id: string, current: boolean) => void;
    onArchive: (id: string) => void;
    /** When true, the card shows a ring highlight (used by deep-link). */
    highlighted?: boolean;
    /** When true, scrolls itself into view on mount. */
    scrollIntoViewOnMount?: boolean;
    /** Hide the "go to client" link (used on the client-detail page where it's redundant). */
    hideClientLink?: boolean;
}

/**
 * One row in a note list. Renders title, type, content preview (with mentions
 * rendered as styled spans/links), author, date, tags, pin + archive controls.
 *
 * Extracted from app/notes/page.tsx so the same UI is used on the standalone
 * /notes page and the Notes tab of the client detail page.
 */
export function NoteCard({ note, onPin, onArchive, highlighted, scrollIntoViewOnMount, hideClientLink }: NoteCardProps) {
    const router = useRouter();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollIntoViewOnMount && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [scrollIntoViewOnMount]);

    const baseRing = note.is_pinned ? 'border-l-4 border-amber-400' : '';
    const highlightRing = highlighted ? 'ring-2 ring-ddor-blue ring-offset-2 transition-shadow duration-300' : '';

    return (
        <div
            ref={ref}
            id={`note-${note.id}`}
            className={`bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow ${baseRing} ${highlightRing}`}
        >
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {note.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                        <p className="font-medium text-gray-900 truncate">{note.title || note.note_type || 'Untitled'}</p>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs flex-shrink-0">{note.note_type}</span>
                    </div>
                    <div
                        className="text-sm text-gray-600 line-clamp-2 mb-2 whitespace-pre-wrap"
                        // User mentions in notes are non-clickable styled spans (no profile page yet).
                        // Client mentions remain clickable. See lib/mentions.ts.
                        dangerouslySetInnerHTML={{ __html: renderMentions(note.content || '', { clickableUserMentions: false }) }}
                    />
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{new Date(note.note_date || note.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                            <User className="w-3 h-3" />{note.author_name}
                        </span>
                        {!hideClientLink && note.client_name && (
                            <button onClick={() => router.push(`/clients/${note.client_id}`)}
                                className="text-xs text-ddor-blue hover:underline flex items-center gap-1">
                                <User className="w-3 h-3" />{note.client_name}
                            </button>
                        )}
                        {note.report_type && (
                            <span className="text-xs text-purple-600">
                                {REPORT_TYPE_LABELS[note.report_type as keyof typeof REPORT_TYPE_LABELS] || note.report_type}
                            </span>
                        )}
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
                    <button onClick={() => onPin(note.id, note.is_pinned)}
                        className="p-1.5 hover:bg-gray-100 rounded" title={note.is_pinned ? 'Unpin' : 'Pin'}>
                        <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'text-amber-500' : 'text-gray-300'}`} />
                    </button>
                    <button onClick={() => onArchive(note.id)}
                        className="p-1.5 hover:bg-red-50 rounded" title="Archive">
                        <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NoteCard;
