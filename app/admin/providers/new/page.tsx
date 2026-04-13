'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
    Building, Phone, Mail, Globe, MapPin, FileText
} from 'lucide-react';
import { Suspense } from 'react';

function ProviderFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;
    const isAdmin = ddor?.role === 'super_admin' || ddor?.role === 'business_user';

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(!!editId);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState({
        name: '', abbreviation: '', phone: '', email: '',
        address_line1: '', address_line2: '', city: '', state: 'KY', zip: '',
        website: '', notes: '',
    });

    // Load existing provider if editing
    useEffect(() => {
        if (!editId || !ddor) return;
        fetch(`/api/providers?id=${editId}`)
            .then(r => r.json())
            .then(d => {
                if (d.provider) {
                    const p = d.provider;
                    setForm({
                        name: p.name || '', abbreviation: p.abbreviation || '',
                        phone: p.phone || '', email: p.email || '',
                        address_line1: p.address_line1 || '', address_line2: p.address_line2 || '',
                        city: p.city || '', state: p.state || 'KY', zip: p.zip || '',
                        website: p.website || '', notes: p.notes || '',
                    });
                }
            })
            .finally(() => setLoading(false));
    }, [editId, ddor]);

    const u = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

    const handleSubmit = async () => {
        if (!form.name.trim()) { setError('Provider name is required'); return; }
        setSaving(true); setError('');
        try {
            const url = editId ? `/api/providers/${editId}` : '/api/providers';
            const method = editId ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
            setSuccess(true);
            setTimeout(() => router.push('/providers'), 1500);
        } catch { setError('An error occurred.'); setSaving(false); }
    };

    if (!isAdmin) return <div className="min-h-screen bg-gray-50"><Header /><div className="text-center py-12 text-gray-500">Admin access required.</div></div>;
    if (loading) return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;

    if (success) return (
        <div className="min-h-screen bg-gray-50"><Header />
            <div className="max-w-2xl mx-auto px-6 py-24 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-ddor-navy mb-2">{editId ? 'Provider Updated' : 'Provider Created'}</h2>
                <p className="text-sm text-gray-500">Redirecting...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/providers')} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                    <div><h1 className="text-2xl font-bold text-ddor-navy">{editId ? 'Edit Provider' : 'New Provider'}</h1><p className="text-sm text-gray-500">{editId ? 'Update provider information' : 'Add a new provider organization to the BHCDP'}</p></div>
                </div>

                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-500" /><p className="text-sm text-red-700">{error}</p></div>}

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Building className="w-5 h-5 text-ddor-blue" /> Organization</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name *</label>
                                <input value={form.name} onChange={e => u('name', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ddor-blue/20 focus:border-ddor-blue" placeholder="e.g. Seven Counties Services" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation</label>
                                <input value={form.abbreviation} onChange={e => u('abbreviation', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="e.g. SCS" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    <input value={form.website} onChange={e => u('website', e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Phone className="w-5 h-5 text-ddor-blue" /> Contact</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input value={form.phone} onChange={e => u('phone', e.target.value)} type="tel"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="(502) 555-0100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input value={form.email} onChange={e => u('email', e.target.value)} type="email"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="contact@provider.org" />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-ddor-blue" /> Address</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                <input value={form.address_line1} onChange={e => u('address_line1', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="123 Main St" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                                <input value={form.address_line2} onChange={e => u('address_line2', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Suite 200" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input value={form.city} onChange={e => u('city', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Louisville" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input value={form.state} onChange={e => u('state', e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="KY" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                                    <input value={form.zip} onChange={e => u('zip', e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="40202" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-ddor-blue" /> Notes</h2>
                        <textarea value={form.notes} onChange={e => u('notes', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[80px]" placeholder="Internal notes about this provider..." />
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pb-8">
                        <button onClick={() => router.push('/providers')} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSubmit} disabled={saving}
                            className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold hover:bg-[#156090] disabled:opacity-40 flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : editId ? 'Update Provider' : 'Create Provider'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function NewProviderPage() {
    return <Suspense fallback={<div className="min-h-screen bg-gray-50" />}><ProviderFormContent /></Suspense>;
}
