'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Loader2, Save, CheckCircle2, XCircle, Upload,
    Download, FileText, Trash2, User, Mail, Building,
    AlertCircle, Clock
} from 'lucide-react';

const DOC_TYPES = [
    { key: 'w9', label: 'W-9', color: '#8B5CF6' },
    { key: 'baa', label: 'BAA', color: '#3B82F6' },
    { key: 'contract', label: 'Contract', color: '#10B981' },
    { key: 'ach', label: 'ACH / Lockbox', color: '#F59E0B' },
];

const ASSIGNEES = ['Katherine Taylor', 'Kathy', 'Tanya', 'Jade Hampton', 'Dave Johnson', 'Erin Henle'];

export default function ContractDetailPage() {
    const router = useRouter();
    const params = useParams();
    const providerId = params.id as string;
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;
    const isAdmin = ddor?.role === 'super_admin' || ddor?.role === 'business_user';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [provider, setProvider] = useState<any>(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState<string | null>(null);

    const [form, setForm] = useState<any>({});

    useEffect(() => { if (ddor) fetchProvider(); }, [ddor, providerId]);

    const fetchProvider = async () => {
        setLoading(true);
        const d = await fetch(`/api/providers?id=${providerId}`).then(r => r.json());
        const p = d.provider;
        setProvider(p);
        setForm({
            has_participants: p?.has_participants || false,
            contract_signed: p?.contract_signed || false,
            contract_date: p?.contract_date?.split('T')[0] || '',
            baa_signed: p?.baa_signed || false,
            baa_date: p?.baa_date?.split('T')[0] || '',
            w9_received: p?.w9_received || false,
            ach_received: p?.ach_received || false,
            contract_contact_name: p?.contract_contact_name || '',
            contract_contact_email: p?.contract_contact_email || '',
            contract_assignee: p?.contract_assignee || '',
            contract_notes: p?.contract_notes || '',
        });
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true); setError('');
        const res = await fetch(`/api/providers/${providerId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...form,
                contract_date: form.contract_date || null,
                baa_date: form.baa_date || null,
            }),
        });
        if (!res.ok) { setError('Failed to save'); setSaving(false); return; }
        setSaving(false); setSuccessMsg('Saved'); setTimeout(() => setSuccessMsg(''), 3000);
        fetchProvider();
    };

    const handleUpload = async (docType: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg';
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(docType); setError('');

            try {
                // Get presigned URL
                const urlRes = await fetch('/api/documents', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ providerId, docType, filename: file.name, contentType: file.type }),
                });
                const { uploadUrl, key } = await urlRes.json();
                if (!uploadUrl) throw new Error('Failed to get upload URL');

                // Upload to S3
                await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

                // Save key to provider record
                await fetch(`/api/providers/${providerId}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        [`doc_${docType}_key`]: key,
                        [`doc_${docType}_filename`]: file.name,
                        [`doc_${docType}_uploaded_at`]: new Date().toISOString(),
                    }),
                });

                setSuccessMsg(`${docType.toUpperCase()} uploaded`);
                setTimeout(() => setSuccessMsg(''), 3000);
                fetchProvider();
            } catch (err) {
                console.error(err);
                setError(`Upload failed for ${docType}`);
            }
            setUploading(null);
        };
        input.click();
    };

    const handleDownload = async (key: string, filename: string) => {
        const res = await fetch(`/api/documents?key=${encodeURIComponent(key)}`);
        const { downloadUrl } = await res.json();
        if (downloadUrl) {
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            a.target = '_blank';
            a.click();
        }
    };

    const handleRemoveDoc = async (docType: string) => {
        if (!confirm(`Remove the ${docType.toUpperCase()} document?`)) return;
        await fetch(`/api/providers/${providerId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                [`doc_${docType}_key`]: null,
                [`doc_${docType}_filename`]: null,
                [`doc_${docType}_uploaded_at`]: null,
            }),
        });
        fetchProvider();
    };

    const u = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

    if (!isAdmin) return <div className="min-h-screen bg-gray-50"><Header /><div className="text-center py-12 text-gray-500">Admin access required.</div></div>;
    if (loading) return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    if (!provider) return <div className="min-h-screen bg-gray-50"><Header /><div className="text-center py-12 text-gray-500">Provider not found.</div></div>;

    const checkCount = [form.contract_signed, form.baa_signed, form.w9_received, form.ach_received].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/admin/contracts')} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-ddor-navy">{provider.name}</h1>
                        <p className="text-sm text-gray-500">{provider.abbreviation || ''} • Contract & Compliance Management</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${checkCount === 4 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {checkCount}/4 {checkCount === 4 ? 'Complete' : 'Pending'}
                    </span>
                </div>

                {successMsg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><p className="text-xs text-green-700">{successMsg}</p></div>}
                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /><p className="text-xs text-red-700">{error}</p></div>}

                <div className="space-y-6">
                    {/* Contact & Assignee */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><User className="w-5 h-5 text-ddor-blue" /> Provider Contact & Assignee</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name</label>
                                <input value={form.contract_contact_name} onChange={e => u('contract_contact_name', e.target.value)}
                                    className="w-full p-2.5 border rounded-lg text-sm" placeholder="Nathan Martin" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email</label>
                                <input value={form.contract_contact_email} onChange={e => u('contract_contact_email', e.target.value)} type="email"
                                    className="w-full p-2.5 border rounded-lg text-sm" placeholder="contact@provider.org" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">FGI Assignee</label>
                                <select value={form.contract_assignee} onChange={e => u('contract_assignee', e.target.value)}
                                    className="w-full p-2.5 border rounded-lg text-sm">
                                    <option value="">— Select —</option>
                                    {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Compliance Checkboxes */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><CheckCircle2 className="w-5 h-5 text-ddor-blue" /> Compliance Status</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${form.has_participants ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                                <input type="checkbox" checked={form.has_participants} onChange={e => u('has_participants', e.target.checked)} className="w-5 h-5 rounded" />
                                <div><p className="text-sm font-medium text-gray-900">Has Participants</p><p className="text-xs text-gray-500">Provider is actively serving BHCDP participants</p></div>
                            </label>
                            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${form.w9_received ? 'border-purple-300 bg-purple-50' : 'border-gray-200'}`}>
                                <input type="checkbox" checked={form.w9_received} onChange={e => u('w9_received', e.target.checked)} className="w-5 h-5 rounded" />
                                <div><p className="text-sm font-medium text-gray-900">W-9 Received</p><p className="text-xs text-gray-500">Tax identification form on file</p></div>
                            </label>
                            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${form.baa_signed ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                                <input type="checkbox" checked={form.baa_signed} onChange={e => u('baa_signed', e.target.checked)} className="w-5 h-5 rounded" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">BAA Signed</p>
                                    <p className="text-xs text-gray-500">Business Associate Agreement</p>
                                    {form.baa_signed && <input type="date" value={form.baa_date} onChange={e => u('baa_date', e.target.value)} className="mt-1 p-1.5 border rounded text-xs w-full" />}
                                </div>
                            </label>
                            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${form.contract_signed ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                                <input type="checkbox" checked={form.contract_signed} onChange={e => u('contract_signed', e.target.checked)} className="w-5 h-5 rounded" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Contract Signed</p>
                                    <p className="text-xs text-gray-500">Provider service contract FY26</p>
                                    {form.contract_signed && <input type="date" value={form.contract_date} onChange={e => u('contract_date', e.target.value)} className="mt-1 p-1.5 border rounded text-xs w-full" />}
                                </div>
                            </label>
                            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${form.ach_received ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
                                <input type="checkbox" checked={form.ach_received} onChange={e => u('ach_received', e.target.checked)} className="w-5 h-5 rounded" />
                                <div><p className="text-sm font-medium text-gray-900">ACH / Lockbox</p><p className="text-xs text-gray-500">Payment routing information received</p></div>
                            </label>
                        </div>
                    </div>

                    {/* Document Uploads */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-ddor-blue" /> Documents</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {DOC_TYPES.map(doc => {
                                const key = provider[`doc_${doc.key}_key`];
                                const filename = provider[`doc_${doc.key}_filename`];
                                const uploadedAt = provider[`doc_${doc.key}_uploaded_at`];
                                const isUploading = uploading === doc.key;

                                return (
                                    <div key={doc.key} className="border rounded-xl p-4" style={{ borderLeftWidth: 4, borderLeftColor: doc.color }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold text-gray-900">{doc.label}</span>
                                            {key ? (
                                                <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" /> Uploaded</span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs text-gray-400"><XCircle className="w-3 h-3" /> Missing</span>
                                            )}
                                        </div>

                                        {key ? (
                                            <>
                                                <p className="text-xs text-gray-500 truncate mb-1">{filename}</p>
                                                <p className="text-xs text-gray-400 mb-3">{uploadedAt ? new Date(uploadedAt).toLocaleDateString() : ''}</p>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleDownload(key, filename)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                                                        <Download className="w-3 h-3" /> Download
                                                    </button>
                                                    <button onClick={() => handleUpload(doc.key)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                                                        <Upload className="w-3 h-3" /> Replace
                                                    </button>
                                                    <button onClick={() => handleRemoveDoc(doc.key)}
                                                        className="flex items-center gap-1 px-2 py-1.5 hover:bg-red-50 rounded-lg text-xs text-red-500">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <button onClick={() => handleUpload(doc.key)} disabled={isUploading}
                                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-40">
                                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                {isUploading ? 'Uploading...' : `Upload ${doc.label}`}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy mb-4">Contract Notes</h2>
                        <textarea value={form.contract_notes} onChange={e => u('contract_notes', e.target.value)}
                            className="w-full p-3 border rounded-lg text-sm min-h-[120px]"
                            placeholder="Track correspondence, follow-ups, and status updates here...&#10;&#10;Example:&#10;11/12 - Sent another email to check on BAA status&#10;11/15 - Received signed contract via email" />
                    </div>

                    {/* Save */}
                    <div className="flex gap-3 pb-8">
                        <button onClick={() => router.push('/admin/contracts')} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Back to Grid</button>
                        <button onClick={handleSave} disabled={saving}
                            className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold hover:bg-[#156090] disabled:opacity-40 flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
