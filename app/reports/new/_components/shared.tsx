// app/reports/new/_components/shared.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, Search, User, X } from 'lucide-react';

// ============================================================================
// HOOKS
// ============================================================================

// Manages the selected participant for a report-entry form.
// - If URL has ?client_id=X, fetches that client on mount.
// - Picker selection updates both local state and URL (so type-switching
//   preserves the selection, and the URL stays shareable).
export function useParticipantSelection(initialClientId: string) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [loading, setLoading] = useState(!!initialClientId);

    useEffect(() => {
        if (!initialClientId) { setLoading(false); return; }
        // Skip refetch if we already have this client (just picked via dropdown
        // → URL just updated to match → effect re-runs but client already in state)
        if (selectedClient?.id === initialClientId) { setLoading(false); return; }
        let cancelled = false;
        setLoading(true);
        fetch(`/api/clients/${initialClientId}`)
            .then(r => r.json())
            .then(d => { if (!cancelled && d.client) setSelectedClient(d.client); })
            .catch(console.error)
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialClientId]);

    const selectClient = (c: any) => {
        setSelectedClient(c);
        const params = new URLSearchParams(searchParams.toString());
        params.set('client_id', c.id);
        router.replace(`?${params.toString()}`);
    };

    const clearClient = () => {
        setSelectedClient(null);
        const params = new URLSearchParams(searchParams.toString());
        params.delete('client_id');
        router.replace(`?${params.toString()}`);
    };

    return { selectedClient, selectClient, clearClient, loading };
}

export function useReportSubmit() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const submit = async (clientId: string, formData: Record<string, any>) => {
        if (!clientId) { setError('No client selected'); return; }
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, client_id: clientId }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to submit');
                setSaving(false);
                return;
            }
            setSuccess(true);
            setTimeout(() => router.push(`/clients/${clientId}`), 1500);
        } catch (e) {
            setError('An unexpected error occurred.');
            setSaving(false);
        }
    };

    return { submit, saving, error, success, setError };
}

// ============================================================================
// SHARED UI COMPONENTS
// ============================================================================

