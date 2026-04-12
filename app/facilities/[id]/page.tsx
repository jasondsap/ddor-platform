'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Building, MapPin, Phone, Users, ChevronRight,
    Loader2, Edit, Save, X, CheckCircle2, Stethoscope,
    Shield, Heart, AlertCircle, Globe
} from 'lucide-react';
import { STATUS_COLORS } from '@/types';
import type { ReportCompletionStatus } from '@/types';

const FACILITY_TYPE_OPTIONS = ['Outpatient', 'Residential', 'CSU', 'MAT Clinic - OPT/OBOT', 'CMHC', 'FQHC', 'Recovery House NARR 2', 'Recovery House NARR 3', 'Recovery Kentucky Center', 'Telehealth', 'CCBHC', 'Not Applicable'];
const PRIMARY_SERVICE_OPTIONS = ['SUD Primary', 'SUD Only', 'MH Primary', 'MH Only', 'Co-occurring', 'Not Applicable'];
const SUD_SERVICES_OPTIONS = ['0.5 Early Intervention', '1.0 Outpatient', '1.7 MAT', '2.1 IOP', '2.5 PHP', '3.1 CM Low Intensity Residential', '3.3 CM Pop-Specific H.I. Residential', '3.5 CM High Intensity Residential', '3.7 M-Monitored Intensive Inpatient', '4.0 Medically Managed Inpatient', 'All Services Provided', 'Not Applicable'];
const MH_SERVICES_OPTIONS = ['I. Recovery Maintenance(OP)', 'II. OP', 'III. IOP', 'IV. PHP', 'V. Medically Monitored Residential', 'VI. Medically Managed Inpatient', 'All Services Provided', 'Not Applicable', 'SUD Primary Only'];
const SPECIALTIES_OPTIONS = ['Hospital Co-location', 'In-home services', 'IOP with boarding', 'Long term', 'Methadone', 'No insurance required', 'Pharmacy', 'Pregnant/Parenting', 'Primary Care', 'SMI', 'Suboxone', 'Telehealth', 'Transitional Housing', 'Transportation - To treatment', 'Transportation - general', 'Walk-ins', 'Workforce Development'];
const GENDER_OPTIONS = ['Co-ed', 'Men', 'Women'];
const REGION_OPTIONS = ['north', 'central', 'east', 'west', 'south', 'statewide'];

