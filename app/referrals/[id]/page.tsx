'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Loader2, User, Calendar, Phone, MapPin,
    Shield, AlertTriangle, Scale, FileText, CheckCircle2,
    Clock, XCircle, Building, Users, Edit, Save, Plus,
    Send, MessageSquare, UserPlus, X
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    'open_within_72_hours': { bg: 'bg-green-50', text: 'text-green-700', icon: Clock, label: 'Open — within 72 hours' },
    'open_72_to_2_weeks': { bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock, label: 'Open — 72hrs to 2 weeks' },
    'open_2_weeks_to_2_months': { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock, label: 'Open — 2 weeks to 2 months' },
    'inactive_2_months_plus': { bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle, label: 'Inactive — 2 months+' },
    'closed': { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle, label: 'Closed' },
};

const ASSESSOR_STATUS = ['Scheduled', 'Attempted to Contact', 'Pending', 'Other', 'Screened'];
const ELIGIBILITY = ['Pretrial Eligible', 'Prosecutor Override', 'Unsure'];
const HOUSING_STATUS = ['Housed', 'Unhoused', 'Unstable/Temporary Housing', 'Unknown'];

function computeAutoStatus(referralDate: string | null): string | null {
    if (!referralDate) return null;
    const days = Math.floor((Date.now() - new Date(referralDate).getTime()) / 86400000);
    if (days <= 3) return 'open_within_72_hours';
    if (days <= 14) return 'open_72_to_2_weeks';
    if (days <= 60) return 'open_2_weeks_to_2_months';
    return 'inactive_2_months_plus';
}

