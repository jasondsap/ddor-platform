// app/reports/new/page.tsx
//
// Top-level dispatcher for the report-entry page.
//
// Routes to one of three subforms based on the `type` query param:
//   - fourteen_day            → Form14Day
//   - fortytwo_day, ninety_day, oneeighty_day, twoseventy_day, threesixty_day → FormProgress
//   - final_report            → FormFinal
//
// Each subform manages its own form state, lifecycle, and submission. This file
// stays thin so changes to one report type can't accidentally regress the others.
//
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { isProgressReport } from '@/lib/report-fields';
import Form14Day from './_components/Form14Day';
import FormProgress from './_components/FormProgress';
import FormFinal from './_components/FormFinal';
import { CommonLoading } from './_components/shared';

function ReportFormDispatcher() {
    const searchParams = useSearchParams();
    const typeParam = searchParams.get('type') || 'fourteen_day';

    if (typeParam === 'fourteen_day') return <Form14Day />;
    if (typeParam === 'final_report') return <FormFinal />;
    if (isProgressReport(typeParam)) return <FormProgress initialType={typeParam} />;

    // Default fallback for any unknown type
    return <Form14Day />;
}

export default function NewReportPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <Suspense fallback={<CommonLoading />}>
                <ReportFormDispatcher />
            </Suspense>
        </div>
    );
}
