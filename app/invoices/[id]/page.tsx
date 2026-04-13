'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Loader2, DollarSign, User, Building, Calendar,
    CheckCircle2, XCircle, Clock, AlertTriangle, Save, FileText
} from 'lucide-react';

const REVIEW_OPTIONS = ['Awaiting Review', 'Approved', 'Rejected', 'Action Required'];
const REIMBURSEMENT_OPTIONS = ['Awaiting Review', 'Approved', 'Sent to Accounts Payable', 'Paid', 'Rejected', 'Action Required'];
const ACTION_REASONS = ['Caps - Participant may have exceeded caps', 'Needs Medicaid Application or Denial', 'Clarification - Question about codes/service lines', 'Contract - Must complete routing/sign contract', 'Duplicate - Invoice may have been submitted twice', 'Eligibility - Services may not be eligible under SB90', 'Missing - Information missing from invoice', 'Other: See FGI Notes', 'Payment Discrepancy Notification', 'Insurance - Participant has Medicaid'];

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: any }> = {
    'Approved': { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
    'Rejected': { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
    'Awaiting Review': { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
    'Action Required': { bg: 'bg-orange-50', text: 'text-orange-700', icon: AlertTriangle },
    'Paid': { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
    'Sent to Accounts Payable': { bg: 'bg-blue-50', text: 'text-blue-700', icon: FileText },
};

export default function InvoiceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const invoiceId = params.id as string;
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;
    const isAdminUser = ddor?.role === 'super_admin' || ddor?.role === 'business_user';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [invoice, setInvoice] = useState<any>(null);
    const [attributes, setAttributes] = useState<Record<string, string[]>>({});
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});

    useEffect(() => { if (ddor) fetchInvoice(); }, [ddor, invoiceId]);

    const fetchInvoice = async () => {
        setLoading(true);
        const d = await fetch(`/api/invoices/${invoiceId}`).then(r => r.json());
        setInvoice(d.invoice); setAttributes(d.attributes || {});
        setEditForm({ fgi_review_1: d.invoice?.fgi_review_1 || 'Awaiting Review', fgi_review_2: d.invoice?.fgi_review_2 || 'Awaiting Review', dbh_review: d.invoice?.dbh_review || 'Awaiting Review', reimbursement_status: d.invoice?.reimbursement_status || 'Awaiting Review', fgi_notes: d.invoice?.fgi_notes || '', date_sent_to_ap: d.invoice?.date_sent_to_ap?.split('T')[0] || '', is_invalid: d.invoice?.is_invalid || false, is_duplicate: d.invoice?.is_duplicate || false });
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        await fetch(`/api/invoices/${invoiceId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
        setEditing(false); setSaving(false); fetchInvoice();
    };

    if (loading) return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    if (!invoice) return <div className="min-h-screen bg-gray-50"><Header /><div className="text-center py-12 text-gray-500">Invoice not found.</div></div>;

    const StatusBadge = ({ status }: { status: string }) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Awaiting Review'];
        const Icon = cfg.icon;
        return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}><Icon className="w-3.5 h-3.5" />{status}</span>;
    };

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/invoices')} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-ddor-navy">Invoice #{invoice.invoice_number}</h1>
                        <p className="text-sm text-gray-500">{invoice.patient_name} • {invoice.facility_name || '—'}</p>
                    </div>
                    {isAdminUser && !editing && <button onClick={() => setEditing(true)} className="px-4 py-2 bg-ddor-blue text-white rounded-lg text-sm font-medium">Review</button>}
                    {editing && <div className="flex gap-2">
                        <button onClick={() => setEditing(false)} className="px-4 py-2 bg-white border rounded-lg text-sm">Cancel</button>
                        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1">{saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save</button>
                    </div>}
                </div>

                {/* Approval Pipeline */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="font-semibold text-ddor-navy mb-4">Approval Pipeline</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'FGI Review 1', key: 'fgi_review_1' },
                            { label: 'FGI Review 2', key: 'fgi_review_2' },
                            { label: 'DBH Review', key: 'dbh_review' },
                            { label: 'Reimbursement', key: 'reimbursement_status' },
                        ].map(step => (
                            <div key={step.key} className="text-center">
                                <p className="text-xs text-gray-500 mb-2">{step.label}</p>
                                {editing ? (
                                    <select value={editForm[step.key] || ''} onChange={e => setEditForm((p: any) => ({ ...p, [step.key]: e.target.value }))}
                                        className="w-full p-2 border rounded-lg text-xs">
                                        {(step.key === 'reimbursement_status' ? REIMBURSEMENT_OPTIONS : REVIEW_OPTIONS).map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                ) : (
                                    <StatusBadge status={invoice[step.key] || 'Awaiting Review'} />
                                )}
                            </div>
                        ))}
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-1 mt-4">
                        {['fgi_review_1', 'fgi_review_2', 'dbh_review', 'reimbursement_status'].map((key, i) => {
                            const val = invoice[key];
                            const color = val === 'Approved' || val === 'Paid' ? 'bg-green-500' : val === 'Rejected' ? 'bg-red-500' : val === 'Action Required' ? 'bg-orange-500' : 'bg-gray-200';
                            return <div key={key} className={`flex-1 h-2 rounded-full ${color}`} />;
                        })}
                    </div>
                </div>

                {/* Invoice Details */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4"><DollarSign className="w-5 h-5 text-ddor-blue" /> Invoice Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div><p className="text-xs text-gray-500">Patient</p><p className="font-medium">{invoice.patient_name}</p></div>
                        <div><p className="text-xs text-gray-500">DOB</p><p className="font-medium">{invoice.patient_dob ? new Date(invoice.patient_dob).toLocaleDateString() : '—'}</p></div>
                        <div><p className="text-xs text-gray-500">Account #</p><p className="font-medium">{invoice.account_number || '—'}</p></div>
                        <div><p className="text-xs text-gray-500">Facility</p><p className="font-medium">{invoice.facility_name || '—'}</p></div>
                        <div><p className="text-xs text-gray-500">Provider</p><p className="font-medium">{invoice.provider_name || '—'}</p></div>
                        <div><p className="text-xs text-gray-500">Submitted By</p><p className="font-medium">{invoice.submitter_name || '—'}</p></div>
                        <div><p className="text-xs text-gray-500">Service From</p><p className="font-medium">{invoice.service_date_from ? new Date(invoice.service_date_from).toLocaleDateString() : '—'}</p></div>
                        <div><p className="text-xs text-gray-500">Service To</p><p className="font-medium">{invoice.service_date_to ? new Date(invoice.service_date_to).toLocaleDateString() : '—'}</p></div>
                        <div><p className="text-xs text-gray-500">Created</p><p className="font-medium">{new Date(invoice.created_at).toLocaleDateString()}</p></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                        <div><p className="text-xs text-gray-500">Total Charge</p><p className="text-xl font-bold text-ddor-navy">{invoice.total_charge ? `$${parseFloat(invoice.total_charge).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</p></div>
                        <div><p className="text-xs text-gray-500">Payment Due</p><p className="text-xl font-bold text-green-600">{invoice.payment_due ? `$${parseFloat(invoice.payment_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</p></div>
                        {invoice.credits_issued && <div><p className="text-xs text-gray-500">Credits Issued</p><p className="text-xl font-bold text-amber-600">${parseFloat(invoice.credits_issued).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>}
                    </div>
                </div>

                {/* Insurance & Attributes */}
                {(attributes.insurance_type || attributes.billing_reason || attributes.steps_insured) && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <h2 className="font-semibold text-ddor-navy mb-4">Insurance & Billing</h2>
                        {attributes.insurance_type && <div className="mb-3"><p className="text-xs text-gray-500 mb-1">Insurance Type</p><div className="flex flex-wrap gap-1">{attributes.insurance_type.map(t => <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{t}</span>)}</div></div>}
                        {attributes.steps_insured && <div className="mb-3"><p className="text-xs text-gray-500 mb-1">Steps Taken</p><div className="flex flex-wrap gap-1">{attributes.steps_insured.map(s => <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{s}</span>)}</div></div>}
                        {attributes.billing_reason && <div><p className="text-xs text-gray-500 mb-1">Billing Reasons</p><div className="flex flex-wrap gap-1">{attributes.billing_reason.map(r => <span key={r} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">{r}</span>)}</div></div>}
                    </div>
                )}

                {/* FGI Notes */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="font-semibold text-ddor-navy mb-4">FGI Notes</h2>
                    {editing ? (
                        <textarea value={editForm.fgi_notes} onChange={e => setEditForm((p: any) => ({ ...p, fgi_notes: e.target.value }))}
                            className="w-full p-3 border rounded-lg text-sm min-h-[80px]" placeholder="Add review notes..." />
                    ) : (
                        <p className="text-sm text-gray-700">{invoice.fgi_notes || 'No notes.'}</p>
                    )}
                </div>

                {/* Flags */}
                {editing && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <h2 className="font-semibold text-ddor-navy mb-4">Flags</h2>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 p-3 bg-red-50 rounded-lg cursor-pointer"><input type="checkbox" checked={editForm.is_invalid} onChange={e => setEditForm((p: any) => ({ ...p, is_invalid: e.target.checked }))} className="w-4 h-4 rounded" /><span className="text-sm text-red-800">Mark as Invalid</span></label>
                            <label className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg cursor-pointer"><input type="checkbox" checked={editForm.is_duplicate} onChange={e => setEditForm((p: any) => ({ ...p, is_duplicate: e.target.checked }))} className="w-4 h-4 rounded" /><span className="text-sm text-amber-800">Mark as Duplicate</span></label>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
