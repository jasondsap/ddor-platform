'use client';

import { FileText, Image as ImageIcon, Download, Trash2, Loader2, Paperclip, User, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

export type AttachmentCategory =
    | 'legal_agreement'
    | 'consent_release_of_information'
    | 'consent_to_treat'
    | 'consent_email_text'
    | 'referral_to_case_navigator'
    | 'other';

export interface Attachment {
    id: string;
    client_id: string;
    category: AttachmentCategory;
    description: string | null;
    file_name: string;
    file_size_bytes: number | string; // pg bigint can serialize as string
    mime_type: string;
    s3_key: string;
    uploaded_by: string;
    uploaded_by_name: string | null;
    uploaded_at: string;
    is_archived: boolean;
}

export const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
    legal_agreement: 'Legal Agreement',
    consent_release_of_information: 'Consent to Release of Information',
    consent_to_treat: 'Consent to Treat',
    consent_email_text: 'Consent to Email and Text',
    referral_to_case_navigator: 'Referral to Case Navigator',
    other: 'Other',
};

// Display order — keeps grouped sections in a predictable order regardless of
// upload sequence.
const CATEGORY_DISPLAY_ORDER: AttachmentCategory[] = [
    'legal_agreement',
    'consent_release_of_information',
    'consent_to_treat',
    'consent_email_text',
    'referral_to_case_navigator',
    'other',
];

function formatBytes(n: number | string): string {
    const bytes = typeof n === 'string' ? Number(n) : n;
    if (!Number.isFinite(bytes) || bytes < 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface Props {
    clientId: string;
    attachments: Attachment[];
    onArchive: (id: string) => Promise<void> | void;
}

export function AttachmentList({ clientId, attachments, onArchive }: Props) {
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const [error, setError] = useState<string>('');

    const handleDownload = async (att: Attachment) => {
        setDownloadingId(att.id);
        setError('');
        try {
            const res = await fetch(`/api/clients/${clientId}/attachments/${att.id}`);
            const data = await res.json();
            if (!res.ok || !data.url) {
                setError(data.error || 'Failed to generate download link.');
                return;
            }
            window.open(data.url, '_blank', 'noopener,noreferrer');
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleArchiveClick = async (att: Attachment) => {
        if (!confirm(`Archive "${att.file_name}"? It will be hidden from the list. (The file itself is retained.)`)) return;
        setArchivingId(att.id);
        try {
            await onArchive(att.id);
        } finally {
            setArchivingId(null);
        }
    };

    if (attachments.length === 0) {
        return (
            <div className="text-center py-12">
                <Paperclip className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No attachments yet.</p>
                <p className="text-gray-400 text-xs mt-1">Click "Upload" above to add the first one.</p>
            </div>
        );
    }

    // Group by category, preserving newest-first within each group (the API
    // already returns rows ORDER BY uploaded_at DESC, so the per-group filter
    // inherits that ordering).
    const grouped = CATEGORY_DISPLAY_ORDER
        .map(cat => ({ cat, items: attachments.filter(a => a.category === cat) }))
        .filter(g => g.items.length > 0);

    return (
        <div className="space-y-5">
            {error && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
            )}
            {grouped.map(group => (
                <div key={group.cat}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {CATEGORY_LABELS[group.cat]} ({group.items.length})
                    </h3>
                    <div className="space-y-2">
                        {group.items.map(att => {
                            const isImage = att.mime_type.startsWith('image/');
                            const Icon = isImage ? ImageIcon : FileText;
                            const isDownloading = downloadingId === att.id;
                            const isArchiving = archivingId === att.id;
                            return (
                                <div key={att.id} className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isImage ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{att.file_name}</p>
                                            {att.description && (
                                                <p className="text-xs text-gray-500 truncate mt-0.5">{att.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                                                <span>{formatBytes(att.file_size_bytes)}</span>
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {att.uploaded_by_name || 'Unknown'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(att.uploaded_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => handleDownload(att)}
                                                disabled={isDownloading || isArchiving}
                                                className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-40"
                                                title="Download"
                                            >
                                                {isDownloading
                                                    ? <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />
                                                    : <Download className="w-3.5 h-3.5 text-gray-500" />}
                                            </button>
                                            <button
                                                onClick={() => handleArchiveClick(att)}
                                                disabled={isDownloading || isArchiving}
                                                className="p-1.5 hover:bg-red-50 rounded disabled:opacity-40"
                                                title="Archive"
                                            >
                                                {isArchiving
                                                    ? <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
                                                    : <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default AttachmentList;
