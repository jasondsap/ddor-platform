'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
    Search, User, Calendar, Stethoscope, MapPin, X, Bell
} from 'lucide-react';

const PARTICIPANT_ACTIONS = [
    { value: 'scheduled_appointment', label: 'Scheduled an appointment' },
    { value: 'initiated_treatment', label: 'Initiated treatment (assessment/intake/first session)' },
];

const LEVEL_OF_CARE = [
    'Outpatient SUD',
    'Residential/Inpatient SUD',
    'Outpatient Mental Health',
    'Inpatient Mental Health',
    'Unknown',
];

const FACILITY_COUNTIES = [
    'Bell', 'Christian', 'Clark/Madison', 'Daviess', 'Greenup/Lewis',
    'Hopkins', 'Johnson', 'Kenton', 'Letcher', 'Marshall', 'McCracken',
    'Oldham/Henry', 'Pike', 'Pulaski/Wayne/Russell', 'Warren', 'Unsure',
];

function InitiationFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;
    const preselectedClientId = searchParams.get('client_id');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Client search
    const [clientSearch, setClientSearch] = useState('');
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const [form, setForm] = useState({
        participant_action: '',
        scheduled_date: '',
        treatment_initiation_date: '',
        level_of_care: '',
        facility_county: '',
        submitter_email: session?.user?.email || '',
        notes: '',
    });

    // Load preselected client
    useEffect(() => {
        if (preselectedClientId) {
            fetch(`/api/clients/${preselectedClientId}`)
                .then(r => r.json())
                .then(data => {
                    if (data.client) {
                        setSelectedClient(data.client);
                    }
                })
                .catch(console.error);
        }
    }, [preselectedClientId]);

    // Search clients
    useEffect(() => {
        if (clientSearch.length < 2) { setClients([]); return; }
        const timer = setTimeout(() => {
            fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&status=active`)
                .then(r => r.json())
                .then(data => setClients(data.clients || []))
                .catch(console.error);
        }, 300);
        return () => clearTimeout(timer);
    }, [clientSearch]);

    const updateField = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setError('');
    };

    const selectClient = (client: any) => {
        setSelectedClient(client);
        setClientSearch('');
        setShowDropdown(false);
    };

    const handleSubmit = async () => {
        if (!selectedClient) { setError('Please select a participant'); return; }
        if (!form.participant_action) { setError('Please select what the participant did'); return; }
        if (form.participant_action === 'initiated_treatment' && !form.treatment_initiation_date) {
            setError('Treatment Initiation Date is required when treatment has been initiated');
            return;
        }
        if (form.participant_action === 'scheduled_appointment' && !form.scheduled_date) {
            setError('Scheduled Date is required');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/initiation-notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: selectedClient.id,
                    ...form,
                }),
            });

            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to submit'); setSaving(false); return; }

            setSuccess(true);
            setTimeout(() => router.push(`/clients/${selectedClient.id}`), 2000);
        } catch (e) {
            setError('An unexpected error occurred.');
            setSaving(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-24 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-ddor-navy mb-2">Initiation Notification Submitted</h2>
                {form.participant_action === 'initiated_treatment' && (
                    <p className="text-gray-600 mb-2">
                        Treatment start date has been set to {new Date(form.treatment_initiation_date).toLocaleDateString()}.
                        Report due dates are now active.
                    </p>
                )}
                <p className="text-gray-400 text-sm">Redirecting to client page...</p>
            </div>
        );
    }

    const isInitiated = form.participant_action === 'initiated_treatment';
    const isScheduled = form.participant_action === 'scheduled_appointment';

    return (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-lg">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-ddor-navy">Initiation Notification</h1>
                    <p className="text-sm text-gray-500">Notify that a participant has scheduled or begun treatment</p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <div className="space-y-6">
                {/* Participant Selector */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-ddor-blue" /> Participant
                    </h2>

                    {selectedClient ? (
                        <div className="flex items-center justify-between p-4 bg-ddor-light rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-ddor-blue/10 flex items-center justify-center text-ddor-blue font-semibold">
                                    {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{selectedClient.first_name} {selectedClient.last_name}</p>
                                    <p className="text-xs text-gray-500">
                                        {selectedClient.facility_name || 'No facility'} • DOB: {selectedClient.date_of_birth ? new Date(selectedClient.date_of_birth).toLocaleDateString() : '—'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedClient(null)} className="p-1 hover:bg-white rounded">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={clientSearch}
                                onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder="Search participant by name..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ddor-blue/20 focus:border-ddor-blue"
                            />
                            {showDropdown && clients.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {clients.map((c: any) => (
                                        <button
                                            key={c.id}
                                            onClick={() => selectClient(c)}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0 flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                                                {c.first_name?.[0]}{c.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                                                <p className="text-xs text-gray-500">{c.facility_name || '—'}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* What did the participant do? */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4">
                        <Bell className="w-5 h-5 text-ddor-blue" /> Participant Action
                    </h2>

                    <div className="space-y-2">
                        {PARTICIPANT_ACTIONS.map(action => (
                            <label
                                key={action.value}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                    form.participant_action === action.value
                                        ? 'border-ddor-blue bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="action"
                                    value={action.value}
                                    checked={form.participant_action === action.value}
                                    onChange={() => updateField('participant_action', action.value)}
                                    className="w-4 h-4 text-ddor-blue"
                                />
                                <span className={`text-sm ${form.participant_action === action.value ? 'text-ddor-blue font-medium' : 'text-gray-700'}`}>
                                    {action.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Dates & Details */}
                {form.participant_action && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5 text-ddor-blue" /> Details
                        </h2>

                        <div className="space-y-4">
                            {isScheduled && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date *</label>
                                    <input type="date" value={form.scheduled_date} onChange={e => updateField('scheduled_date', e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm max-w-xs" />
                                </div>
                            )}

                            {isInitiated && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Initiation Date *</label>
                                        <input type="date" value={form.treatment_initiation_date} onChange={e => updateField('treatment_initiation_date', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm max-w-xs" />
                                    </div>
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-green-800">
                                            This date will be set as the participant&apos;s treatment start date. All report due dates (14-Day, 42-Day, etc.) will be calculated from this date.
                                        </p>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Level of Care</label>
                                <select value={form.level_of_care} onChange={e => updateField('level_of_care', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                                    <option value="">— Select —</option>
                                    {LEVEL_OF_CARE.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Facility / County</label>
                                <select value={form.facility_county} onChange={e => updateField('facility_county', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                                    <option value="">— Select —</option>
                                    {FACILITY_COUNTIES.map(fc => <option key={fc} value={fc}>{fc}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Submitter & Notes */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4">
                        <Stethoscope className="w-5 h-5 text-ddor-blue" /> Submitter
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                            <input type="email" value={form.submitter_email} onChange={e => updateField('submitter_email', e.target.value)}
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="you@provider.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)}
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm min-h-[80px]" placeholder="Optional notes..." />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pb-8">
                    <button onClick={() => router.back()} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saving || !selectedClient}
                        className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold hover:bg-[#156090] disabled:opacity-40 flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Submitting...' : 'Submit Notification'}
                    </button>
                </div>
            </div>
        </main>
    );
}

export default function InitiationNotificationPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>}>
                <InitiationFormContent />
            </Suspense>
        </div>
    );
}
