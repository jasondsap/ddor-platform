'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import {
    FileSpreadsheet, Download, ChevronLeft, ChevronRight, Loader2,
    Users, ClipboardCheck, Heart, Pill, Stethoscope,
    GraduationCap, Briefcase, CheckCircle2, FileText, AlertTriangle,
} from 'lucide-react';

type TabKey = 'treatment' | 'discharge' | 'lengthOfStay' | 'services' | 'completions' | 'finalReports';

interface QuarterlyData {
    quarter: string;
    period: { start: string; end: string };
    totals: {
        clinical_assessments: number;
        receiving_services: number;
        compliant: number;
        bh_treatment: number;
        sud_treatment: number;
        mat_receiving: number;
        job_training: number;
        education_completed: number;
        successful_completions: number;
    };
    treatment: any[];
    discharge: any[];
    lengthOfStay: any[];
    dischargeMAT: any[];
    mhByProvider: any[];
    sudByProvider: any[];
    matByProvider: any[];
    trainingByProvider: any[];
    educationByProvider: any[];
    completionsByProvider: any[];
    finalReportsByProvider: any[];
}

export default function QuarterlyReportPage() {
    const now = new Date();
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
    const [quarter, setQuarter] = useState(currentQuarter > 1 ? currentQuarter - 1 : 4);
    const [year, setYear] = useState(currentQuarter > 1 ? now.getFullYear() : now.getFullYear() - 1);
    const [data, setData] = useState<QuarterlyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('treatment');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics/quarterly-report?quarter=${quarter}&year=${year}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error('Failed to fetch quarterly data:', err);
        } finally {
            setLoading(false);
        }
    }, [quarter, year]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const res = await fetch(`/api/analytics/quarterly-report?quarter=${quarter}&year=${year}&format=xlsx`);
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `DBH_Q${quarter}_${year}_Quarterly_Report.xlsx`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setDownloading(false);
        }
    };

    const prevQuarter = () => {
        if (quarter === 1) { setQuarter(4); setYear(y => y - 1); }
        else setQuarter(q => q - 1);
    };
    const nextQuarter = () => {
        if (quarter === 4) { setQuarter(1); setYear(y => y + 1); }
        else setQuarter(q => q + 1);
    };

    const tabs: { key: TabKey; label: string; icon: any }[] = [
        { key: 'treatment', label: 'Treatment', icon: ClipboardCheck },
        { key: 'discharge', label: 'Discharge', icon: AlertTriangle },
        { key: 'lengthOfStay', label: 'Length of Stay', icon: FileText },
        { key: 'services', label: 'MH / SUD / MAT', icon: Stethoscope },
        { key: 'completions', label: 'Completions', icon: CheckCircle2 },
        { key: 'finalReports', label: 'Final Reports', icon: FileSpreadsheet },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-5">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">DBH Quarterly Report</h1>
                        <p className="text-sm text-gray-500 mt-1">Behavioral Health Conditional Dismissal Program</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Quarter selector */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button onClick={prevQuarter} className="p-1.5 rounded hover:bg-white hover:shadow-sm transition">
                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="px-4 py-1.5 font-semibold text-gray-900 min-w-[100px] text-center">
                                Q{quarter} {year}
                            </span>
                            <button onClick={nextQuarter} className="p-1.5 rounded hover:bg-white hover:shadow-sm transition">
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                        {/* Download */}
                        <button
                            onClick={handleDownload}
                            disabled={downloading || loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#1F3864] text-white rounded-lg hover:bg-[#2a4a7f] disabled:opacity-50 transition font-medium text-sm"
                        >
                            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Export Excel
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <Loader2 className="w-8 h-8 animate-spin text-[#1F3864]" />
                        <span className="ml-3 text-gray-500">Loading quarterly data...</span>
                    </div>
                ) : data ? (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                            <SummaryCard icon={Users} label="Clinical Assessments" value={data.totals.clinical_assessments} sublabel="14-Day Reports" color="blue" />
                            <SummaryCard icon={ClipboardCheck} label="Receiving Services" value={data.totals.receiving_services} sublabel="Active participants" color="green" />
                            <SummaryCard icon={Heart} label="BH Treatment" value={data.totals.bh_treatment} sublabel="Mental health" color="purple" />
                            <SummaryCard icon={Pill} label="SUD Treatment" value={data.totals.sud_treatment} sublabel="Substance use" color="orange" />
                            <SummaryCard icon={CheckCircle2} label="Completions" value={data.totals.successful_completions} sublabel="Successful" color="emerald" />
                        </div>

                        {/* Secondary Stats Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                            <MiniStat label="Compliant" value={data.totals.compliant} />
                            <MiniStat label="Receiving MAT" value={data.totals.mat_receiving} />
                            <MiniStat label="Job Training" value={data.totals.job_training} />
                            <MiniStat label="Education Completed" value={data.totals.education_completed} />
                        </div>

                        {/* Tabs */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="border-b border-gray-200 overflow-x-auto">
                                <div className="flex min-w-max">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                                                activeTab === tab.key
                                                    ? 'border-[#1F3864] text-[#1F3864]'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6">
                                {activeTab === 'treatment' && <TreatmentTab data={data} />}
                                {activeTab === 'discharge' && <DischargeTab data={data} />}
                                {activeTab === 'lengthOfStay' && <LengthOfStayTab data={data} />}
                                {activeTab === 'services' && <ServicesTab data={data} />}
                                {activeTab === 'completions' && <CompletionsTab data={data} />}
                                {activeTab === 'finalReports' && <FinalReportsTab data={data} />}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-32 text-gray-500">No data available for this quarter.</div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// COMPONENTS
// ============================================================================

const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function SummaryCard({ icon: Icon, label, value, sublabel, color }: {
    icon: any; label: string; value: number; sublabel: string; color: string;
}) {
    return (
        <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
            <div className="flex items-center justify-between mb-3">
                <Icon className="w-5 h-5 opacity-70" />
                <span className="text-2xl font-bold">{value.toLocaleString()}</span>
            </div>
            <div className="text-sm font-medium">{label}</div>
            <div className="text-xs opacity-60 mt-0.5">{sublabel}</div>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">{label}</span>
            <span className="text-lg font-bold text-gray-900">{value.toLocaleString()}</span>
        </div>
    );
}

function DataTable({ headers, rows, highlightLast }: {
    headers: string[]; rows: (string | number | null)[][]; highlightLast?: boolean;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50">
                        {headers.map((h, i) => (
                            <th key={i} className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr
                            key={i}
                            className={`border-b border-gray-100 ${
                                highlightLast && i === rows.length - 1
                                    ? 'bg-[#1F3864]/5 font-semibold'
                                    : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                            }`}
                        >
                            {row.map((cell, j) => (
                                <td key={j} className={`px-4 py-2.5 ${j > 0 && typeof cell === 'number' ? 'text-center' : ''}`}>
                                    {cell ?? '—'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length === 0 && (
                <div className="text-center py-12 text-gray-400">No data for this quarter</div>
            )}
        </div>
    );
}

// Bar chart using simple divs (no external chart lib needed)
function HorizontalBar({ items, maxValue }: { items: { label: string; value: number }[]; maxValue: number }) {
    return (
        <div className="space-y-2">
            {items.slice(0, 15).map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-36 truncate text-right">{item.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 bg-[#1F3864] rounded-full transition-all duration-500"
                            style={{ width: maxValue > 0 ? `${(item.value / maxValue) * 100}%` : '0%' }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                            {item.value}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// TAB CONTENT
// ============================================================================

function TreatmentTab({ data }: { data: QuarterlyData }) {
    const headers = ['Treatment Provider', 'Assessments', 'Receiving Services', 'Compliant',
        'BH Treatment', 'SUD Treatment', 'MAT', 'Training', 'Education', 'Completions'];
    const rows = [
        ...data.treatment.map((r: any) => [
            r.provider_name, r.clinical_assessments, r.receiving_services, r.compliant,
            r.bh_treatment, r.sud_treatment, r.mat_receiving, r.job_training,
            r.education_completed, r.successful_completions,
        ]),
        ['Totals', data.totals.clinical_assessments, data.totals.receiving_services,
            data.totals.compliant, data.totals.bh_treatment, data.totals.sud_treatment,
            data.totals.mat_receiving, data.totals.job_training,
            data.totals.education_completed, data.totals.successful_completions],
    ];

    const top10 = [...data.treatment]
        .sort((a, b) => b.receiving_services - a.receiving_services)
        .slice(0, 10)
        .map(r => ({ label: r.provider_name, value: r.receiving_services }));
    const max = top10[0]?.value || 1;

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Providers by Active Participants</h3>
                <HorizontalBar items={top10} maxValue={max} />
            </div>
            <DataTable headers={headers} rows={rows} highlightLast />
        </div>
    );
}

function DischargeTab({ data }: { data: QuarterlyData }) {
    // Group by reason for summary
    const byReason: Record<string, number> = {};
    data.discharge.forEach((r: any) => {
        byReason[r.discharge_reason] = (byReason[r.discharge_reason] || 0) + parseInt(r.count);
    });
    const reasonItems = Object.entries(byReason)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    const maxR = reasonItems[0]?.value || 1;

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Discharge Reasons Summary</h3>
                <HorizontalBar items={reasonItems} maxValue={maxR} />
            </div>
            <DataTable
                headers={['Treatment Provider', 'Discharge Reason', 'Count']}
                rows={data.discharge.map((r: any) => [r.provider_name, r.discharge_reason, parseInt(r.count)])}
            />
            {data.dischargeMAT.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 mt-8">Discharged Participants Receiving MAT</h3>
                    <DataTable
                        headers={['Patient ID', 'Treatment Provider', 'Discharge Reason']}
                        rows={data.dischargeMAT.map((r: any) => [r.patient_id, r.provider_name, r.discharge_reason])}
                    />
                </div>
            )}
        </div>
    );
}

function LengthOfStayTab({ data }: { data: QuarterlyData }) {
    const validDays = data.lengthOfStay.filter((r: any) => r.days_in_program != null);
    const avgDays = validDays.length > 0
        ? Math.round(validDays.reduce((s: number, r: any) => s + r.days_in_program, 0) / validDays.length)
        : 0;

    return (
        <div className="space-y-6">
            <div className="flex gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <span className="text-sm text-blue-600">Total Discharged</span>
                    <span className="block text-2xl font-bold text-blue-800">{data.lengthOfStay.length}</span>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <span className="text-sm text-purple-600">Average Length of Stay</span>
                    <span className="block text-2xl font-bold text-purple-800">{avgDays} days</span>
                </div>
            </div>
            <DataTable
                headers={['Treatment Provider', 'Patient ID', 'First Name', 'Last Name', 'Days in Program']}
                rows={data.lengthOfStay.map((r: any) => [
                    r.provider_name, r.patient_id, r.first_name, r.last_name,
                    r.days_in_program ?? '—',
                ])}
            />
        </div>
    );
}

function ServicesTab({ data }: { data: QuarterlyData }) {
    const [serviceType, setServiceType] = useState<'mh' | 'sud' | 'mat'>('mh');
    const serviceData = serviceType === 'mh' ? data.mhByProvider
        : serviceType === 'sud' ? data.sudByProvider
        : data.matByProvider;

    const total = serviceData.reduce((s: number, r: any) => s + parseInt(r.count), 0);
    const items = serviceData.map((r: any) => ({ label: r.provider_name, value: parseInt(r.count) }))
        .sort((a: any, b: any) => b.value - a.value);
    const max = items[0]?.value || 1;

    const labels = { mh: 'Mental Health', sud: 'Substance Use Disorder', mat: 'Medication-Assisted Treatment' };

    return (
        <div className="space-y-6">
            <div className="flex gap-2">
                {(['mh', 'sud', 'mat'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setServiceType(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            serviceType === t
                                ? 'bg-[#1F3864] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {labels[t]}
                    </button>
                ))}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 inline-block">
                <span className="text-sm text-gray-600">Total Clients — {labels[serviceType]}</span>
                <span className="block text-2xl font-bold text-gray-900">{total}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">By Provider</h3>
                    <HorizontalBar items={items.slice(0, 15)} maxValue={max} />
                </div>
                <DataTable
                    headers={['Treatment Provider', 'Number of Clients']}
                    rows={[
                        ...serviceData.map((r: any) => [r.provider_name, parseInt(r.count)]),
                        ['Total', total],
                    ]}
                    highlightLast
                />
            </div>
        </div>
    );
}

function CompletionsTab({ data }: { data: QuarterlyData }) {
    const total = data.completionsByProvider.reduce((s: number, r: any) => s + parseInt(r.count), 0);
    const items = data.completionsByProvider
        .map((r: any) => ({ label: r.provider_name, value: parseInt(r.count) }))
        .sort((a: any, b: any) => b.value - a.value);
    const max = items[0]?.value || 1;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <span className="text-sm text-emerald-600">Successful Completions</span>
                    <span className="block text-2xl font-bold text-emerald-800">{total}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <span className="text-sm text-blue-600">KYAE Job Training</span>
                    <span className="block text-2xl font-bold text-blue-800">{data.totals.job_training}</span>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <span className="text-sm text-purple-600">KYAE Education</span>
                    <span className="block text-2xl font-bold text-purple-800">{data.totals.education_completed}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Completions by Provider</h3>
                    <HorizontalBar items={items.slice(0, 10)} maxValue={max} />
                </div>
                <DataTable
                    headers={['Treatment Provider', 'Completions']}
                    rows={[
                        ...data.completionsByProvider.map((r: any) => [r.provider_name, parseInt(r.count)]),
                        ['Total', total],
                    ]}
                    highlightLast
                />
            </div>
        </div>
    );
}

function FinalReportsTab({ data }: { data: QuarterlyData }) {
    const total = data.finalReportsByProvider.reduce((s: number, r: any) => s + parseInt(r.count), 0);

    return (
        <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 inline-block">
                <span className="text-sm text-gray-600">Total Final Reports</span>
                <span className="block text-2xl font-bold text-gray-900">{total}</span>
            </div>
            <DataTable
                headers={['Treatment Provider', 'Final Questionnaires']}
                rows={[
                    ...data.finalReportsByProvider.map((r: any) => [r.provider_name, parseInt(r.count)]),
                    ['Total', total],
                ]}
                highlightLast
            />
        </div>
    );
}
