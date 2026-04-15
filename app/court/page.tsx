'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Search, X, Loader2, ArrowLeft, CheckCircle2, AlertTriangle,
    XCircle, Clock, Calendar, Building, Stethoscope, Shield,
    FileText, Activity, ChevronDown, ChevronUp, Sparkles,
    Send, User, Minimize2, Maximize2, TrendingUp, TrendingDown,
    Phone, MapPin
} from 'lucide-react';
import { REPORT_TYPE_LABELS } from '@/types';

const COMPLIANCE_CFG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    compliant: { label: 'Compliant', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2 },
    at_risk: { label: 'At Risk', bg: 'bg-amber-100', text: 'text-amber-800', icon: AlertTriangle },
    non_compliant: { label: 'Non-Compliant', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    discharged: { label: 'Discharged', bg: 'bg-gray-200', text: 'text-gray-700', icon: Clock },
};

const STATUS_DOT: Record<string, string> = {
    completed: '#10B981', overdue: '#EF4444', pending: '#F59E0B', not_due: '#D1D5DB', on_hold: '#6366F1',
};

export default function CourtPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;

    const [search, setSearch] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [client, setClient] = useState<any>(null);
    const [detail, setDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [expandTimeline, setExpandTimeline] = useState(true);
    const [expandReports, setExpandReports] = useState(false);
    const [expandAssessments, setExpandAssessments] = useState(false);

    // Dori mini
    const [doriOpen, setDoriOpen] = useState(false);
    const [doriMessages, setDoriMessages] = useState<any[]>([]);
    const [doriInput, setDoriInput] = useState('');
    const [doriLoading, setDoriLoading] = useState(false);
    const doriEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (authStatus === 'unauthenticated') router.push('/auth/signin'); }, [authStatus, router]);

    const handleSearch = async (term: string) => {
        setSearch(term);
        if (term.trim().length < 2) { setResults([]); return; }
        setSearching(true);
        const d = await fetch(`/api/court?search=${encodeURIComponent(term)}`).then(r => r.json());
        setResults(d.clients || []);
        setSearching(false);
    };

    const selectClient = async (id: string) => {
        setSelectedId(id);
        setLoadingDetail(true);
        setResults([]);
        setSearch('');
        const d = await fetch(`/api/court?id=${id}`).then(r => r.json());
        setClient(d.client);
        setDetail(d);
        setLoadingDetail(false);
        setExpandTimeline(true);
        // Pre-populate Dori with client context
        setDoriMessages([]);
    };

    const clearClient = () => { setSelectedId(null); setClient(null); setDetail(null); };

    const sendDori = async () => {
        if (!doriInput.trim() || doriLoading) return;
        const userMsg = { role: 'user', content: doriInput.trim(), ts: new Date() };
        setDoriMessages(prev => [...prev, userMsg]);
        setDoriInput('');
        setDoriLoading(true);

        try {
            // If viewing a client, prefix the question with context
            const contextPrefix = client ? `Regarding participant ${client.first_name} ${client.last_name} (ID: ${client.ddor_id || 'N/A'}): ` : '';
            const res = await fetch('/api/dori', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...doriMessages, { role: 'user', content: contextPrefix + userMsg.content }].map(m => ({ role: m.role, content: m.content })),
                }),
            });
            const data = await res.json();
            setDoriMessages(prev => [...prev, { role: 'assistant', content: data.message, ts: new Date() }]);
        } catch {
            setDoriMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, an error occurred.', ts: new Date() }]);
        }
        setDoriLoading(false);
        setTimeout(() => doriEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const age = client?.date_of_birth ? Math.floor((Date.now() - new Date(client.date_of_birth).getTime()) / (365.25 * 86400000)) : null;
    const daysInProgram = client?.treatment_start_date ? Math.floor((Date.now() - new Date(client.treatment_start_date).getTime()) / 86400000) : null;
    const comp = detail?.compliance || { score: 'compliant', issues: [] };
    const compCfg = COMPLIANCE_CFG[comp.score] || COMPLIANCE_CFG.compliant;
    const CompIcon = compCfg.icon;

    if (authStatus === 'loading') return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header — minimal, mobile-first */}
            <header className="bg-ddor-navy text-white sticky top-0 z-50">
                <div className="flex items-center justify-between px-4 h-12">
                    <div className="flex items-center gap-2">
                        {selectedId && <button onClick={clearClient} className="p-1 hover:bg-white/10 rounded"><ArrowLeft className="w-5 h-5" /></button>}
                        <div className="w-6 h-6 rounded bg-ddor-teal flex items-center justify-center text-xs font-bold">D</div>
                        <span className="font-bold text-sm">DDOR Court</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setDoriOpen(!doriOpen)}
                            className={`p-2 rounded-lg transition-colors ${doriOpen ? 'bg-ddor-teal/30' : 'hover:bg-white/10'}`}>
                            <Sparkles className="w-5 h-5 text-ddor-teal" />
                        </button>
                        <div className="w-7 h-7 rounded-full bg-ddor-teal/30 flex items-center justify-center text-xs font-bold">
                            {session?.user?.name?.[0] || '?'}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4">
                {/* Search */}
                {!selectedId && (
                    <>
                        <div className="mb-4">
                            <h1 className="text-xl font-bold text-ddor-navy">Participant Lookup</h1>
                            <p className="text-xs text-gray-500">Search by name or DDOR ID</p>
                        </div>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input value={search} onChange={e => handleSearch(e.target.value)}
                                placeholder="Type a name or ID..." autoFocus
                                className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-ddor-blue focus:ring-2 focus:ring-ddor-blue/20" />
                            {search && <button onClick={() => { setSearch(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-5 h-5 text-gray-400" /></button>}
                            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-ddor-blue" />}
                        </div>

                        {/* Results */}
                        {results.length > 0 && (
                            <div className="space-y-2">
                                {results.map(c => {
                                    const hasOverdue = [c.fourteen_day_status, c.forty_two_day_status, c.ninety_day_status, c.one_eighty_day_status].includes('overdue');
                                    return (
                                        <button key={c.id} onClick={() => selectClient(c.id)}
                                            className="w-full bg-white rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-shadow border">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{c.first_name} {c.last_name}</p>
                                                    <p className="text-xs text-gray-500">{c.ddor_id ? `ID: ${c.ddor_id} • ` : ''}{c.facility_name || 'No facility'} • {c.provider_name || ''}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {hasOverdue && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Overdue</span>}
                                                    {c.is_archived && <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">Archived</span>}
                                                    {!hasOverdue && !c.is_archived && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {search.length >= 2 && results.length === 0 && !searching && (
                            <p className="text-center text-gray-400 py-8 text-sm">No participants found matching "{search}"</p>
                        )}

                        {!search && (
                            <div className="text-center py-16">
                                <Shield className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-400 text-sm">Search for a participant to view their compliance status</p>
                            </div>
                        )}
                    </>
                )}

                {/* Client Detail */}
                {selectedId && loadingDetail && (
                    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>
                )}

                {selectedId && client && detail && (
                    <div className="space-y-4">
                        {/* Compliance Banner */}
                        <div className={`rounded-xl p-4 ${compCfg.bg}`}>
                            <div className="flex items-center gap-3">
                                <CompIcon className={`w-8 h-8 ${compCfg.text}`} />
                                <div>
                                    <p className={`text-lg font-bold ${compCfg.text}`}>{compCfg.label}</p>
                                    {comp.issues.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                            {comp.issues.map((issue: string, i: number) => (
                                                <p key={i} className={`text-xs ${compCfg.text}`}>{issue}</p>
                                            ))}
                                        </div>
                                    )}
                                    {comp.issues.length === 0 && <p className={`text-xs ${compCfg.text}`}>All reports current, participant in good standing</p>}
                                </div>
                            </div>
                        </div>

                        {/* Client Card */}
                        <div className="bg-white rounded-xl shadow-sm p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h2 className="text-xl font-bold text-ddor-navy">{client.first_name} {client.last_name}</h2>
                                    <p className="text-sm text-gray-500">{client.ddor_id ? `DDOR ID: ${client.ddor_id}` : 'No DDOR ID'}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${client.is_archived ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                                    {client.is_archived ? 'Archived' : 'Active'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <InfoCell icon={Calendar} label="DOB" value={client.date_of_birth ? `${new Date(client.date_of_birth).toLocaleDateString()}${age ? ` (${age}y)` : ''}` : '—'} />
                                <InfoCell icon={Stethoscope} label="Diagnosis" value={client.diagnosis ? client.diagnosis.replace('_', '-').toUpperCase() : '—'} />
                                <InfoCell icon={Calendar} label="Tx Start" value={client.treatment_start_date ? new Date(client.treatment_start_date).toLocaleDateString() : '—'} />
                                <InfoCell icon={Clock} label="Days in Program" value={daysInProgram !== null ? `${daysInProgram} days` : '—'} />
                                <InfoCell icon={Shield} label="Agreement" value={client.agreement_signed_date ? new Date(client.agreement_signed_date).toLocaleDateString() : '—'} />
                                <InfoCell icon={FileText} label="Insurance" value={client.insurance_status || '—'} />
                            </div>
                        </div>

                        {/* Treatment Provider */}
                        <div className="bg-white rounded-xl shadow-sm p-4">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Treatment Provider</h3>
                            <p className="font-medium text-gray-900">{client.facility_name || '—'}</p>
                            <p className="text-sm text-gray-500">{client.provider_name || ''}</p>
                            {client.facility_phone && <p className="text-sm text-ddor-blue mt-1 flex items-center gap-1"><Phone className="w-3 h-3" />{client.facility_phone}</p>}
                            {client.facility_address && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{client.facility_address}{client.facility_city ? `, ${client.facility_city}` : ''}</p>}
                        </div>

                        {/* Report Timeline */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <button onClick={() => setExpandTimeline(!expandTimeline)}
                                className="w-full flex items-center justify-between p-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Report Timeline</h3>
                                {expandTimeline ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </button>
                            {expandTimeline && detail.tracking && (
                                <div className="px-4 pb-4 space-y-2">
                                    {[
                                        { label: '14-Day', status: detail.tracking.fourteen_day_status, due: detail.tracking.fourteen_day_due, remain: detail.tracking.fourteen_day_remaining },
                                        { label: '42-Day', status: detail.tracking.forty_two_day_status, due: detail.tracking.forty_two_day_due, remain: detail.tracking.forty_two_day_remaining },
                                        { label: '90-Day', status: detail.tracking.ninety_day_status, due: detail.tracking.ninety_day_due, remain: detail.tracking.ninety_day_remaining },
                                        { label: '180-Day', status: detail.tracking.one_eighty_day_status, due: detail.tracking.one_eighty_day_due, remain: detail.tracking.one_eighty_day_remaining },
                                        { label: '270-Day', status: detail.tracking.two_seventy_day_status, due: detail.tracking.two_seventy_day_due, remain: detail.tracking.two_seventy_day_remaining },
                                        { label: '360-Day', status: detail.tracking.three_sixty_day_status, due: detail.tracking.three_sixty_day_due, remain: detail.tracking.three_sixty_day_remaining },
                                        { label: 'Final', status: detail.tracking.final_report_status, due: null, remain: null },
                                    ].map(m => (
                                        <div key={m.label} className="flex items-center gap-3 py-1.5">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_DOT[m.status] || '#D1D5DB' }} />
                                            <span className="text-sm font-medium w-16">{m.label}</span>
                                            <span className="text-xs text-gray-500 flex-1">{m.due ? new Date(m.due).toLocaleDateString() : '—'}</span>
                                            <StatusPill status={m.status} remaining={m.remain} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {expandTimeline && !detail.tracking && (
                                <p className="px-4 pb-4 text-sm text-gray-400">No treatment start date — timeline not available.</p>
                            )}
                        </div>

                        {/* Submitted Reports */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <button onClick={() => setExpandReports(!expandReports)}
                                className="w-full flex items-center justify-between p-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Submitted Reports ({detail.reports?.length || 0})</h3>
                                {expandReports ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </button>
                            {expandReports && (
                                <div className="px-4 pb-4">
                                    {(detail.reports || []).length === 0 ? (
                                        <p className="text-sm text-gray-400">No reports submitted.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {detail.reports.map((r: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-ddor-blue" />
                                                        <span className="text-sm font-medium">{REPORT_TYPE_LABELS[r.report_type as keyof typeof REPORT_TYPE_LABELS] || r.report_type}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">{r.date_submitted ? new Date(r.date_submitted).toLocaleDateString() : 'Draft'}</span>
                                                        {r.is_signed && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Assessments */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <button onClick={() => setExpandAssessments(!expandAssessments)}
                                className="w-full flex items-center justify-between p-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Assessment Scores ({detail.assessments?.length || 0})</h3>
                                {expandAssessments ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </button>
                            {expandAssessments && (
                                <div className="px-4 pb-4">
                                    {(detail.assessments || []).length === 0 ? (
                                        <p className="text-sm text-gray-400">No assessments recorded.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {detail.assessments.map((a: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="w-4 h-4 text-ddor-teal" />
                                                        <span className="text-sm font-medium">{a.questionnaire_type}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-ddor-blue">{a.total_score}</span>
                                                        <span className="text-xs text-gray-400">{new Date(a.submitted_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Referral */}
                        {detail.referral && (
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Referral Info</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><p className="text-xs text-gray-400">Referral #</p><p className="font-medium">{detail.referral.referral_number || '—'}</p></div>
                                    <div><p className="text-xs text-gray-400">Received</p><p className="font-medium">{detail.referral.date_received ? new Date(detail.referral.date_received).toLocaleDateString() : '—'}</p></div>
                                    <div><p className="text-xs text-gray-400">Eligibility</p><p className="font-medium">{detail.referral.eligibility?.replace(/_/g, ' ') || '—'}</p></div>
                                    <div><p className="text-xs text-gray-400">LOC</p><p className="font-medium">{detail.referral.loc_recommendation || '—'}</p></div>
                                </div>
                            </div>
                        )}

                        <div className="h-4" />
                    </div>
                )}
            </main>

            {/* Dori Panel — slides up from bottom */}
            {doriOpen && (
                <div className="fixed inset-x-0 bottom-0 bg-white border-t shadow-2xl z-50 flex flex-col" style={{ height: '50vh', maxHeight: 400 }}>
                    <div className="flex items-center justify-between px-4 py-2 bg-ddor-navy text-white">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-ddor-teal" />
                            <span className="font-medium text-sm">Dori</span>
                            {client && <span className="text-xs text-blue-200">• {client.first_name} {client.last_name}</span>}
                        </div>
                        <button onClick={() => setDoriOpen(false)} className="p-1 hover:bg-white/20 rounded"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                        {doriMessages.length === 0 && (
                            <div className="text-center py-6">
                                <p className="text-sm text-gray-500 mb-3">{client ? `Ask about ${client.first_name}'s status` : 'Ask me anything'}</p>
                                <div className="space-y-1.5">
                                    {(client ? [
                                        `Is ${client.first_name} compliant?`,
                                        `What reports has ${client.first_name} submitted?`,
                                        `When did ${client.first_name} start treatment?`,
                                    ] : [
                                        'Who has overdue reports?',
                                        'How many active participants?',
                                    ]).map((q, i) => (
                                        <button key={i} onClick={() => { setDoriInput(q); setTimeout(() => sendDori(), 100); }}
                                            className="w-full text-left text-xs p-2.5 bg-white rounded-lg border hover:border-ddor-blue transition-colors">{q}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {doriMessages.map((msg, i) => (
                            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'assistant' && <div className="w-6 h-6 rounded-full bg-ddor-navy flex items-center justify-center flex-shrink-0"><Sparkles className="w-3 h-3 text-ddor-teal" /></div>}
                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user' ? 'bg-ddor-blue text-white' : 'bg-white border shadow-sm text-gray-800'}`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {doriLoading && (
                            <div className="flex gap-2">
                                <div className="w-6 h-6 rounded-full bg-ddor-navy flex items-center justify-center flex-shrink-0"><Sparkles className="w-3 h-3 text-ddor-teal" /></div>
                                <div className="bg-white border shadow-sm px-3 py-2 rounded-xl"><Loader2 className="w-4 h-4 animate-spin text-ddor-blue" /></div>
                            </div>
                        )}
                        <div ref={doriEndRef} />
                    </div>

                    <form onSubmit={e => { e.preventDefault(); sendDori(); }} className="p-3 border-t bg-white flex gap-2">
                        <input value={doriInput} onChange={e => setDoriInput(e.target.value)}
                            placeholder={client ? `Ask about ${client.first_name}...` : 'Ask Dori...'}
                            className="flex-1 px-3 py-2 border rounded-lg text-sm" disabled={doriLoading} />
                        <button type="submit" disabled={!doriInput.trim() || doriLoading}
                            className="px-3 py-2 bg-ddor-blue text-white rounded-lg disabled:opacity-40">
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

function InfoCell({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2">
            <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-900">{value}</p>
            </div>
        </div>
    );
}

function StatusPill({ status, remaining }: { status: string; remaining: number | null }) {
    const r = parseInt(String(remaining)) || 0;
    const config: Record<string, { label: string; bg: string; text: string }> = {
        not_due: { label: 'Not Due', bg: 'bg-gray-100', text: 'text-gray-500' },
        pending: { label: r > 0 ? `Due in ${r}d` : 'Pending', bg: 'bg-amber-50', text: 'text-amber-700' },
        overdue: { label: `${Math.abs(r)}d overdue`, bg: 'bg-red-50', text: 'text-red-700' },
        completed: { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700' },
        on_hold: { label: 'On Hold', bg: 'bg-indigo-50', text: 'text-indigo-700' },
        not_applicable: { label: 'N/A', bg: 'bg-gray-50', text: 'text-gray-400' },
    };
    const c = config[status] || config.not_due;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
}
