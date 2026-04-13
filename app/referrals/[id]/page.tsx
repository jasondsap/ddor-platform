'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, Loader2, User, Calendar, Phone, MapPin,
    Shield, AlertTriangle, Scale, FileText, CheckCircle2,
    Clock, XCircle, Building, Users
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    'open_within_72_hours': { bg: 'bg-green-50', text: 'text-green-700', icon: Clock, label: 'Open — within 72 hours' },
    'open_72_to_2_weeks': { bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock, label: 'Open — 72hrs to 2 weeks' },
    'open_2_weeks_to_2_months': { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock, label: 'Open — 2 weeks to 2 months' },
    'inactive_2_months_plus': { bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle, label: 'Inactive — 2 months+' },
    'closed': { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle, label: 'Closed' },
};

export default function ReferralDetailPage() {
    const router = useRouter();
    const params = useParams();
    const referralId = params.id as string;
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [loading, setLoading] = useState(true);
    const [referral, setReferral] = useState<any>(null);
    const [attributes, setAttributes] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!ddor || !referralId) return;
        fetch(`/api/referrals/${referralId}`)
            .then(r => r.json())
            .then(d => { setReferral(d.referral); setAttributes(d.attributes || {}); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [ddor, referralId]);

    if (authStatus === 'loading' || loading) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    }

    if (!referral) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="text-center py-12"><p className="text-gray-500">Referral not found.</p></div></div>;
    }

    const fullName = `${referral.first_name} ${referral.last_name}`;
    const statusCfg = STATUS_CONFIG[referral.referral_type_status] || STATUS_CONFIG['open_within_72_hours'];
    const StatusIcon = statusCfg.icon;

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/referrals')} className="p-2 hover:bg-gray-200 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-ddor-navy">{fullName}</h1>
                        <p className="text-sm text-gray-500">Referral #{referral.referral_number || '—'} • {referral.county_name ? `${referral.county_name} County` : 'County not specified'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                        <StatusIcon className="w-4 h-4" /> {statusCfg.label}
                    </span>
                </div>

                {/* Urgent Banner */}
                {referral.is_urgent && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-800">Urgent Referral</p>
                            {referral.urgent_message && <p className="text-sm text-red-700 mt-1">{referral.urgent_message}</p>}
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Participant Info */}
                    <Section title="Participant Information" icon={User}>
                        <FieldGrid>
                            <Field label="Name" value={fullName} />
                            <Field label="Date of Birth" value={referral.date_of_birth ? new Date(referral.date_of_birth).toLocaleDateString() : null} />
                            <Field label="Sex" value={referral.gender} />
                            <Field label="Phone" value={referral.phone} />
                            <Field label="Originating County" value={referral.county_name ? `${referral.county_name} County` : null} />
                            <Field label="Prior Participant" value={referral.prior_participant} />
                        </FieldGrid>
                        {referral.alternate_contact && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Alternate Contact</p>
                                <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">{referral.alternate_contact}</p>
                            </div>
                        )}
                    </Section>

                    {/* Dates & Status */}
                    <Section title="Dates & Status" icon={Calendar}>
                        <FieldGrid>
                            <Field label="Date Received" value={referral.date_received ? new Date(referral.date_received).toLocaleDateString() : null} />
                            <Field label="Referral Date" value={referral.referral_date ? new Date(referral.referral_date).toLocaleDateString() : null} />
                            <Field label="Court Date" value={referral.court_date ? new Date(referral.court_date).toLocaleDateString() : null} />
                            <Field label="Screen Date" value={referral.screen_date ? new Date(referral.screen_date).toLocaleDateString() : null} />
                            <Field label="Assessor Status" value={referral.assessor_status} />
                            <Field label="Eligibility" value={referral.eligibility} />
                            <Field label="Initial Housing" value={referral.initial_housing} />
                            {referral.referral_type_status === 'closed' && <Field label="Closed Reason" value={referral.closed_reason} />}
                        </FieldGrid>
                    </Section>

                    {/* Custody */}
                    {referral.jail_at_referral && (
                        <Section title="Custody Information" icon={Shield}>
                            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg mb-3">
                                <Shield className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-medium text-amber-800">In jail at time of referral</span>
                            </div>
                            {referral.jail_contact_instructions && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Contact Instructions</p>
                                    <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">{referral.jail_contact_instructions}</p>
                                </div>
                            )}
                        </Section>
                    )}

                    {/* Clinical Flags */}
                    {(referral.smi_symptoms || referral.tbi_abi || referral.major_medical_issues) && (
                        <Section title="Clinical Flags" icon={AlertTriangle}>
                            <div className="flex flex-wrap gap-2">
                                {referral.smi_symptoms && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Severe Mental Illness
                                    </span>
                                )}
                                {referral.tbi_abi && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Traumatic Brain Injury
                                    </span>
                                )}
                                {referral.major_medical_issues && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Major Medical Issues
                                    </span>
                                )}
                            </div>
                        </Section>
                    )}

                    {/* Provider Recommendation */}
                    {(referral.recommended_facility_name || referral.loc_recommendation) && (
                        <Section title="Provider Recommendation" icon={Building}>
                            <FieldGrid>
                                <Field label="Recommended Facility" value={referral.recommended_facility_name} />
                                <Field label="Recommended Provider" value={referral.recommended_provider_name} />
                                <Field label="LOC Recommendation" value={referral.loc_recommendation} />
                            </FieldGrid>
                        </Section>
                    )}

                    {/* Assigned Staff */}
                    {(referral.assessor_name || referral.navigator_name) && (
                        <Section title="Assigned Staff" icon={Users}>
                            <FieldGrid>
                                <Field label="Statewide Assessor" value={referral.assessor_name} />
                                <Field label="Case Navigator" value={referral.navigator_name} />
                                <Field label="Created By" value={referral.created_by_name} />
                            </FieldGrid>
                        </Section>
                    )}

                    {/* SB90 Charges */}
                    {attributes.sb90_charge && attributes.sb90_charge.length > 0 && (
                        <Section title="SB90 Charges" icon={Scale}>
                            <div className="flex flex-wrap gap-1.5">
                                {attributes.sb90_charge.map(c => (
                                    <span key={c} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{c}</span>
                                ))}
                            </div>
                            {attributes.sb90_charges_other && (
                                <div className="mt-3">
                                    <p className="text-xs text-gray-500 mb-1">Other Charges</p>
                                    <p className="text-sm text-gray-800">{attributes.sb90_charges_other[0]}</p>
                                </div>
                            )}
                        </Section>
                    )}

                    {/* Reassessment Reasons */}
                    {attributes.reassessment_reason && attributes.reassessment_reason.length > 0 && (
                        <Section title="Reassessment Reasons" icon={FileText}>
                            <div className="space-y-1.5">
                                {attributes.reassessment_reason.map(r => (
                                    <div key={r} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                                        <CheckCircle2 className="w-4 h-4 text-ddor-blue flex-shrink-0 mt-0.5" />
                                        <span className="text-sm text-gray-700">{r}</span>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Linked Client */}
                    {referral.linked_client_id && (
                        <Section title="Linked Client" icon={Users}>
                            <button
                                onClick={() => router.push(`/clients/${referral.linked_client_id}`)}
                                className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors w-full text-left"
                            >
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <div>
                                    <p className="font-medium text-green-800">{referral.linked_client_name}</p>
                                    <p className="text-xs text-green-600">Click to view client record</p>
                                </div>
                            </button>
                        </Section>
                    )}

                    {/* Notes */}
                    {referral.notes && (
                        <Section title="Notes" icon={FileText}>
                            <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{referral.notes}</p>
                        </Section>
                    )}

                    {/* Meta */}
                    <div className="text-xs text-gray-400 pb-8 flex gap-4">
                        {referral.created_at && <span>Created: {new Date(referral.created_at).toLocaleDateString()}</span>}
                        {referral.updated_at && <span>Updated: {new Date(referral.updated_at).toLocaleDateString()}</span>}
                    </div>
                </div>
            </main>
        </div>
    );
}

// ======= HELPER COMPONENTS =======

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-ddor-navy flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-ddor-blue" /> {title}
            </h2>
            {children}
        </div>
    );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-900">{value}</p>
        </div>
    );
}
