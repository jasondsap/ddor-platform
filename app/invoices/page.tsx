'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    DollarSign, Plus, ChevronRight, Loader2, Search,
    CheckCircle2, Clock, AlertTriangle, X, Filter
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    awaiting_review: { label: 'Awaiting Review', bg: 'bg-amber-50', text: 'text-amber-700' },
    action_required: { label: 'Action Required', bg: 'bg-red-50', text: 'text-red-700' },
    sent_to_ap: { label: 'Sent to AP', bg: 'bg-blue-50', text: 'text-blue-700' },
    paid: { label: 'Paid', bg: 'bg-green-50', text: 'text-green-700' },
    rejected: { label: 'Rejected', bg: 'bg-gray-100', text: 'text-gray-600' },
};

export default function InvoicesPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;
    const isAdmin = ddor?.role === 'super_admin' || ddor?.role === 'business_user';

    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor?.userId) return;
        fetchInvoices();
    }, [ddor?.userId, statusFilter]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            const res = await fetch(`/api/invoices?${params}`);
            const data = await res.json();
            setInvoices(data.invoices || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const totalDue = invoices.reduce((sum, i) => sum + (parseFloat(i.payment_due) || 0), 0);

    if (authStatus === 'loading') {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-ddor-navy">Invoices</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                            {totalDue > 0 && ` • $${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })} total due`}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/invoices/new')}
                        className="flex items-center gap-2 px-4 py-2 bg-ddor-blue text-white rounded-lg font-medium hover:bg-[#156090] text-sm"
                    >
                        <Plus className="w-4 h-4" /> Submit Invoice
                    </button>
                </div>

                {/* Status filters */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    <button
                        onClick={() => setStatusFilter('')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${!statusFilter ? 'bg-ddor-blue text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                        All
                    </button>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(key)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                statusFilter === key ? `${config.bg} ${config.text} border border-current/20` : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {config.label}
                        </button>
                    ))}
                </div>

                {/* Invoice list */}
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>
                ) : invoices.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                        <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No invoices found.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm divide-y">
                        {invoices.map((inv) => {
                            const status = STATUS_CONFIG[inv.reimbursement_status] || STATUS_CONFIG.awaiting_review;
                            return (
                                <div
                                    key={inv.id}
                                    onClick={() => router.push(`/invoices/${inv.id}`)}
                                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-medium text-sm">
                                            #{inv.invoice_number}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">{inv.patient_name}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                <span>{inv.facility_name || inv.provider_abbreviation}</span>
                                                <span>•</span>
                                                <span>{new Date(inv.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {inv.payment_due && (
                                            <span className="text-sm font-semibold text-gray-900">
                                                ${parseFloat(inv.payment_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        )}
                                        {/* Approval pipeline indicators (admin view) */}
                                        {isAdmin && (
                                            <div className="hidden sm:flex items-center gap-1">
                                                <PipelineDot label="FGI-1" status={inv.fgi_review_1} />
                                                <PipelineDot label="FGI-2" status={inv.fgi_review_2} />
                                                <PipelineDot label="DBH" status={inv.dbh_review} />
                                            </div>
                                        )}
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                            {status.label}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

function PipelineDot({ label, status }: { label: string; status: string }) {
    const color = status === 'approved' ? '#10B981' : status === 'rejected' ? '#EF4444' : status === 'action_required' ? '#F59E0B' : '#D1D5DB';
    return (
        <div className="flex flex-col items-center" title={`${label}: ${status}`}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        </div>
    );
}
