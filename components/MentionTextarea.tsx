'use client';

import { useEffect, useRef, useState } from 'react';
import { AtSign } from 'lucide-react';
import { formatMention, type MentionSuggestion } from '@/lib/mentions';

interface MentionTextareaProps {
    value: string;
    onChange: (val: string) => void;
    /**
     * Called with the current text *after* the last `@` to fetch suggestions.
     * Callers decide what's mentionable (e.g., access-filtered users vs.
     * all users + all clients). Empty query means "list everything you'd
     * suggest if no filter were typed."
     */
    getSuggestions: (query: string) => Promise<MentionSuggestion[]>;
    placeholder?: string;
    rows?: number;
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    /** Optional footer text shown under the textarea. */
    helperText?: string;
    /** Forwarded id for label association. */
    id?: string;
}

/**
 * Textarea with an @-trigger mention picker. Inserts `@[Name](type:id)` into
 * the value. Callers parse the value with `parseMentions()` from
 * `lib/mentions.ts` before sending to the API.
 *
 * Extracted from the original implementation in app/messages/page.tsx.
 * Behavior must remain identical there — only the rendering of selected
 * mentions and the trigger semantics changed scope (now reusable).
 */
export function MentionTextarea({
    value,
    onChange,
    getSuggestions,
    placeholder,
    rows = 1,
    className = '',
    onKeyDown,
    helperText,
    id,
}: MentionTextareaProps) {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);

    // Refetch suggestions when the @-search text changes.
    useEffect(() => {
        if (!showMentions) return;
        let cancelled = false;
        getSuggestions(mentionSearch).then(s => {
            if (!cancelled) setSuggestions(s);
        }).catch(() => {
            if (!cancelled) setSuggestions([]);
        });
        return () => { cancelled = true; };
    }, [showMentions, mentionSearch, getSuggestions]);

    const handleInputChange = (val: string) => {
        onChange(val);
        const lastAt = val.lastIndexOf('@');
        if (lastAt >= 0) {
            const afterAt = val.substring(lastAt + 1);
            if (!afterAt.includes(' ') && !afterAt.includes('\n') && afterAt.length < 30) {
                setShowMentions(true);
                setMentionSearch(afterAt);
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (item: MentionSuggestion) => {
        const lastAt = value.lastIndexOf('@');
        const before = lastAt >= 0 ? value.substring(0, lastAt) : value;
        onChange(before + formatMention(item) + ' ');
        setShowMentions(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Escape' && showMentions) {
            setShowMentions(false);
            return;
        }
        onKeyDown?.(e);
    };

    return (
        <div className="relative">
            {showMentions && suggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border rounded-xl shadow-lg max-h-64 overflow-y-auto z-10">
                    <div className="p-2 border-b">
                        <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                            <AtSign className="w-3 h-3" /> Mention a user or participant
                        </p>
                    </div>
                    {suggestions.map(item => (
                        <button
                            key={`${item.type}-${item.id}`}
                            type="button"
                            onClick={() => insertMention(item)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 text-sm"
                        >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${item.type === 'user' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {item.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                <p className="text-xs text-gray-400">
                                    {item.type === 'user' ? 'Team member' : 'Participant'}
                                    {item.subtitle ? ` • ${item.subtitle}` : ''}
                                </p>
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${item.type === 'user' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                {item.type}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <textarea
                ref={inputRef}
                id={id}
                value={value}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={rows}
                className={className}
            />

            {helperText && <p className="text-xs text-gray-400 mt-1">{helperText}</p>}
        </div>
    );
}

export default MentionTextarea;