export function FormSection({
    title, icon: Icon, id, expanded, onToggle, children,
}: {
    title: string;
    icon: any;
    id: string;
    expanded: boolean;
    onToggle: (id: string) => void;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
                onClick={() => onToggle(id)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50"
                type="button"
            >
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-ddor-blue" />
                    <h2 className="font-semibold text-ddor-navy">{title}</h2>
                </div>
                {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {expanded && <div className="px-5 pb-5 space-y-4 border-t">{children}</div>}
        </div>
    );
}

export function SelectField({
    label, value, onChange, options, required,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: readonly string[];
    required?: boolean;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
            >
                <option value="">— Select —</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

export function TextField({
    label, value, onChange, placeholder, required, type = 'text',
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    type?: 'text' | 'email' | 'date';
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
            />
        </div>
    );
}

export function TextAreaField({
    label, value, onChange, placeholder, required, rows = 3,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    rows?: number;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
            />
        </div>
    );
}

export function MultiCheckGroup({
    label, options, selected, onToggle, required,
}: {
    label: string;
    options: readonly string[];
    selected: string[];
    onToggle: (v: string) => void;
    required?: boolean;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {options.map(opt => (
                    <label
                        key={opt}
                        className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                            selected.includes(opt)
                                ? 'bg-blue-50 text-blue-800'
                                : 'hover:bg-gray-50 text-gray-700'
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(opt)}
                            onChange={() => onToggle(opt)}
                            className="w-4 h-4 rounded border-gray-300 text-ddor-blue mt-0.5 flex-shrink-0"
                        />
                        <span className="leading-tight">{opt}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

// "Provided to date" service grid — single-column (no more planned tracking)
export function ServiceGrid({
    label, options, selected, onToggle, required,
}: {
    label: string;
    options: readonly string[];
    selected: string[];
    onToggle: (v: string) => void;
    required?: boolean;
}) {
    return (
        <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-ddor-navy mb-3">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {options.map(opt => (
                    <label
                        key={opt}
                        className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                            selected.includes(opt)
                                ? 'bg-blue-50 text-blue-800'
                                : 'hover:bg-gray-50 text-gray-700'
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(opt)}
                            onChange={() => onToggle(opt)}
                            className="w-4 h-4 rounded border-gray-300 text-ddor-blue mt-0.5 flex-shrink-0"
                        />
                        <span className="leading-tight">{opt}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// FORM SHELL (header, error, type selector, submit footer)
// ============================================================================

import { ArrowLeft, AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { REPORT_TYPES, ReportType, CREDENTIAL } from '@/lib/report-fields';

export function FormHeader({
    client, clientId, onBack,
}: {
    client: any;
    clientId: string;
    onBack: () => void;
}) {
    return (
        <div className="flex items-center gap-4 mb-6">
            <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-lg" type="button">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-ddor-navy">Submit Report</h1>
                {client && <p className="text-sm text-gray-500">{client.first_name} {client.last_name}</p>}
            </div>
        </div>
    );
}

export function ReportTypeSelector({
    value, onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm font-medium"
            >
                {Object.entries(REPORT_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                ))}
            </select>
        </div>
    );
}

export function ErrorBanner({ message }: { message: string }) {
    if (!message) return null;
    return (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{message}</p>
        </div>
    );
}

export function SuccessScreen() {
    return (
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-ddor-navy mb-2">Report Submitted</h2>
            <p className="text-gray-500">Redirecting to client page...</p>
        </div>
    );
}

export function SubmitFooter({
    saving, onCancel, onSubmit,
}: {
    saving: boolean;
    onCancel: () => void;
    onSubmit: () => void;
}) {
    return (
        <div className="flex gap-3 mt-8 mb-12">
            <button
                onClick={onCancel}
                className="flex-1 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                type="button"
            >
                Cancel
            </button>
            <button
                onClick={onSubmit}
                disabled={saving}
                className="flex-1 py-3 bg-ddor-blue text-white rounded-xl font-semibold hover:bg-[#156090] disabled:opacity-40 flex items-center justify-center gap-2"
                type="button"
            >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Submitting...' : 'Submit Report'}
            </button>
        </div>
    );
}

// Signature section is identical across all report types
export function SignatureSection({
    form, updateField,
}: {
    form: Record<string, any>;
    updateField: (k: string, v: any) => void;
}) {
    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Name<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                        type="text"
                        value={form.submitter_name}
                        onChange={e => updateField('submitter_name', e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                        placeholder="First Last"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Email<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                        type="email"
                        value={form.submitter_email}
                        onChange={e => updateField('submitter_email', e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                        placeholder="email@provider.com"
                    />
                </div>
            </div>
            <SelectField
                label="Credential"
                value={form.credential}
                onChange={v => updateField('credential', v)}
                options={CREDENTIAL}
            />
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <input
                    type="checkbox"
                    checked={form.sign_now}
                    onChange={e => updateField('sign_now', e.target.checked)}
                    className="w-4 h-4 rounded"
                />
                <span className="text-sm text-blue-800 font-medium">
                    Sign NOW — selecting this serves as your electronic signature
                </span>
            </div>
            {form.sign_now && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Signature Date</label>
                    <input
                        type="date"
                        value={form.signature_date}
                        onChange={e => updateField('signature_date', e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm max-w-xs"
                    />
                </div>
            )}
        </>
    );
}

export function CommonLoading() {
    return (
        <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-ddor-blue" />
        </div>
    );
}

// ============================================================================
// PARTICIPANT PICKER
// Matches the pattern in /forms/sb90-demographic. Search → dropdown → select,
// X icon to clear. Hits GET /api/clients?search=...&status=active.
// ============================================================================
export function ParticipantPicker({
    selectedClient,
    onSelect,
    onClear,
}: {
    selectedClient: any | null;
    onSelect: (client: any) => void;
    onClear: () => void;
}) {
    const [clientSearch, setClientSearch] = useState('');
    const [clients, setClients] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        if (clientSearch.length < 2) { setClients([]); return; }
        const t = setTimeout(() => {
            fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&status=active`)
                .then(r => r.json())
                .then(d => setClients(d.clients || []))
                .catch(console.error);
        }, 300);
        return () => clearTimeout(t);
    }, [clientSearch]);

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-ddor-blue" /> Participant
            </h2>
            {selectedClient ? (
                <div className="flex items-center justify-between p-4 bg-ddor-light rounded-lg">
                    <div>
                        <p className="font-medium text-ddor-navy">
                            {selectedClient.first_name} {selectedClient.last_name}
                        </p>
                        {selectedClient.ddor_id && (
                            <p className="text-xs text-gray-500 mt-0.5">DDOR ID: {selectedClient.ddor_id}</p>
                        )}
                    </div>
                    <button
                        onClick={onClear}
                        type="button"
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-4 h-4" /> Change
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={clientSearch}
                        onChange={e => { setClientSearch(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        placeholder="Search by name or DDOR ID..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm"
                    />
                    {showDropdown && clients.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {clients.map(c => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(c);
                                        setClientSearch('');
                                        setShowDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-sm"
                                >
                                    <span className="font-medium text-ddor-navy">{c.first_name} {c.last_name}</span>
                                    {c.ddor_id && <span className="text-gray-500 ml-2">{c.ddor_id}</span>}
                                </button>
                            ))}
                        </div>
                    )}
                    {showDropdown && clientSearch.length >= 2 && clients.length === 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-sm text-gray-500">
                            No matching participants found.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
