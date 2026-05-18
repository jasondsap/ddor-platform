'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
    ArrowLeft, User, Calendar, FileText, Activity,
    Plus, Loader2, ChevronRight, Clock, AlertTriangle,
    CheckCircle2, Archive, Edit, Shield, Stethoscope,
    ClipboardList, ChevronDown, ChevronUp,
    RefreshCw, GraduationCap, Bell, UserCheck,
    MapPin, Phone, Mail, Building, Home, MessageSquare, Send, Pin, Trash2, Tag,
    Paperclip
} from 'lucide-react';
import { REPORT_TYPE_LABELS, STATUS_COLORS } from '@/types';
import type { ReportCompletionStatus } from '@/types';
import { ConsentSection, ConsentInfoItem } from '@/components/ConsentSection';
import { NoteCard } from '@/components/NoteCard';
import { NoteForm, type NoteFormValues } from '@/components/NoteForm';
import type { MentionSuggestion } from '@/lib/mentions';
import { AttachmentList, type Attachment } from '@/components/AttachmentList';
import { AttachmentUploadForm } from '@/components/AttachmentUploadForm';

type Section = 'overview' | 'timeline' | 'reports' | 'assessments' | 'consent' | 'referral' | 'attachments' | 'notes';

const SIDEBAR_ITEMS: { key: Section; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'timeline', label: 'Report Timeline', icon: ClipboardList },
    { key: 'reports', label: 'Submitted Reports', icon: FileText },
    { key: 'assessments', label: 'Assessments', icon: Activity },
    { key: 'consent', label: 'Consent', icon: MessageSquare },
    { key: 'referral', label: 'Referral', icon: Shield },
    { key: 'attachments', label: 'Attachments', icon: Paperclip },
    { key: 'notes', label: 'Notes', icon: Pin },
];

