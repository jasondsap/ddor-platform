'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Loader2, User, Home, ShoppingBag, Car,
    AlertTriangle, DollarSign, CheckCircle2, Clock, XCircle,
    Save, FileText, Building, MapPin, Phone, Mail
} from 'lucide-react';

const STATUS_OPTIONS = ['pending', 'approved', 'disbursed', 'denied'];
const STATUS_CFG: Record<string, { bg: string; text: string; icon: any }> = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
    approved: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
    disbursed: { bg: 'bg-blue-50', text: 'text-blue-700', icon: DollarSign },
    denied: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
};

export default function BarrierReliefDetailPage() {
    const router = useRouter();
    const params = useParams();
    const requestId = params.id as string;
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;
    const isAdmin = ddor?.role === 'super_admin' || ddor?.role === 'business_user';

    const [loading, setLoading] = useState(true);
    const [req, setReq] = useState<any>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState<any>({});

    useEffect(() => { if (ddor) fetchData(); }, [ddor, requestId]);

    const fetchData = async () => {
        setLoading(true);
        const d = await fetch(`/api/barrier-relief/${requestId}`).then(r => r.json());
        setReq(d.request);
        if (d.request) setEditForm({ status: d.request.status || 'pending', fgi_notes: d.request.fgi_notes || '', approved_amount: d.request.approved_amount || '', date_approved: d.request.date_approved?.split('T')[0] || '', date_disbursed: d.request.date_disbursed?.split('T')[0] || '' });
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        await fetch(`/api/barrier-relief/${requestId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...editForm, approved_amount: editForm.approved_amount ? parseFloat(editForm.approved_amount) : null }) });
        setEditing(false); setSaving(false); fetchData();
    };

    if (loading) return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    if (!req) return <div className="min-h-screen bg-gray-50"><Header /><div className="text-center py-12 text-gray-500">Request not found.</div></div>;

    const totalRequested = [req.vendor_1_amount, req.vendor_2_amount, req.vendor_3_amount, req.vendor_4_amount].reduce((s: number, v: any) => s + (parseFloat(v) || 0), 0);
    const sCfg = STATUS_CFG[req.status] || STATUS_CFG.pending;
    const SIcon = sCfg.icon;

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/admin/barrier-relief')} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-ddor-navy">{req.first_name} {req.last_name}</h1>
                        <p className="text-sm text-gray-500">Barrier Relief Request • {new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${sCfg.bg} ${sCfg.text}`}>
                        <SIcon className="w-4 h-4" /> {req.status}
                    </span>
                    {isAdmin && !editing && <button onClick={() => setEditing(true)} className="px-4 py-2 bg-ddor-blue text-white rounded-lg text-sm font-medium">Review</button>}
                </div>

                {req.is_emergency && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <span className="font-semibold text-red-800">Emergency Request</span>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Admin Review Panel */}
                    {editing && (
                        <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-ddor-blue/20">
                            <h2 className="font-semibold text-ddor-navy mb-4">FGI Review</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                <div><label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                                    <select value={editForm.status} onChange={e => setEditForm((p: any) => ({ ...p, status: e.target.value }))} className="w-full p-2.5 border rounded-lg text-sm">
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                    </select></div>
                                <div><label className="block text-xs font-medium text-gray-600 mb-1">Approved Amount ($)</label>
                                    <input type="number" step="0.01" value={editForm.approved_amount} onChange={e => setEditForm((p: any) => ({ ...p, approved_amount: e.target.value }))} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                                <div><label className="block text-xs font-medium text-gray-600 mb-1">Date Approved</label>
                                    <input type="date" value={editForm.date_approved} onChange={e => setEditForm((p: any) => ({ ...p, date_approved: e.target.value }))} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                            </div>
                            <div className="mb-4"><label className="block text-xs font-medium text-gray-600 mb-1">FGI Notes</label>
                                <textarea value={editForm.fgi_notes} onChange={e => setEditForm((p: any) => ({ ...p, fgi_notes: e.target.value }))} className="w-full p-3 border rounded-lg text-sm min-h-[60px]" /></div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditing(false)} className="px-4 py-2 bg-white border rounded-lg text-sm">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1">
                                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Review
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Participant */}
                    <Section title="Participant" icon={User}>
                        <Grid>
                            <Field label="Name" value={`${req.first_name} ${req.last_name}`} />
                            <Field label="Phone" value={req.phone} />
                            <Field label="Email" value={req.email} />
                            <Field label="Language" value={req.primary_language} />
                            <Field label="County" value={req.county_name ? `${req.county_name} County` : null} />
                            <Field label="Address" value={req.address} />
                        </Grid>
                    </Section>

                    {/* Request Types */}
                    <Section title="Request Type" icon={ShoppingBag}>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {req.is_emergency && <Tag icon={AlertTriangle} label="Emergency" color="red" />}
                            {req.is_housing_assistance && <Tag icon={Home} label="Housing" color="blue" />}
                            {req.is_emergency_housing && <Tag icon={Home} label="Emergency Housing" color="orange" />}
                            {req.is_basic_needs && <Tag icon={ShoppingBag} label="Basic Needs" color="green" />}
                            {req.is_transportation && <Tag icon={Car} label="Transportation" color="purple" />}
                        </div>
                        {req.description && <div><p className="text-xs text-gray-500 mb-1">Description</p><p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">{req.description}</p></div>}
                        {req.reason_for_services && <div className="mt-3"><p className="text-xs text-gray-500 mb-1">Reason for Services</p><p className="text-sm text-gray-700">{req.reason_for_services}</p></div>}
                        {req.alternative_resources && <div className="mt-3"><p className="text-xs text-gray-500 mb-1">Alternative Resources</p><p className="text-sm text-gray-700">{req.alternative_resources}</p></div>}
                    </Section>

                    {/* Provider */}
                    {(req.provider_name || req.staff_name) && (
                        <Section title="Provider & Staff" icon={Building}>
                            <Grid>
                                <Field label="Provider" value={req.provider_name} />
                                <Field label="Facility" value={req.facility_name} />
                                <Field label="Staff Name" value={req.staff_name} />
                                <Field label="Staff Phone" value={req.staff_phone} />
                                <Field label="Staff Email" value={req.staff_email} />
                                <Field label="Case Navigator" value={req.navigator_name} />
                            </Grid>
                        </Section>
                    )}

                    {/* Vendors */}
                    {totalRequested > 0 && (
                        <Section title="Vendors & Costs" icon={DollarSign}>
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map(i => {
                                    const vendor = req[`vendor_${i}`];
                                    const amount = parseFloat(req[`vendor_${i}_amount`]) || 0;
                                    if (!vendor && !amount) return null;
                                    return (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{vendor || `Vendor ${i}`}</p>
                                                {req[`vendor_${i}_contact`] && <p className="text-xs text-gray-500">{req[`vendor_${i}_contact`]}</p>}
                                            </div>
                                            <p className="font-bold text-ddor-navy">${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg flex justify-between items-center">
                                <span className="font-semibold text-blue-700">Total Requested</span>
                                <span className="text-2xl font-bold text-blue-800">${totalRequested.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {req.approved_amount && (
                                <div className="mt-2 p-4 bg-green-50 rounded-lg flex justify-between items-center">
                                    <span className="font-semibold text-green-700">Approved Amount</span>
                                    <span className="text-2xl font-bold text-green-800">${parseFloat(req.approved_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                        </Section>
                    )}

                    {/* FGI Notes */}
                    {req.fgi_notes && (
                        <Section title="FGI Notes" icon={FileText}>
                            <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{req.fgi_notes}</p>
                        </Section>
                    )}

                    {/* Signature */}
                    {req.signature && (
                        <div className="bg-white rounded-xl shadow-sm p-6 border-t-4 border-green-500">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                                <div>
                                    <p className="font-semibold text-ddor-navy">{req.is_verbal_signature ? 'Verbal Signature' : 'Electronic Signature'}</p>
                                    <p className="text-sm text-gray-500">{req.signature}{req.signature_date ? ` — ${new Date(req.signature_date).toLocaleDateString()}` : ''}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="text-xs text-gray-400 pb-8">
                        Created {new Date(req.created_at).toLocaleDateString()}{req.created_by_name ? ` by ${req.created_by_name}` : ''}
                    </div>
                </div>
            </main>
        </div>
    );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return <div className="bg-white rounded-xl shadow-sm p-6"><h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Icon className="w-5 h-5 text-ddor-blue" /> {title}</h2>{children}</div>;
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>; }
function Field({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return <div><p className="text-xs text-gray-500 mb-0.5">{label}</p><p className="text-sm font-medium text-gray-900">{value}</p></div>;
}
function Tag({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
    return <span className={`flex items-center gap-1.5 px-3 py-1.5 bg-${color}-50 text-${color}-700 rounded-full text-sm font-medium`}><Icon className="w-3.5 h-3.5" /> {label}</span>;
}