export default function FacilityDetailPage() {
    const router = useRouter();
    const params = useParams();
    const facilityId = params.id as string;
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;
    const isAdminUser = ddor?.role === 'super_admin' || ddor?.role === 'business_user';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [facility, setFacility] = useState<any>(null);
    const [attributes, setAttributes] = useState<Record<string, string[]>>({});
    const [clients, setClients] = useState<any[]>([]);

    // Edit state
    const [editForm, setEditForm] = useState<any>({});
    const [editAttrs, setEditAttrs] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor || !facilityId) return;
        fetchFacility();
    }, [ddor, facilityId]);

    const fetchFacility = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/facilities/${facilityId}`);
            const data = await res.json();
            setFacility(data.facility);
            setAttributes(data.attributes || {});
            setClients(data.clients || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const startEditing = () => {
        setEditForm({
            name: facility.name || '',
            phone: facility.phone || '',
            street_address: facility.street_address || '',
            city: facility.city || '',
            zip: facility.zip || '',
            region: facility.region || '',
            facility_gender: facility.facility_gender || '',
            primary_service: facility.primary_service || '',
            concerns: facility.concerns || '',
        });
        setEditAttrs({
            facility_type: [...(attributes.facility_type || [])],
            sud_services: [...(attributes.sud_services || [])],
            mh_services: [...(attributes.mh_services || [])],
            specialties: [...(attributes.specialties || [])],
            servicing_county: [...(attributes.servicing_county || [])],
        });
        setEditing(true);
    };

    const cancelEditing = () => { setEditing(false); };

    const toggleAttr = (type: string, value: string) => {
        setEditAttrs(prev => ({
            ...prev,
            [type]: prev[type]?.includes(value) ? prev[type].filter(v => v !== value) : [...(prev[type] || []), value],
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/facilities/${facilityId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...editForm, ...editAttrs }),
            });
            if (res.ok) {
                setEditing(false);
                fetchFacility();
            }
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    if (authStatus === 'loading' || loading) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    }

    if (!facility) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="text-center py-12"><p className="text-gray-500">Facility not found.</p></div></div>;
    }

    const activeClients = clients.filter(c => !c.is_archived);

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-ddor-navy">{facility.provider_name ? `${facility.provider_name} — ` : ''}{facility.name}</h1>
                        <p className="text-sm text-gray-500">Facility from {facility.provider_name || 'Unknown Provider'}</p>
                    </div>
                    {isAdminUser && !editing && (
                        <button onClick={startEditing} className="flex items-center gap-2 px-4 py-2 bg-ddor-blue text-white rounded-lg text-sm font-medium hover:bg-[#156090]">
                            <Edit className="w-4 h-4" /> Edit
                        </button>
                    )}
                    {editing && (
                        <div className="flex gap-2">
                            <button onClick={cancelEditing} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-40">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Building className="w-5 h-5 text-ddor-blue" /> Facility Information</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <InfoField label="Facility Name" value={editing ? undefined : facility.name} editing={editing} editValue={editForm.name} onChange={v => setEditForm((p: any) => ({ ...p, name: v }))} />
                            <InfoField label="Parent Agency" value={`${facility.provider_name || '—'} ${facility.provider_abbreviation ? `(${facility.provider_abbreviation})` : ''}`} />
                            <InfoField label="Primary Service" value={editing ? undefined : facility.primary_service} editing={editing} type="select" options={PRIMARY_SERVICE_OPTIONS} editValue={editForm.primary_service} onChange={v => setEditForm((p: any) => ({ ...p, primary_service: v }))} />
                            <InfoField label="Gender" value={editing ? undefined : facility.facility_gender} editing={editing} type="select" options={GENDER_OPTIONS} editValue={editForm.facility_gender} onChange={v => setEditForm((p: any) => ({ ...p, facility_gender: v }))} />
                            <InfoField label="County" value={facility.county_name ? `${facility.county_name}, ${facility.state_abbr}` : '—'} />
                            <InfoField label="Region" value={editing ? undefined : facility.region} editing={editing} type="select" options={REGION_OPTIONS} editValue={editForm.region} onChange={v => setEditForm((p: any) => ({ ...p, region: v }))} />
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Phone className="w-5 h-5 text-ddor-blue" /> Contact & Location</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <InfoField label="Phone Number" value={editing ? undefined : facility.phone} editing={editing} editValue={editForm.phone} onChange={v => setEditForm((p: any) => ({ ...p, phone: v }))} />
                            <InfoField label="Street Address" value={editing ? undefined : facility.street_address} editing={editing} editValue={editForm.street_address} onChange={v => setEditForm((p: any) => ({ ...p, street_address: v }))} />
                            <InfoField label="City" value={editing ? undefined : facility.city} editing={editing} editValue={editForm.city} onChange={v => setEditForm((p: any) => ({ ...p, city: v }))} />
                            <InfoField label="Zip" value={editing ? undefined : facility.zip} editing={editing} editValue={editForm.zip} onChange={v => setEditForm((p: any) => ({ ...p, zip: v }))} />
                        </div>
                    </div>

                    {/* Service Tags */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><Stethoscope className="w-5 h-5 text-ddor-blue" /> Services & Capabilities</h2>

                        <TagSection label="Facility Type" tags={editing ? editAttrs.facility_type : attributes.facility_type} color="#EC4899" editing={editing} options={FACILITY_TYPE_OPTIONS} onToggle={v => toggleAttr('facility_type', v)} />
                        <TagSection label="SUD Services" tags={editing ? editAttrs.sud_services : attributes.sud_services} color="#10B981" editing={editing} options={SUD_SERVICES_OPTIONS} onToggle={v => toggleAttr('sud_services', v)} />
                        <TagSection label="MH Services" tags={editing ? editAttrs.mh_services : attributes.mh_services} color="#3B82F6" editing={editing} options={MH_SERVICES_OPTIONS} onToggle={v => toggleAttr('mh_services', v)} />
                        <TagSection label="Specialties" tags={editing ? editAttrs.specialties : attributes.specialties} color="#F59E0B" editing={editing} options={SPECIALTIES_OPTIONS} onToggle={v => toggleAttr('specialties', v)} />
                        <TagSection label="Servicing Counties" tags={editing ? editAttrs.servicing_county : attributes.servicing_county} color="#8B5CF6" editing={editing} options={[]} onToggle={() => {}} />
                    </div>

                    {/* Concerns */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><AlertCircle className="w-5 h-5 text-amber-500" /> Concerns</h2>
                        {editing ? (
                            <textarea value={editForm.concerns} onChange={e => setEditForm((p: any) => ({ ...p, concerns: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[80px]" placeholder="Any concerns about this facility..." />
                        ) : (
                            <p className="text-sm text-gray-700">{facility.concerns || 'None noted.'}</p>
                        )}
                    </div>

                    {/* Clients */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                            <h2 className="font-semibold text-ddor-navy flex items-center gap-2">
                                <Users className="w-5 h-5 text-ddor-blue" /> Clients ({activeClients.length})
                            </h2>
                        </div>
                        {activeClients.length === 0 ? (
                            <p className="px-6 py-8 text-center text-gray-400 text-sm">No active clients at this facility.</p>
                        ) : (
                            <div className="divide-y">
                                {activeClients.map(c => (
                                    <div key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
                                        className="px-6 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-ddor-light flex items-center justify-center text-ddor-blue font-semibold text-xs">
                                                {c.first_name?.[0]}{c.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    {c.ddor_id && <span>ID: {c.ddor_id}</span>}
                                                    {c.diagnosis && <span className="uppercase">{c.diagnosis === 'co_occurring' ? 'Co-Oc' : c.diagnosis}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-0.5">
                                                {['fourteen_day_status', 'ninety_day_status', 'final_report_status'].map(key => (
                                                    <div key={key} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[c[key] as ReportCompletionStatus] || '#D1D5DB' }} />
                                                ))}
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

// ======= HELPER COMPONENTS =======

function InfoField({ label, value, editing, editValue, onChange, type = 'text', options = [] }: {
    label: string; value?: string; editing?: boolean; editValue?: string;
    onChange?: (v: string) => void; type?: 'text' | 'select'; options?: string[];
}) {
    if (editing && onChange) {
        return (
            <div>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                {type === 'select' ? (
                    <select value={editValue || ''} onChange={e => onChange(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">— Select —</option>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                ) : (
                    <input type="text" value={editValue || ''} onChange={e => onChange(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                )}
            </div>
        );
    }
    return (
        <div>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
        </div>
    );
}

function TagSection({ label, tags, color, editing, options, onToggle }: {
    label: string; tags?: string[]; color: string; editing: boolean;
    options: string[]; onToggle: (v: string) => void;
}) {
    return (
        <div className="mb-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">{label}</p>
            {editing && options.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {options.map(opt => {
                        const selected = tags?.includes(opt);
                        return (
                            <button key={opt} onClick={() => onToggle(opt)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                                    selected ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                }`}
                                style={selected ? { backgroundColor: color, borderColor: color } : {}}>
                                {opt}
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {tags && tags.length > 0 ? tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: color }}>
                            {tag}
                        </span>
                    )) : (
                        <span className="text-sm text-gray-400">None</span>
                    )}
                </div>
            )}
        </div>
    );
}
