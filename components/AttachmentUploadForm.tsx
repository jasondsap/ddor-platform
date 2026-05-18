'use client';

import { useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { CATEGORY_LABELS, type AttachmentCategory } from '@/components/AttachmentList';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
]);
const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,.heic,.heif,application/pdf,image/jpeg,image/png,image/heic,image/heif';

const CATEGORY_OPTIONS: { value: AttachmentCategory; label: string }[] = [
    { value: 'legal_agreement', label: CATEGORY_LABELS.legal_agreement },
    { value: 'consent_release_of_information', label: CATEGORY_LABELS.consent_release_of_information },
    { value: 'consent_to_treat', label: CATEGORY_LABELS.consent_to_treat },
    { value: 'consent_email_text', label: CATEGORY_LABELS.consent_email_text },
    { value: 'referral_to_case_navigator', label: CATEGORY_LABELS.referral_to_case_navigator },
    { value: 'other', label: CATEGORY_LABELS.other },
];

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
    clientId: string;
    onUploaded: () => void | Promise<void>;
    onCancel: () => void;
}

export function AttachmentUploadForm({ clientId, onUploaded, onCancel }: Props) {
    const [category, setCategory] = useState<AttachmentCategory | ''>('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const requiresDescription = category === 'other';

    const handleFile = (f: File | null) => {
        setFileError('');
        if (!f) { setFile(null); return; }
        if (f.size > MAX_BYTES) {
            setFileError(`File is too large (${formatBytes(f.size)}). Maximum 25 MB.`);
            setFile(null);
            return;
        }
        if (f.size === 0) {
            setFileError('File appears to be empty.');
            setFile(null);
            return;
        }
        if (!ALLOWED_MIME.has(f.type)) {
            setFileError(`Unsupported file type${f.type ? `: ${f.type}` : ''}. Allowed: PDF, JPEG, PNG, HEIC.`);
            setFile(null);
            return;
        }
        setFile(f);
    };

    const handleSubmit = async () => {
        setSubmitError('');
        if (!category) { setSubmitError('Please choose a category.'); return; }
        if (requiresDescription && description.trim().length === 0) {
            setSubmitError('Description is required when category is "Other".');
            return;
        }
        if (!file) { setSubmitError('Please choose a file.'); return; }

        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('category', category);
            if (description.trim().length > 0) fd.append('description', description.trim());

            const res = await fetch(`/api/clients/${clientId}/attachments`, {
                method: 'POST',
                body: fd,
            });
            if (!res.ok) {
                let msg = 'Upload failed.';
                try {
                    const data = await res.json();
                    if (data?.error) msg = data.error;
                } catch { /* keep default */ }
                setSubmitError(msg);
                setSubmitting(false);
                return;
            }
            await onUploaded();
        } catch {
            setSubmitError('Network error. Please try again.');
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-2 border-ddor-blue/20">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-ddor-navy text-sm">Upload Attachment</h3>
                <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded" aria-label="Cancel">
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value as AttachmentCategory | '')}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                        <option value="">— Select —</option>
                        {CATEGORY_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {(requiresDescription || description.length > 0) && (
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Description {requiresDescription ? '*' : '(optional)'}
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={requiresDescription ? 'Briefly describe this document' : ''}
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>
                )}
                {!requiresDescription && description.length === 0 && (
                    <button
                        type="button"
                        onClick={() => setDescription(' ')}
                        className="text-xs text-ddor-blue hover:underline"
                    >
                        + Add a description (optional)
                    </button>
                )}

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">File *</label>
                    <input
                        type="file"
                        accept={ACCEPT_ATTR}
                        onChange={e => handleFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-ddor-blue file:text-white hover:file:bg-[#156090]"
                    />
                    {file && !fileError && (
                        <p className="text-xs text-gray-500 mt-1">{file.name} · {formatBytes(file.size)}</p>
                    )}
                    {fileError && (
                        <p className="text-xs text-red-600 mt-1">{fileError}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">PDF, JPEG, PNG, or HEIC. Max 25 MB.</p>
                </div>

                {submitError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        {submitError}
                    </div>
                )}

                <div className="flex gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="px-4 py-2 bg-white border rounded-lg text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !file || !category || (requiresDescription && description.trim().length === 0)}
                        className="px-4 py-2 bg-ddor-blue text-white rounded-lg text-sm font-medium disabled:opacity-40 flex items-center gap-1"
                    >
                        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {submitting ? 'Uploading…' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AttachmentUploadForm;