function ClientDetailInner() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const clientId = params.id as string;
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    // Deep-link params: ?tab=notes&note={noteId}
    const initialTab = (searchParams.get('tab') as Section) || 'overview';
    const deepLinkNoteId = searchParams.get('note');

    const [client, setClient] = useState<any>(null);
    const [referral, setReferral] = useState<any>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [questionnaires, setQuestionnaires] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState<Section>(initialTab);
    const [clientNotes, setClientNotes] = useState<any[]>([]);
    const [showNewNote, setShowNewNote] = useState(false);
    const [noteSavedMsg, setNoteSavedMsg] = useState(false);

    // Highlight a deep-linked note for 2s. Cleared after.
    const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);

    // Demographic-update invitation send state (Communication tab affordance)
    const [demoInviteSending, setDemoInviteSending] = useState<'email' | 'sms' | null>(null);
    const [demoInviteMsg, setDemoInviteMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

    const sendDemographicInvite = async (channel: 'email' | 'sms') => {
        setDemoInviteSending(channel);
        setDemoInviteMsg(null);
        try {
            const res = await fetch(`/api/clients/${clientId}/demographic/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel }),
            });
            const data = await res.json();
            if (!res.ok || data.success === false) {
                setDemoInviteMsg({ kind: 'error', text: data.message || data.error || 'Send failed.' });
            } else {
                setDemoInviteMsg({ kind: 'success', text: data.message || 'Sent.' });
            }
        } catch (e) {
            setDemoInviteMsg({ kind: 'error', text: 'Network error. Please try again.' });
        } finally {
            setDemoInviteSending(null);
        }
    };

    // Assessment invitation send state (Communication tab)
    const [assessmentType, setAssessmentType] = useState<'barc_10' | 'phq9_gad7'>('barc_10');
    const [assessSending, setAssessSending] = useState<'email' | 'sms' | null>(null);
    const [assessMsg, setAssessMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

    const sendAssessmentInvite = async (channel: 'email' | 'sms') => {
        setAssessSending(channel);
        setAssessMsg(null);
        try {
            const res = await fetch(`/api/clients/${clientId}/assessment/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel, questionnaire_type: assessmentType }),
            });
            const data = await res.json();
            if (!res.ok || data.success === false) {
                setAssessMsg({ kind: 'error', text: data.message || data.error || 'Send failed.' });
            } else {
                setAssessMsg({ kind: 'success', text: data.message || 'Sent.' });
            }
        } catch {
            setAssessMsg({ kind: 'error', text: 'Network error. Please try again.' });
        } finally {
            setAssessSending(null);
        }
    };
    useEffect(() => {
        if (deepLinkNoteId && clientNotes.some(n => n.id === deepLinkNoteId)) {
            setHighlightedNoteId(deepLinkNoteId);
            const t = setTimeout(() => setHighlightedNoteId(null), 2000);
            return () => clearTimeout(t);
        }
    }, [deepLinkNoteId, clientNotes]);

    useEffect(() => { if (authStatus === 'unauthenticated') router.push('/auth/signin'); }, [authStatus, router]);

    const fetchNotes = useCallback(async () => {
        const d = await fetch(`/api/notes?client_id=${clientId}`).then(r => r.json());
        setClientNotes(d.notes || []);
    }, [clientId]);

    useEffect(() => {
        if (!clientId || !ddor?.userId) return;
        setLoading(true);
        fetch(`/api/clients/${clientId}`)
            .then(r => r.json())
            .then(data => { setClient(data.client); setReferral(data.referral); setReports(data.reports || []); setQuestionnaires(data.questionnaires || []); })
            .catch(console.error)
            .finally(() => setLoading(false));
        fetchNotes();
    }, [clientId, ddor?.userId, fetchNotes]);

    // Mention suggestions for note content: only users with access to THIS client.
    const getNoteMentionSuggestions = useCallback(async (query: string): Promise<MentionSuggestion[]> => {
        try {
            const res = await fetch(`/api/access/users-for-client?client_id=${clientId}`);
            const d = await res.json();
            const users: MentionSuggestion[] = (d.users || []).map((u: any) => ({
                name: `${u.first_name} ${u.last_name}`,
                id: u.id,
                type: 'user' as const,
                subtitle: u.role?.replace('_', ' ') || '',
            }));
            const q = query.toLowerCase();
            return users.filter(u => !q || u.name.toLowerCase().includes(q)).slice(0, 10);
        } catch {
            return [];
        }
    }, [clientId]);

    const handleSaveNote = async (values: NoteFormValues) => {
        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, client_id: clientId }),
        });
        if (res.ok) {
            setShowNewNote(false);
            setNoteSavedMsg(true);
            setTimeout(() => setNoteSavedMsg(false), 2500);
            await fetchNotes();
        }
    };

    const handleArchiveNote = async (id: string) => {
        if (!confirm('Archive this note?')) return;
        await fetch(`/api/notes/${id}`, { method: 'DELETE' });
        setClientNotes(prev => prev.filter(n => n.id !== id));
    };

    const handlePinNote = async (id: string, current: boolean) => {
        await fetch(`/api/notes/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_pinned: !current }),
        });
        setClientNotes(prev => prev.map(n => n.id === id ? { ...n, is_pinned: !current } : n));
    };

    // Attachments tab state
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);
    const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
    const [attachmentUploadedMsg, setAttachmentUploadedMsg] = useState(false);

    const fetchAttachments = useCallback(async () => {
        setAttachmentsLoading(true);
        try {
            const r = await fetch(`/api/clients/${clientId}/attachments`);
            const d = await r.json();
            setAttachments(d.attachments || []);
        } finally {
            setAttachmentsLoading(false);
        }
    }, [clientId]);

    // Lazy-load attachments the first time the user opens the tab.
    useEffect(() => {
        if (active === 'attachments' && attachments.length === 0 && !attachmentsLoading) {
            fetchAttachments();
        }
    }, [active, attachments.length, attachmentsLoading, fetchAttachments]);

    const handleArchiveAttachment = async (id: string) => {
        const res = await fetch(`/api/clients/${clientId}/attachments/${id}`, { method: 'DELETE' });
        if (res.ok) {
            setAttachments(prev => prev.filter(a => a.id !== id));
        }
    };

    const handleAttachmentUploaded = async () => {
        setShowAttachmentUpload(false);
        setAttachmentUploadedMsg(true);
        setTimeout(() => setAttachmentUploadedMsg(false), 2500);
        await fetchAttachments();
    };

    if (authStatus === 'loading' || loading) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;
    }

    if (!client) {
        return <div className="min-h-screen bg-gray-50"><Header /><div className="max-w-4xl mx-auto px-6 py-12 text-center"><p className="text-gray-500">Client not found or access denied.</p><button onClick={() => router.push('/clients')} className="mt-4 text-ddor-blue hover:underline">Back to Clients</button></div></div>;
    }

    const milestones = [
        { key: 'fourteen_day', label: '14-Day', days: 14, statusKey: 'fourteen_day_status', remainKey: 'fourteen_day_days_remaining' },
        { key: 'forty_two_day', label: '42-Day', days: 42, statusKey: 'forty_two_day_status', remainKey: 'forty_two_day_days_remaining' },
        { key: 'ninety_day', label: '90-Day', days: 90, statusKey: 'ninety_day_status', remainKey: 'ninety_day_days_remaining' },
        { key: 'one_eighty_day', label: '180-Day', days: 180, statusKey: 'one_eighty_day_status', remainKey: 'one_eighty_day_days_remaining' },
        { key: 'two_seventy_day', label: '270-Day', days: 270, statusKey: 'two_seventy_day_status', remainKey: 'two_seventy_day_days_remaining' },
        { key: 'three_sixty_day', label: '360-Day', days: 360, statusKey: 'three_sixty_day_status', remainKey: 'three_sixty_day_days_remaining' },
    ];

    const age = client.date_of_birth ? Math.floor((Date.now() - new Date(client.date_of_birth).getTime()) / (365.25 * 86400000)) : null;

    // Count overdue milestones for badge
    const overdueCount = milestones.filter(m => client[m.statusKey] === 'overdue').length + (client.kyae_referral_status === 'overdue' ? 1 : 0);

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Top Header */}
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => router.push('/clients')} className="p-2 hover:bg-gray-200 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-ddor-navy">{client.first_name} {client.last_name}</h1>
                        <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 flex-wrap">
                            {client.ddor_id && <span>ID: {client.ddor_id}</span>}
                            {client.facility_name && <span>• {client.facility_name}</span>}
                            {client.provider_name && <span>({client.provider_name})</span>}
                        </div>
                    </div>
                    {client.is_archived && (
                        <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm font-medium flex items-center gap-1"><Archive className="w-3.5 h-3.5" /> Archived</span>
                    )}
                    <button onClick={() => router.push(`/clients/${clientId}/edit`)}
                        className="flex items-center gap-2 px-4 py-2 bg-ddor-blue text-white rounded-lg text-sm font-medium hover:bg-[#156090]">
                        <Edit className="w-4 h-4" /> Edit
                    </button>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {[
                        { label: 'Submit Report', href: `/reports/new?client_id=${clientId}&type=fourteen_day`, icon: FileText, color: 'text-ddor-blue' },
                        { label: 'Initiation', href: `/initiation/new?client_id=${clientId}`, icon: Bell, color: 'text-green-600' },
                        { label: 'Status Change', href: `/status-change/new?client_id=${clientId}`, icon: RefreshCw, color: 'text-amber-600' },
                        { label: 'KYAE Referral', href: `/kyae-referral/new?client_id=${clientId}`, icon: GraduationCap, color: 'text-purple-600' },
                        { label: 'Demographic', href: `/demographic/new?client_id=${clientId}`, icon: UserCheck, color: 'text-teal-600' },
                        { label: 'BARC-10', href: `/assessments/barc10?client_id=${clientId}`, icon: Activity, color: 'text-emerald-600' },
                        { label: 'GAIN-SS', href: `/gain-ss/new?client_id=${clientId}`, icon: Shield, color: 'text-orange-600' },
                    ].map(a => (
                        <button key={a.label} onClick={() => router.push(a.href)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all">
                            <a.icon className={`w-3.5 h-3.5 ${a.color}`} /> {a.label}
                        </button>
                    ))}
                </div>

                {/* Info Bar */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <InfoItem icon={Calendar} label="DOB" value={client.date_of_birth ? `${new Date(client.date_of_birth).toLocaleDateString()}${age ? ` (${age}y)` : ''}` : '—'} />
                        <InfoItem icon={Stethoscope} label="Diagnosis" value={client.diagnosis ? client.diagnosis.replace('_', '-').toUpperCase() : '—'} />
                        <InfoItem icon={Calendar} label="Tx Start" value={client.treatment_start_date ? new Date(client.treatment_start_date).toLocaleDateString() : 'Not set'} highlight={!client.treatment_start_date} />
                        <InfoItem icon={Shield} label="Agreement" value={client.agreement_signed_date ? new Date(client.agreement_signed_date).toLocaleDateString() : '—'} />
                        <ConsentInfoItem
                            channel="email"
                            status={client.email_consent_status || 'not_requested'}
                            onClick={() => setActive('consent')}
                        />
                        <ConsentInfoItem
                            channel="sms"
                            status={client.sms_consent_status || 'not_requested'}
                            onClick={() => setActive('consent')}
                        />
                    </div>
                </div>

                {/* Sidebar + Content */}
                <div className="flex gap-6">
                    {/* Sidebar */}
                    <div className="w-56 flex-shrink-0 hidden md:block">
                        <nav className="bg-white rounded-xl shadow-sm p-2 sticky top-6">
                            {SIDEBAR_ITEMS.map(item => {
                                const isActive = active === item.key;
                                const badge = item.key === 'reports' ? reports.length : item.key === 'assessments' ? questionnaires.length : item.key === 'notes' ? clientNotes.length : item.key === 'timeline' && overdueCount > 0 ? overdueCount : 0;
                                return (
                                    <button key={item.key} onClick={() => setActive(item.key)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${isActive ? 'bg-ddor-blue text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                                        <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                        <span className="flex-1 text-left">{item.label}</span>
                                        {badge > 0 && (
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : item.key === 'timeline' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}`}>{badge}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Mobile tab bar */}
                    <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 shadow-sm w-full overflow-x-auto md:hidden">
                        {SIDEBAR_ITEMS.map(item => (
                            <button key={item.key} onClick={() => setActive(item.key)}
                                className={`flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap ${active === item.key ? 'bg-ddor-blue text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                                <item.icon className="w-3.5 h-3.5" /> {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Panel */}
                    <div className="flex-1 min-w-0">
                        {/* OVERVIEW */}
                        {active === 'overview' && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="font-semibold text-ddor-navy mb-5">Participant Details</h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                                    {/* Personal column */}
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal</h3>

                                        <div className="mb-4">
                                            <SubgroupHeader icon={User} label="Identity" />
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <Tile label="First Name" value={client.first_name} />
                                                <Tile label="Last Name" value={client.last_name} />
                                                <Tile label="Date of Birth" value={client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString() : null} />
                                                <Tile label="Gender" value={client.gender} />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <SubgroupHeader icon={Phone} label="Contact" />
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <Tile label="Phone" value={client.phone} wide />
                                                <Tile label="Email" value={client.email} wide />
                                                <Tile label="ZIP" value={client.zip} />
                                                <Tile label="Originating County" value={referral?.originating_county_name} />
                                            </div>
                                        </div>

                                        <div>
                                            <SubgroupHeader icon={Stethoscope} label="Clinical" />
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <Tile label="DDOR ID" value={client.ddor_id} />
                                                <Tile label="Diagnosis" value={client.diagnosis?.replace('_', '-').toUpperCase()} />
                                                <Tile label="OUD" value={client.has_oud ? 'Yes' : 'No'} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Program column */}
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Program</h3>

                                        <div className="mb-4">
                                            <SubgroupHeader icon={Building} label="Assignment" />
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <Tile label="Facility" value={client.facility_name} wide />
                                                <Tile label="Provider" value={client.provider_name} wide />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <SubgroupHeader icon={Calendar} label="Dates" />
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <Tile label="Agreement Signed" value={client.agreement_signed_date ? new Date(client.agreement_signed_date).toLocaleDateString() : null} />
                                                <Tile label="Treatment Start" value={client.treatment_start_date ? new Date(client.treatment_start_date).toLocaleDateString() : null} />
                                                <Tile label="Agreement End" value={client.agreement_end_date ? new Date(client.agreement_end_date).toLocaleDateString() : null} />
                                            </div>
                                        </div>

                                        <div>
                                            <SubgroupHeader icon={CheckCircle2} label="Status" />
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <Tile label="Insurance" value={client.insurance_status} />
                                                <Tile
                                                    label="Eligibility"
                                                    value={client.eligibility_status}
                                                    valueClassName={client.eligibility_status?.toLowerCase() === 'pending' ? 'text-amber-600' : undefined}
                                                />
                                                <Tile
                                                    label="Status"
                                                    value={client.is_archived ? 'Archived' : 'Active'}
                                                    valueClassName={client.is_archived ? 'text-gray-500' : 'text-green-600'}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {client.notes && (
                                    <div className="mt-6 pt-6 border-t">
                                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h3>
                                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{client.notes}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* REPORT TIMELINE */}
                        {active === 'timeline' && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="font-semibold text-ddor-navy mb-4 flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5" /> Report Timeline
                                </h2>
                                {!client.treatment_start_date ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                                        <AlertTriangle className="w-4 h-4 inline mr-2" />
                                        Treatment start date is required to calculate report due dates.
                                        <button onClick={() => router.push(`/clients/${clientId}/edit`)} className="ml-2 underline">Set it now</button>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {milestones.map(m => {
                                            const status = client[m.statusKey] as ReportCompletionStatus;
                                            const remaining = client[m.remainKey] as number;
                                            const dueDate = new Date(new Date(client.treatment_start_date).getTime() + m.days * 86400000);
                                            return (
                                                <div key={m.key} className="flex items-center gap-4 py-2.5 px-3 rounded-lg hover:bg-gray-50">
                                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[status] || '#D1D5DB' }} />
                                                    <div className="w-20 flex-shrink-0"><span className="text-sm font-medium text-gray-900">{m.label}</span></div>
                                                    <div className="w-28 flex-shrink-0"><span className="text-sm text-gray-500">{dueDate.toLocaleDateString()}</span></div>
                                                    <div className="flex-1"><StatusBadge status={status} remaining={remaining} /></div>
                                                    {(status === 'pending' || status === 'overdue') && (
                                                        <button onClick={() => router.push(`/reports/new?client_id=${clientId}&type=${m.key}`)}
                                                            className="text-xs px-3 py-1 bg-ddor-blue text-white rounded-lg hover:bg-[#156090]">Submit</button>
                                                    )}
                                                    {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                </div>
                                            );
                                        })}

                                        {/* KYAE */}
                                        <div className="flex items-center gap-4 py-2.5 px-3 rounded-lg hover:bg-gray-50">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[client.kyae_referral_status as ReportCompletionStatus] || '#D1D5DB' }} />
                                            <div className="w-20 flex-shrink-0"><span className="text-sm font-medium text-gray-900">KYAE</span></div>
                                            <div className="w-28 flex-shrink-0"><span className="text-sm text-gray-500">w/ 14-Day</span></div>
                                            <div className="flex-1"><StatusBadge status={client.kyae_referral_status} remaining={client.fourteen_day_days_remaining} /></div>
                                        </div>

                                        {/* BARC-10 */}
                                        <div className="flex items-center gap-4 py-2.5 px-3 rounded-lg hover:bg-gray-50">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[client.barc10_status as ReportCompletionStatus] || '#D1D5DB' }} />
                                            <div className="w-20 flex-shrink-0"><span className="text-sm font-medium text-gray-900">BARC-10</span></div>
                                            <div className="w-28 flex-shrink-0"><span className="text-sm text-gray-500">w/ 42-Day</span></div>
                                            <div className="flex-1"><StatusBadge status={client.barc10_status} remaining={client.forty_two_day_days_remaining} /></div>
                                            {(client.barc10_status === 'pending' || client.barc10_status === 'overdue') && (
                                                <button onClick={() => router.push(`/assessments/barc10?client_id=${clientId}`)}
                                                    className="text-xs px-3 py-1 bg-ddor-teal text-white rounded-lg hover:bg-[#239aa8]">Administer</button>
                                            )}
                                        </div>

                                        {/* PHQ/GAD */}
                                        <div className="flex items-center gap-4 py-2.5 px-3 rounded-lg hover:bg-gray-50">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[client.phq9_gad7_status as ReportCompletionStatus] || '#D1D5DB' }} />
                                            <div className="w-20 flex-shrink-0"><span className="text-sm font-medium text-gray-900">PHQ/GAD</span></div>
                                            <div className="w-28 flex-shrink-0"><span className="text-sm text-gray-500">w/ 42-Day</span></div>
                                            <div className="flex-1"><StatusBadge status={client.phq9_gad7_status} remaining={client.forty_two_day_days_remaining} /></div>
                                        </div>

                                        {/* Final */}
                                        <div className="flex items-center gap-4 py-2.5 px-3 rounded-lg hover:bg-gray-50">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[client.final_report_status as ReportCompletionStatus] || '#D1D5DB' }} />
                                            <div className="w-20 flex-shrink-0"><span className="text-sm font-medium text-gray-900">Final</span></div>
                                            <div className="w-28 flex-shrink-0"><span className="text-sm text-gray-500">30d post-DC</span></div>
                                            <div className="flex-1"><StatusBadge status={client.final_report_status} remaining={null} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SUBMITTED REPORTS */}
                        {active === 'reports' && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-ddor-navy">Submitted Reports</h2>
                                    <button onClick={() => router.push(`/reports/new?client_id=${clientId}`)}
                                        className="flex items-center gap-1 text-sm text-ddor-blue hover:underline">
                                        <Plus className="w-4 h-4" /> Submit Report
                                    </button>
                                </div>
                                {reports.length === 0 ? (
                                    <p className="text-gray-500 text-sm py-12 text-center">No reports submitted yet.</p>
                                ) : (
                                    <div className="divide-y">
                                        {reports.map((report: any) => (
                                            <div key={report.id} onClick={() => router.push(`/reports/${report.id}`)}
                                                className="flex items-center justify-between py-3 hover:bg-gray-50 cursor-pointer px-2 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-5 h-5 text-ddor-blue" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{REPORT_TYPE_LABELS[report.report_type as keyof typeof REPORT_TYPE_LABELS] || report.report_type}</p>
                                                        <p className="text-xs text-gray-500">{report.date_submitted ? new Date(report.date_submitted).toLocaleDateString() : 'Draft'}</p>
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

                        {/* ASSESSMENTS */}
                        {active === 'assessments' && (
                            <div className="space-y-4">
                                <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold text-ddor-navy text-sm mb-1">Send Assessment Link</h3>
                                            <p className="text-xs text-gray-500 mb-3">
                                                Sends a tokenized link so the participant can complete an assessment on
                                                their own. Link expires in 7 days.
                                            </p>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Assessment</label>
                                            <select
                                                value={assessmentType}
                                                onChange={e => setAssessmentType(e.target.value as 'barc_10' | 'phq9_gad7')}
                                                className="w-full max-w-xs p-2 border border-gray-300 rounded-lg text-sm bg-white"
                                            >
                                                <option value="barc_10">BARC-10 (Recovery Capital)</option>
                                                <option value="phq9_gad7">PHQ-9 + GAD-7 (Depression / Anxiety)</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                type="button"
                                                disabled={!client.email || assessSending !== null}
                                                onClick={() => sendAssessmentInvite('email')}
                                                className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40 flex items-center gap-1"
                                                title={!client.email ? 'No email address on file' : ''}
                                            >
                                                <Mail className="w-3.5 h-3.5" />
                                                {assessSending === 'email' ? 'Sending…' : 'Send by Email'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!client.phone || assessSending !== null}
                                                onClick={() => sendAssessmentInvite('sms')}
                                                className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40 flex items-center gap-1"
                                                title={!client.phone ? 'No phone number on file' : ''}
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                                {assessSending === 'sms' ? 'Sending…' : 'Send by Text'}
                                            </button>
                                        </div>
                                    </div>
                                    {assessMsg && (
                                        <div className={`mt-3 p-2.5 rounded-lg text-xs ${
                                            assessMsg.kind === 'success'
                                                ? 'bg-green-50 border border-green-200 text-green-700'
                                                : 'bg-red-50 border border-red-200 text-red-700'
                                        }`}>
                                            {assessMsg.text}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="font-semibold text-ddor-navy">Questionnaire Submissions</h2>
                                        <button onClick={() => router.push(`/assessments/barc10?client_id=${clientId}`)}
                                            className="flex items-center gap-1 text-sm text-ddor-blue hover:underline">
                                            <Plus className="w-4 h-4" /> New Assessment
                                        </button>
                                    </div>
                                    {questionnaires.length === 0 ? (
                                        <p className="text-gray-500 text-sm py-12 text-center">No assessments recorded yet.</p>
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
                                                        {q.total_score !== null && <span className="text-sm font-medium text-ddor-blue">{q.total_score}</span>}
                                                        {q.is_complete ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* CONSENT */}
                        {active === 'consent' && (
                            <div className="space-y-4">
                            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-ddor-blue">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <h3 className="font-semibold text-ddor-navy text-sm mb-1">Send Demographic Update Link</h3>
                                        <p className="text-xs text-gray-500">
                                            Sends a tokenized link to the participant so they can review and update
                                            their own information. Link expires in 30 days.
                                        </p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            type="button"
                                            disabled={!client.email || demoInviteSending !== null}
                                            onClick={() => sendDemographicInvite('email')}
                                            className="px-3 py-2 bg-ddor-blue text-white rounded-lg text-xs font-medium hover:bg-[#156090] disabled:opacity-40 flex items-center gap-1"
                                            title={!client.email ? 'No email address on file' : ''}
                                        >
                                            <Mail className="w-3.5 h-3.5" />
                                            {demoInviteSending === 'email' ? 'Sending…' : 'Send by Email'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!client.phone || demoInviteSending !== null}
                                            onClick={() => sendDemographicInvite('sms')}
                                            className="px-3 py-2 bg-ddor-blue text-white rounded-lg text-xs font-medium hover:bg-[#156090] disabled:opacity-40 flex items-center gap-1"
                                            title={!client.phone ? 'No phone number on file' : ''}
                                        >
                                            <Phone className="w-3.5 h-3.5" />
                                            {demoInviteSending === 'sms' ? 'Sending…' : 'Send by Text'}
                                        </button>
                                    </div>
                                </div>
                                {demoInviteMsg && (
                                    <div className={`mt-3 p-2.5 rounded-lg text-xs ${
                                        demoInviteMsg.kind === 'success'
                                            ? 'bg-green-50 border border-green-200 text-green-700'
                                            : 'bg-red-50 border border-red-200 text-red-700'
                                    }`}>
                                        {demoInviteMsg.text}
                                    </div>
                                )}
                            </div>
                            <ConsentSection
                                clientId={clientId}
                                hasEmail={!!client.email}
                                hasPhone={!!client.phone}
                                email={client.email ?? null}
                                phoneNumber={client.phone ?? null}
                                emailConsentStatus={client.email_consent_status || 'not_requested'}
                                smsConsentStatus={client.sms_consent_status || 'not_requested'}
                                emailGrantedAt={client.email_consent_granted_at ?? null}
                                smsGrantedAt={client.sms_consent_granted_at ?? null}
                                emailRevokedAt={client.email_consent_revoked_at ?? null}
                                smsRevokedAt={client.sms_consent_revoked_at ?? null}
                                onChanged={() => {
                                    // Re-fetch the client so the info bar chips reflect the new state
                                    fetch(`/api/clients/${clientId}`)
                                        .then(r => r.json())
                                        .then(data => {
                                            setClient(data.client);
                                            if (data.referral) setReferral(data.referral);
                                        });
                                }}
                            />
                            </div>
                        )}

                        {/* REFERRAL */}
                        {active === 'referral' && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="font-semibold text-ddor-navy mb-5">Linked Referral</h2>
                                {!referral ? (
                                    <p className="text-gray-500 text-sm py-12 text-center">No referral linked to this client.</p>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                                            {/* Referral Info column */}
                                            <div>
                                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Referral Info</h3>

                                                <div className="mb-4">
                                                    <SubgroupHeader icon={ClipboardList} label="Submission" />
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        <Tile label="Referral #" value={referral.referral_number} />
                                                        <Tile label="Date Received" value={referral.date_received ? new Date(referral.date_received).toLocaleDateString() : null} />
                                                        <Tile label="Screen Date" value={referral.screen_date ? new Date(referral.screen_date).toLocaleDateString() : null} />
                                                    </div>
                                                </div>

                                                <div>
                                                    <SubgroupHeader icon={UserCheck} label="Routing" />
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        <Tile label="Eligibility" value={referral.eligibility?.replace(/_/g, ' ')} />
                                                        <Tile label="Status" value={referral.referral_type_status?.replace(/_/g, ' ')} wide />
                                                        <Tile label="Case Navigator" value={referral.navigator_name} wide />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Assessment column */}
                                            <div>
                                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Assessment</h3>

                                                <div className="mb-4">
                                                    <SubgroupHeader icon={Stethoscope} label="Clinical" />
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        <Tile label="LOC Recommendation" value={referral.loc_recommendation} />
                                                        <Tile label="Housing" value={referral.initial_housing?.replace(/_/g, ' ')} />
                                                    </div>
                                                </div>

                                                <div className="mb-4">
                                                    <SubgroupHeader icon={Activity} label="Conditions" />
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        <Tile label="SMI" value={referral.smi_symptoms ? 'Yes' : 'No'} />
                                                        <Tile label="TBI/ABI" value={referral.tbi_abi ? 'Yes' : 'No'} />
                                                    </div>
                                                </div>

                                                <div>
                                                    <SubgroupHeader icon={Tag} label="Case Flags" />
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        <Tile label="Prior Participant" value={referral.prior_participant} />
                                                        <Tile
                                                            label="Urgent"
                                                            value={referral.is_urgent ? 'Yes' : 'No'}
                                                            valueClassName={referral.is_urgent ? 'text-red-600' : undefined}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer: notes + view full link */}
                                        <div className="mt-6 pt-6 border-t">
                                            {referral.notes && (
                                                <div className="mb-4">
                                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h3>
                                                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{referral.notes}</p>
                                                </div>
                                            )}
                                            <div className="flex justify-end">
                                                <button onClick={() => router.push(`/referrals/${referral.id}`)}
                                                    className="text-sm text-ddor-blue hover:underline flex items-center gap-1">
                                                    View Full Referral <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ATTACHMENTS */}
                        {active === 'attachments' && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-ddor-navy">Attachments</h2>
                                    <button
                                        onClick={() => setShowAttachmentUpload(s => !s)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-ddor-blue text-white rounded-lg text-xs font-medium hover:bg-[#156090]"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Upload
                                    </button>
                                </div>

                                {attachmentUploadedMsg && (
                                    <div className="mb-4 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        <p className="text-xs text-green-700">Uploaded</p>
                                    </div>
                                )}

                                {showAttachmentUpload && (
                                    <AttachmentUploadForm
                                        clientId={clientId}
                                        onUploaded={handleAttachmentUploaded}
                                        onCancel={() => setShowAttachmentUpload(false)}
                                    />
                                )}

                                {attachmentsLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="w-6 h-6 animate-spin text-ddor-blue" />
                                    </div>
                                ) : (
                                    <AttachmentList
                                        clientId={clientId}
                                        attachments={attachments}
                                        onArchive={handleArchiveAttachment}
                                    />
                                )}
                            </div>
                        )}

                        {/* NOTES */}
                        {active === 'notes' && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-ddor-navy">Client Notes</h2>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => router.push(`/notes?client_id=${clientId}`)}
                                            className="text-xs text-ddor-blue hover:underline">View All Notes</button>
                                        <button onClick={() => setShowNewNote(s => !s)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-ddor-blue text-white rounded-lg text-xs font-medium hover:bg-[#156090]">
                                            <Plus className="w-3.5 h-3.5" /> New Note
                                        </button>
                                    </div>
                                </div>

                                {noteSavedMsg && (
                                    <div className="mb-4 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        <p className="text-xs text-green-700">Note saved</p>
                                    </div>
                                )}

                                {showNewNote && (
                                    <NoteForm
                                        initialClientId={clientId}
                                        hideParticipantField
                                        getMentionSuggestions={getNoteMentionSuggestions}
                                        onSave={handleSaveNote}
                                        onCancel={() => setShowNewNote(false)}
                                    />
                                )}

                                {clientNotes.length === 0 ? (
                                    <div className="text-center py-10">
                                        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-400 text-sm">No notes yet for this client.</p>
                                        <p className="text-gray-400 text-xs mt-1">Click "New Note" above to add the first one.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {clientNotes.map(note => (
                                            <NoteCard
                                                key={note.id}
                                                note={note}
                                                onPin={handlePinNote}
                                                onArchive={handleArchiveNote}
                                                hideClientLink
                                                highlighted={highlightedNoteId === note.id}
                                                scrollIntoViewOnMount={highlightedNoteId === note.id}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function ClientDetailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
            <ClientDetailInner />
        </Suspense>
    );
}

// === Helpers ===

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
        <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
            <dt className="text-sm text-gray-500">{label}</dt>
            <dd className="text-sm font-medium text-gray-900">{value || '—'}</dd>
        </div>
    );
}

function SubgroupHeader({ icon: Icon, label }: { icon: any; label: string }) {
    return (
        <div className="flex items-center gap-1.5 mb-2">
            <Icon className="w-3.5 h-3.5 text-gray-400" />
            <h4 className="text-[11px] font-medium uppercase tracking-wider text-gray-500">{label}</h4>
        </div>
    );
}

function Tile({
    label,
    value,
    wide,
    valueClassName,
}: {
    label: string;
    value: any;
    wide?: boolean;
    valueClassName?: string;
}) {
    const isEmpty = value === null || value === undefined || value === '';
    return (
        <div
            className={`rounded-lg px-3 py-2 ${wide ? 'col-span-2' : ''} ${
                isEmpty ? 'border border-dashed border-gray-200' : 'bg-gray-100'
            }`}
        >
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">
                {label}
            </p>
            <p
                className={`text-sm ${
                    isEmpty
                        ? 'text-gray-300 font-normal'
                        : `font-medium ${valueClassName || 'text-gray-900'}`
                }`}
            >
                {isEmpty ? '—' : value}
            </p>
        </div>
    );
}
