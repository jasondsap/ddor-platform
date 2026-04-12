'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, User, Calendar, MapPin, FileText, Activity,
    Plus, Loader2, ChevronRight, Clock, AlertTriangle,
    CheckCircle2, Archive, Edit, Shield, Stethoscope,
    ClipboardList, DollarSign, ChevronDown, ChevronUp,
    RefreshCw, GraduationCap, Bell, UserCheck
} from 'lucide-react';
import { REPORT_TYPE_LABELS, REPORT_MILESTONES, STATUS_COLORS } from '@/types';
import type { ReportCompletionStatus } from '@/types';

export default function ClientDetailPage() {
    const router = useRouter();
    const params = useParams();
    const clientId = params.id as string;
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [client, setClient] = useState<any>(null);
    const [referral, setReferral] = useState<any>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [questionnaires, setQuestionnaires] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'assessments' | 'referral'>('overview');

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.push('/auth/signin');
    }, [authStatus, router]);

    useEffect(() => {
        if (!clientId || !ddor?.userId) return;
        fetchClient();
    }, [clientId, ddor?.userId]);

    const fetchClient = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/clients/${clientId}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setClient(data.client);
            setReferral(data.referral);
            setReports(data.reports || []);
            setQuestionnaires(data.questionnaires || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    if (authStatus === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-ddor-blue" />
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-4xl mx-auto px-6 py-12 text-center">
                    <p className="text-gray-500">Client not found or access denied.</p>
                    <button onClick={() => router.push('/clients')} className="mt-4 text-ddor-blue hover:underline">← Back to Clients</button>
                </div>
            </div>
        );
    }

    const milestones = [
        { key: 'fourteen_day', label: '14-Day', days: 14, statusKey: 'fourteen_day_status', remainKey: 'fourteen_day_days_remaining' },
        { key: 'forty_two_day', label: '42-Day', days: 42, statusKey: 'forty_two_day_status', remainKey: 'forty_two_day_days_remaining' },
        { key: 'ninety_day', label: '90-Day', days: 90, statusKey: 'ninety_day_status', remainKey: 'ninety_day_days_remaining' },
        { key: 'one_eighty_day', label: '180-Day', days: 180, statusKey: 'one_eighty_day_status', remainKey: 'one_eighty_day_days_remaining' },
        { key: 'two_seventy_day', label: '270-Day', days: 270, statusKey: 'two_seventy_day_status', remainKey: 'two_seventy_day_days_remaining' },
        { key: 'three_sixty_day', label: '360-Day', days: 360, statusKey: 'three_sixty_day_status', remainKey: 'three_sixty_day_days_remaining' },
    ];

    const age = client.date_of_birth
        ? Math.floor((Date.now() - new Date(client.date_of_birth).getTime()) / (365.25 * 86400000))
        : null;

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                {/* Back + Name */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/clients')} className="p-2 hover:bg-gray-200 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-ddor-navy">
                            {client.first_name} {client.last_name}
                        </h1>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                            {client.ddor_id && <span>ID: {client.ddor_id}</span>}
                            {client.facility_name && <span>• {client.facility_name}</span>}
                            {client.provider_name && <span>({client.provider_name})</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {client.is_archived && (
                            <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm font-medium flex items-center gap-1">
                                <Archive className="w-3.5 h-3.5" /> Archived
                            </span>
                        )}
                        <button onClick={() => router.push(`/clients/${clientId}/edit`)}
                            className="flex items-center gap-2 px-4 py-2 bg-ddor-blue text-white rounded-lg text-sm font-medium hover:bg-[#156090]">
                            <Edit className="w-4 h-4" /> Edit
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => router.push(`/reports/new?client_id=${clientId}&type=fourteen_day`)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
                    >
                        <FileText className="w-4 h-4 text-ddor-blue" /> Submit Report
                    </button>
                    <button
                        onClick={() => router.push(`/initiation/new?client_id=${clientId}`)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
                    >
                        <Bell className="w-4 h-4 text-green-600" /> Initiation
                    </button>
                    <button
                        onClick={() => router.push(`/status-change/new?client_id=${clientId}`)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
                    >
                        <RefreshCw className="w-4 h-4 text-amber-600" /> Status Change
                    </button>
                    <button
                        onClick={() => router.push(`/kyae-referral/new?client_id=${clientId}`)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
                    >
                        <GraduationCap className="w-4 h-4 text-purple-600" /> KYAE Referral
                    </button>
                    <button
                        onClick={() => router.push(`/demographic/new?client_id=${clientId}`)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
                    >
                        <UserCheck className="w-4 h-4 text-teal-600" /> Demographic
                    </button>
                    <button
                        onClick={() => router.push(`/assessments/barc10?client_id=${clientId}`)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
                    >
                        <Activity className="w-4 h-4 text-emerald-600" /> BARC-10
                    </button>
                    <button
                        onClick={() => router.push(`/gain-ss/new?client_id=${clientId}`)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
                    >
                        <Shield className="w-4 h-4 text-orange-600" /> GAIN-SS
                    </button>
                </div>

                {/* Client Info Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <InfoItem icon={Calendar} label="DOB" value={client.date_of_birth ? `${new Date(client.date_of_birth).toLocaleDateString()}${age ? ` (${age}y)` : ''}` : '—'} />
                        <InfoItem icon={Stethoscope} label="Diagnosis" value={client.diagnosis ? client.diagnosis.replace('_', '-').toUpperCase() : '—'} />
                        <InfoItem icon={Calendar} label="Tx Start" value={client.treatment_start_date ? new Date(client.treatment_start_date).toLocaleDateString() : 'Not set'} highlight={!client.treatment_start_date} />
                        <InfoItem icon={Shield} label="Agreement" value={client.agreement_signed_date ? new Date(client.agreement_signed_date).toLocaleDateString() : '—'} />
                    </div>
                </div>

                {/* Report Timeline */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="font-semibold text-ddor-navy mb-4 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" /> Report Timeline
                    </h2>

                    {!client.treatment_start_date ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                            <AlertTriangle className="w-4 h-4 inline mr-2" />
                            Treatment start date is required to calculate report due dates.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {milestones.map((m) => {
                                const status = client[m.statusKey] as ReportCompletionStatus;
                                const remaining = client[m.remainKey] as number;
                                const dueDate = new Date(new Date(client.treatment_start_date).getTime() + m.days * 86400000);

                                return (
                                    <div key={m.key} className="flex items-center gap-4 py-2 px-3 rounded-lg hover:bg-gray-50">
                                        {/* Status dot */}
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: STATUS_COLORS[status] || '#D1D5DB' }}
                                        />

                                        {/* Label */}
                                        <div className="w-20 flex-shrink-0">
                                            <span className="text-sm font-medium text-gray-900">{m.label}</span>
                                        </div>

                                        {/* Due date */}
                                        <div className="w-28 flex-shrink-0">
                                            <span className="text-sm text-gray-500">{dueDate.toLocaleDateString()}</span>
                                        </div>

                                        {/* Status badge */}
                                        <div className="flex-1">
                                            <StatusBadge status={status} remaining={remaining} />
                                        </div>

                                        {/* Action */}
                                        {(status === 'pending' || status === 'overdue') && (
                                            <button
                                                onClick={() => router.push(`/reports/new?client_id=${clientId}&type=${m.key}`)}
                                                className="text-xs px-3 py-1 bg-ddor-blue text-white rounded-lg hover:bg-[#156090]"
                                            >
                                                Submit
                                            </button>
                                        )}
                                        {status === 'completed' && (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        )}
                                    </div>
                                );
                            })}

                            {/* KYAE */}
                            <div className="flex items-center gap-4 py-2 px-3 rounded-lg hover:bg-gray-50">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[client.kyae_referral_status as ReportCompletionStatus] || '#D1D5DB' }} />
                                <div className="w-20 flex-shrink-0"><span className="text-sm font-medium text-gray-900">KYAE</span></div>
                                <div className="w-28 flex-shrink-0"><span className="text-sm text-gray-500">w/ 14-Day</span></div>
                                <div className="flex-1"><StatusBadge status={client.kyae_referral_status} remaining={client.fourteen_day_days_remaining} /></div>
                            </div>

                            {/* Assessments due with 42-day */}
                            <div className="flex items-center gap-4 py-2 px-3 rounded-lg hover:bg-gray-50">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[client.barc10_status as ReportCompletionStatus] || '#D1D5DB' }} />
                                <div className="w-20 flex-shrink-0"><span className="text-sm font-medium text-gray-900">BARC-10</span></div>
                                <div className="w-28 flex-shrink-0"><span className="text-sm text-gray-500">w/ 42-Day</span></div>
                                <div className="flex-1"><StatusBadge status={client.barc10_status} remaining={client.forty_two_day_days_remaining} /></div>
                                {(client.barc10_status === 'pending' || client.barc10_status === 'overdue') && (
                                    <button
                                        onClick={() => router.push(`/assessments/barc10?client_id=${clientId}`)}
                                        className="text-xs px-3 py-1 bg-ddor-teal text-white rounded-lg hover:bg-[#239aa8]"
                                    >
                                        Administer
                                    </button>
                                )}
                            </div>

                            {/* PHQ9/GAD7 */}
                            <div className="flex items-center gap-4 py-2 px-3 rounded-lg hover:bg-gray-50">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[client.phq9_gad7_status as ReportCompletionStatus] || '#D1D5DB' }} />
                                <div className="w-20 flex-shrink-0"><span className="text-sm font-medium text-gray-900">PHQ/GAD</span></div>
                                <div className="w-28 flex-shrink-0"><span className="text-sm text-gray-500">w/ 42-Day</span></div>
                                <div className="flex-1"><StatusBadge status={client.phq9_gad7_status} remaining={client.forty_two_day_days_remaining} /></div>
                            </div>

                            {/* Final */}
                            <div className="flex items-center gap-4 py-2 px-3 rounded-lg hover:bg-gray-50">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[client.final_report_status as ReportCompletionStatus] || '#D1D5DB' }} />
                                <div className="w-20 flex-shrink-0"><span className="text-sm font-medium text-gray-900">Final</span></div>
                                <div className="w-28 flex-shrink-0"><span className="text-sm text-gray-500">30d post-DC</span></div>
                                <div className="flex-1"><StatusBadge status={client.final_report_status} remaining={null} /></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 shadow-sm w-fit">
                    {[
                        { key: 'overview', label: 'Overview', icon: User },
                        { key: 'reports', label: 'Reports', icon: FileText, count: reports.length },
                        { key: 'assessments', label: 'Assessments', icon: Activity, count: questionnaires.length },
                        { key: 'referral', label: 'Referral', icon: ClipboardList },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === tab.key
                                    ? 'bg-ddor-blue text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    {/* Overview */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Participant Details</h3>
                                    <dl className="space-y-2">
                                        <DetailRow label="First Name" value={client.first_name} />
                                        <DetailRow label="Last Name" value={client.last_name} />
                                        <DetailRow label="Date of Birth" value={client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString() : null} />
                                        <DetailRow label="DDOR ID" value={client.ddor_id} />
                                        <DetailRow label="Diagnosis" value={client.diagnosis?.replace('_', '-')} />
                                        <DetailRow label="OUD" value={client.has_oud ? 'Yes' : 'No'} />
                                    </dl>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Program</h3>
                                    <dl className="space-y-2">
                                        <DetailRow label="Facility" value={client.facility_name} />
                                        <DetailRow label="Provider" value={client.provider_name} />
                                        <DetailRow label="Agreement Signed" value={client.agreement_signed_date ? new Date(client.agreement_signed_date).toLocaleDateString() : null} />
                                        <DetailRow label="Treatment Start" value={client.treatment_start_date ? new Date(client.treatment_start_date).toLocaleDateString() : null} />
                                        <DetailRow label="Agreement End" value={client.agreement_end_date ? new Date(client.agreement_end_date).toLocaleDateString() : null} />
                                        <DetailRow label="Insurance" value={client.insurance_status} />
                                    </dl>
                                </div>
                            </div>

                            {client.notes && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
                                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{client.notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reports */}
                    {activeTab === 'reports' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-ddor-navy">Submitted Reports</h3>
                                <button
                                    onClick={() => router.push(`/reports/new?client_id=${clientId}`)}
                                    className="flex items-center gap-1 text-sm text-ddor-blue hover:underline"
                                >
                                    <Plus className="w-4 h-4" /> Submit Report
                                </button>
                            </div>

                            {reports.length === 0 ? (
                                <p className="text-gray-500 text-sm py-8 text-center">No reports submitted yet.</p>
                            ) : (
                                <div className="divide-y">
                                    {reports.map((report: any) => (
                                        <div
                                            key={report.id}
                                            onClick={() => router.push(`/reports/${report.id}`)}
                                            className="flex items-center justify-between py-3 hover:bg-gray-50 cursor-pointer px-2 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-ddor-blue" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {REPORT_TYPE_LABELS[report.report_type as keyof typeof REPORT_TYPE_LABELS] || report.report_type}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {report.date_submitted ? new Date(report.date_submitted).toLocaleDateString() : 'Draft'}
                                                        {report.quarter_completed && ` • ${report.quarter_completed}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {report.is_signed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Assessments */}
                    {activeTab === 'assessments' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-ddor-navy">Questionnaire Submissions</h3>
                                <button
                                    onClick={() => router.push(`/assessments/barc10?client_id=${clientId}`)}
                                    className="flex items-center gap-1 text-sm text-ddor-blue hover:underline"
                                >
                                    <Plus className="w-4 h-4" /> New Assessment
                                </button>
                            </div>

                            {questionnaires.length === 0 ? (
                                <p className="text-gray-500 text-sm py-8 text-center">No assessments recorded yet.</p>
                            ) : (
                                <div className="divide-y">
                                    {questionnaires.map((q: any) => (
                                        <div key={q.id} className="flex items-center justify-between py-3 px-2">
                                            <div className="flex items-center gap-3">
                                                <Activity className="w-5 h-5 text-ddor-teal" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{q.questionnaire_name || q.questionnaire_type}</p>
                                                    <p className="text-xs text-gray-500">{new Date(q.submitted_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {q.total_score !== null && (
                                                    <span className="text-sm font-medium text-ddor-blue">{q.total_score}</span>
                                                )}
                                                {q.is_complete ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <Clock className="w-4 h-4 text-amber-500" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Referral */}
                    {activeTab === 'referral' && (
                        <div>
                            {!referral ? (
                                <p className="text-gray-500 text-sm py-8 text-center">No referral linked to this client.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Referral Info</h3>
                                        <dl className="space-y-2">
                                            <DetailRow label="Referral #" value={referral.referral_number} />
                                            <DetailRow label="Date Received" value={referral.date_received ? new Date(referral.date_received).toLocaleDateString() : null} />
                                            <DetailRow label="Screen Date" value={referral.screen_date ? new Date(referral.screen_date).toLocaleDateString() : null} />
                                            <DetailRow label="Eligibility" value={referral.eligibility?.replace(/_/g, ' ')} />
                                            <DetailRow label="Status" value={referral.referral_type_status?.replace(/_/g, ' ')} />
                                            <DetailRow label="Case Navigator" value={referral.navigator_name} />
                                        </dl>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Assessment</h3>
                                        <dl className="space-y-2">
                                            <DetailRow label="LOC Recommendation" value={referral.loc_recommendation} />
                                            <DetailRow label="Housing" value={referral.initial_housing?.replace(/_/g, ' ')} />
                                            <DetailRow label="SMI" value={referral.smi_symptoms ? 'Yes' : 'No'} />
                                            <DetailRow label="TBI/ABI" value={referral.tbi_abi ? 'Yes' : 'No'} />
                                            <DetailRow label="Prior Participant" value={referral.prior_participant} />
                                            <DetailRow label="Urgent" value={referral.is_urgent ? 'Yes' : 'No'} />
                                        </dl>
                                    </div>
                                    {referral.notes && (
                                        <div className="sm:col-span-2">
                                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
                                            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{referral.notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

// === Helper Components ===

function InfoItem({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className={`w-4 h-4 flex-shrink-0 ${highlight ? 'text-amber-500' : 'text-gray-400'}`} />
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-sm font-medium ${highlight ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status, remaining }: { status: ReportCompletionStatus; remaining: number | null }) {
    const config: Record<ReportCompletionStatus, { label: string; bg: string; text: string }> = {
        not_due: { label: 'Not Due', bg: 'bg-gray-100', text: 'text-gray-500' },
        pending: { label: remaining !== null ? `Due in ${remaining}d` : 'Pending', bg: 'bg-amber-50', text: 'text-amber-700' },
        overdue: { label: remaining !== null ? `${Math.abs(remaining)}d overdue` : 'Overdue', bg: 'bg-red-50', text: 'text-red-700' },
        completed: { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700' },
        on_hold: { label: 'On Hold', bg: 'bg-indigo-50', text: 'text-indigo-700' },
        not_applicable: { label: 'N/A', bg: 'bg-gray-50', text: 'text-gray-400' },
        needs_tx_start_date: { label: 'Need Tx Start', bg: 'bg-orange-50', text: 'text-orange-700' },
    };
    const c = config[status] || config.not_due;
    return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
}

function DetailRow({ label, value }: { label: string; value: any }) {
    return (
        <div className="flex justify-between py-1">
            <dt className="text-sm text-gray-500">{label}</dt>
            <dd className="text-sm font-medium text-gray-900">{value || '—'}</dd>
        </div>
    );
}