export default function ReferralDetailPage() {
    const router = useRouter();
    const params = useParams();
    const referralId = params.id as string;
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [loading, setLoading] = useState(true);
    const [referral, setReferral] = useState<any>(null);
    const [attributes, setAttributes] = useState<Record<string, string[]>>({});
    const [activity, setActivity] = useState<any[]>([]);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [newNote, setNewNote] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [creatingClient, setCreatingClient] = useState(false);
    const [facilities, setFacilities] = useState<any[]>([]);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => { if (authStatus === 'unauthenticated') router.push('/auth/signin'); }, [authStatus, router]);

    useEffect(() => {
        if (!ddor || !referralId) return;
        fetchData();
        fetch('/api/facilities').then(r => r.json()).then(d => setFacilities(d.facilities || []));
    }, [ddor, referralId]);

    const fetchData = async () => {
        const d = await fetch(`/api/referrals/${referralId}`).then(r => r.json());
        setReferral(d.referral);
        setAttributes(d.attributes || {});
        setActivity(d.activity || []);

        if (d.referral) {
            // Auto-update status if not closed and not manually overridden
            const auto = computeAutoStatus(d.referral.referral_date);
            if (auto && d.referral.referral_type_status !== 'closed' && d.referral.referral_type_status !== auto) {
                await fetch(`/api/referrals/${referralId}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        referral_type_status: auto,
                        _log_activity: { type: 'status_change', content: `Status auto-updated based on referral date`, previous: d.referral.referral_type_status, new_value: auto },
                    }),
                });
                d.referral.referral_type_status = auto;
                setReferral({ ...d.referral });
            }

            setEditForm({
                assessor_status: d.referral.assessor_status || '',
                eligibility: d.referral.eligibility || '',
                referral_type_status: d.referral.referral_type_status || '',
                closed_reason: d.referral.closed_reason || '',
                initial_housing: d.referral.initial_housing || '',
                has_insurance: d.referral.has_insurance || '',
                loc_recommendation: d.referral.loc_recommendation || '',
                provider_recommendation_id: d.referral.provider_recommendation_id || '',
                smi_symptoms: d.referral.smi_symptoms || false,
                tbi_abi: d.referral.tbi_abi || false,
                major_medical_issues: d.referral.major_medical_issues || false,
                screen_date: d.referral.screen_date?.split('T')[0] || '',
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const changes: string[] = [];
        if (editForm.assessor_status !== referral.assessor_status) changes.push(`Assessor status → ${editForm.assessor_status}`);
        if (editForm.eligibility !== referral.eligibility) changes.push(`Eligibility → ${editForm.eligibility}`);
        if (editForm.referral_type_status !== referral.referral_type_status) changes.push(`Referral status → ${editForm.referral_type_status}`);
        if (editForm.initial_housing !== referral.initial_housing) changes.push(`Housing → ${editForm.initial_housing}`);

        await fetch(`/api/referrals/${referralId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...editForm,
                screen_date: editForm.screen_date || null,
                provider_recommendation_id: editForm.provider_recommendation_id || null,
                _log_activity: changes.length > 0 ? { type: 'edit', content: `Updated: ${changes.join(', ')}` } : undefined,
            }),
        });
        setEditing(false); setSaving(false);
        setSuccessMsg('Saved'); setTimeout(() => setSuccessMsg(''), 3000);
        fetchData();
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setAddingNote(true);
        await fetch(`/api/referrals/${referralId}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newNote, activity_type: 'note' }),
        });
        setNewNote(''); setAddingNote(false);
        fetchData();
    };

    const handleCreateClient = async () => {
        if (!confirm(`Create a new client from this referral for ${referral.first_name} ${referral.last_name}?`)) return;
        setCreatingClient(true);
        try {
            const res = await fetch('/api/clients', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: referral.first_name,
                    last_name: referral.last_name,
                    date_of_birth: referral.date_of_birth || null,
                    gender: referral.gender || null,
                    facility_id: referral.provider_recommendation_id || null,
                    diagnosis: null,
                    insurance_status: referral.has_insurance || null,
                    zip: null,
                }),
            });
            if (!res.ok) { alert('Failed to create client'); setCreatingClient(false); return; }
            const data = await res.json();
            const clientId = data.client?.id;

            if (clientId) {
                // Link client to referral
                await fetch(`/api/referrals/${referralId}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        client_id: clientId,
                        _log_activity: { type: 'status_change', content: `Client created and linked: ${referral.first_name} ${referral.last_name}` },
                    }),
                });
                router.push(`/clients/${clientId}`);
            }
        } catch { alert('Error creating client'); }
        setCreatingClient(false);
    };

    const eu = (k: string, v: any) => setEditForm((p: any) => ({ ...p, [k]: v }));

    if (authStatus === 'loading' || loading) return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    if (!referral) return <div className="min-h-screen bg-gray-50"><Header /><div className="text-center py-12"><p className="text-gray-500">Referral not found.</p></div></div>;

    const fullName = `${referral.first_name} ${referral.last_name}`;
    const statusCfg = STATUS_CONFIG[referral.referral_type_status] || STATUS_CONFIG['open_within_72_hours'];
    const StatusIcon = statusCfg.icon;
    const hasClient = !!referral.linked_client_id;

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => router.push('/referrals')} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-ddor-navy">{fullName}</h1>
                        <p className="text-sm text-gray-500">Referral #{referral.referral_number || '—'} • {referral.county_name ? `${referral.county_name} County` : ''}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                        <StatusIcon className="w-4 h-4" /> {statusCfg.label}
                    </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {!hasClient && (
                        <button onClick={handleCreateClient} disabled={creatingClient}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40">
                            {creatingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            Create Client from Referral
                        </button>
                    )}
                    <button onClick={() => setEditing(!editing)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${editing ? 'bg-gray-200 text-gray-700' : 'bg-ddor-blue text-white hover:bg-[#156090]'}`}>
                        {editing ? <><X className="w-4 h-4" /> Cancel Edit</> : <><Edit className="w-4 h-4" /> Edit Referral</>}
                    </button>
                </div>

                {successMsg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><p className="text-xs text-green-700">{successMsg}</p></div>}

                {referral.is_urgent && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div><p className="font-semibold text-red-800">Urgent — Needs assessment within the hour</p>
                        {referral.urgent_message && <p className="text-sm text-red-700 mt-1">{referral.urgent_message}</p>}</div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column — Data */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Edit Panel */}
                        {editing && (
                            <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-ddor-blue/20">
                                <h2 className="font-semibold text-ddor-navy mb-4">Edit Referral</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Assessor Status</label>
                                        <select value={editForm.assessor_status} onChange={e => eu('assessor_status', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm">
                                            <option value="">—</option>{ASSESSOR_STATUS.map(s => <option key={s}>{s}</option>)}</select></div>
                                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Eligibility</label>
                                        <select value={editForm.eligibility} onChange={e => eu('eligibility', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm">
                                            <option value="">—</option>{ELIGIBILITY.map(e => <option key={e}>{e}</option>)}</select></div>
                                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Referral Status</label>
                                        <select value={editForm.referral_type_status} onChange={e => eu('referral_type_status', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm">
                                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Housing</label>
                                        <select value={editForm.initial_housing} onChange={e => eu('initial_housing', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm">
                                            <option value="">—</option>{HOUSING_STATUS.map(h => <option key={h}>{h}</option>)}</select></div>
                                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Screen Date</label>
                                        <input type="date" value={editForm.screen_date} onChange={e => eu('screen_date', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                                    <div><label className="block text-xs font-medium text-gray-600 mb-1">LOC Recommendation</label>
                                        <input value={editForm.loc_recommendation} onChange={e => eu('loc_recommendation', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Recommended Facility</label>
                                        <select value={editForm.provider_recommendation_id} onChange={e => eu('provider_recommendation_id', e.target.value)} className="w-full p-2.5 border rounded-lg text-sm">
                                            <option value="">—</option>{facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                                </div>
                                <div className="flex flex-wrap gap-3 mb-4">
                                    {[{ field: 'smi_symptoms', label: 'SMI' }, { field: 'tbi_abi', label: 'TBI/ABI' }, { field: 'major_medical_issues', label: 'Major Medical' }].map(f => (
                                        <label key={f.field} className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" checked={editForm[f.field]} onChange={e => eu(f.field, e.target.checked)} className="w-4 h-4 rounded" /> {f.label}
                                        </label>
                                    ))}
                                </div>
                                <button onClick={handleSave} disabled={saving}
                                    className="px-4 py-2 bg-ddor-blue text-white rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-40">
                                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Changes
                                </button>
                            </div>
                        )}

                        {/* Participant Info */}
                        <Section title="Participant Information" icon={User}>
                            <FieldGrid>
                                <Field label="Name" value={fullName} />
                                <Field label="Date of Birth" value={referral.date_of_birth ? new Date(referral.date_of_birth).toLocaleDateString() : null} />
                                <Field label="Sex" value={referral.gender} />
                                <Field label="Phone" value={referral.phone} />
                                <Field label="County" value={referral.county_name ? `${referral.county_name} County` : null} />
                                <Field label="Location" value={referral.location_at_referral} />
                                <Field label="Housing" value={referral.initial_housing} />
                                <Field label="Insurance" value={referral.has_insurance} />
                                <Field label="Prior Participant" value={referral.prior_participant} />
                            </FieldGrid>
                            {referral.alternate_contact && <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-xs text-gray-500 mb-1">Alternate Contact</p><p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">{referral.alternate_contact}</p></div>}
                        </Section>

                        {/* Dates & Status */}
                        <Section title="Dates & Status" icon={Calendar}>
                            <FieldGrid>
                                <Field label="Referral Date" value={referral.referral_date ? new Date(referral.referral_date).toLocaleDateString() : null} />
                                <Field label="Date Received" value={referral.date_received ? new Date(referral.date_received).toLocaleDateString() : null} />
                                <Field label="Court Date" value={referral.court_date ? new Date(referral.court_date).toLocaleDateString() : null} />
                                <Field label="Screen Date" value={referral.screen_date ? new Date(referral.screen_date).toLocaleDateString() : null} />
                                <Field label="Assessor Status" value={referral.assessor_status} />
                                <Field label="Eligibility" value={referral.eligibility} />
                                {referral.referral_type_status === 'closed' && <Field label="Closed Reason" value={referral.closed_reason} />}
                            </FieldGrid>
                        </Section>

                        {/* Clinical Flags */}
                        {(referral.smi_symptoms || referral.tbi_abi || referral.major_medical_issues) && (
                            <Section title="Clinical Flags" icon={AlertTriangle}>
                                <div className="flex flex-wrap gap-2">
                                    {referral.smi_symptoms && <Tag color="purple" label="Severe Mental Illness" />}
                                    {referral.tbi_abi && <Tag color="amber" label="Traumatic Brain Injury" />}
                                    {referral.major_medical_issues && <Tag color="red" label="Major Medical Issues" />}
                                </div>
                            </Section>
                        )}

                        {/* Provider & Staff */}
                        <Section title="Provider & Staff" icon={Building}>
                            <FieldGrid>
                                <Field label="Recommended Facility" value={referral.recommended_facility_name} />
                                <Field label="Provider" value={referral.recommended_provider_name} />
                                <Field label="LOC Recommendation" value={referral.loc_recommendation} />
                                <Field label="State Assessor" value={referral.assessor_name} />
                                <Field label="Case Navigator (AOC)" value={referral.case_navigator_name} />
                                <Field label="Navigator Email" value={referral.case_navigator_email} />
                            </FieldGrid>
                        </Section>

                        {/* Charges */}
                        {attributes.sb90_substance_charge && attributes.sb90_substance_charge.length > 0 && (
                            <Section title="SB90 Substance Charges" icon={Scale}>
                                <div className="flex flex-wrap gap-1.5">{attributes.sb90_substance_charge.map(c => <span key={c} className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">{c}</span>)}</div>
                            </Section>
                        )}
                        {attributes.sb90_charge && attributes.sb90_charge.length > 0 && (
                            <Section title="SB90 Charges" icon={Scale}>
                                <div className="flex flex-wrap gap-1.5">{attributes.sb90_charge.map(c => <span key={c} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{c}</span>)}</div>
                            </Section>
                        )}

                        {/* Linked Client */}
                        {hasClient && (
                            <Section title="Linked Client" icon={Users}>
                                <button onClick={() => router.push(`/clients/${referral.linked_client_id}`)}
                                    className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors w-full text-left">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    <div><p className="font-medium text-green-800">{referral.linked_client_name}</p><p className="text-xs text-green-600">Click to view client record</p></div>
                                </button>
                            </Section>
                        )}
                    </div>

                    {/* Right Column — Activity Log */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm sticky top-20">
                            <div className="p-4 border-b">
                                <h2 className="font-semibold text-ddor-navy flex items-center gap-2"><MessageSquare className="w-4 h-4 text-ddor-blue" /> Activity Log</h2>
                            </div>

                            {/* Add note */}
                            <div className="p-3 border-b">
                                <div className="flex gap-2">
                                    <input value={newNote} onChange={e => setNewNote(e.target.value)}
                                        placeholder="Add a note..."
                                        className="flex-1 p-2 border rounded-lg text-sm"
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }} />
                                    <button onClick={handleAddNote} disabled={addingNote || !newNote.trim()}
                                        className="p-2 bg-ddor-blue text-white rounded-lg disabled:opacity-40">
                                        {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Activity feed */}
                            <div className="max-h-[500px] overflow-y-auto">
                                {activity.length === 0 ? (
                                    <p className="text-center text-gray-400 text-sm py-8">No activity yet</p>
                                ) : (
                                    <div className="divide-y">
                                        {activity.map((a: any) => {
                                            const isNote = a.activity_type === 'note';
                                            const isStatus = a.activity_type === 'status_change';
                                            const isEdit = a.activity_type === 'edit';
                                            return (
                                                <div key={a.id} className="p-3">
                                                    <div className="flex items-start gap-2">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isNote ? 'bg-blue-100' : isStatus ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                            {isNote ? <MessageSquare className="w-3 h-3 text-blue-600" /> :
                                                             isStatus ? <CheckCircle2 className="w-3 h-3 text-green-600" /> :
                                                             <Edit className="w-3 h-3 text-gray-500" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-gray-800">{a.content}</p>
                                                            {a.previous_value && a.new_value && (
                                                                <p className="text-xs text-gray-400 mt-0.5">
                                                                    {STATUS_CONFIG[a.previous_value]?.label || a.previous_value} → {STATUS_CONFIG[a.new_value]?.label || a.new_value}
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                {a.user_name} • {new Date(a.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Legacy notes */}
                            {referral.notes && (
                                <div className="p-3 border-t bg-gray-50">
                                    <p className="text-xs text-gray-500 mb-1">Original Notes</p>
                                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{referral.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-xs text-gray-400 pt-6 pb-8 flex gap-4">
                    {referral.created_at && <span>Created: {new Date(referral.created_at).toLocaleDateString()}</span>}
                    {referral.created_by_name && <span>By: {referral.created_by_name}</span>}
                </div>
            </main>
        </div>
    );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return <div className="bg-white rounded-xl shadow-sm p-6"><h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Icon className="w-5 h-5 text-ddor-blue" /> {title}</h2>{children}</div>;
}
function FieldGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}
function Field({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return <div><p className="text-xs text-gray-500 mb-0.5">{label}</p><p className="text-sm font-medium text-gray-900">{value}</p></div>;
}
function Tag({ color, label }: { color: string; label: string }) {
    return <span className={`flex items-center gap-1.5 px-3 py-1.5 bg-${color}-50 text-${color}-700 rounded-full text-sm font-medium`}><AlertTriangle className="w-3.5 h-3.5" /> {label}</span>;
}
