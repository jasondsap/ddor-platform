'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

function SignInContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    return (
        <div className="min-h-screen flex">
            {/* LEFT — Sign In Form */}
            <div className="w-full lg:w-[480px] flex flex-col justify-center px-8 sm:px-16 bg-white relative z-10">
                <div className="max-w-sm mx-auto w-full">
                    {/* Logo */}
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1A73A8] to-[#0d4f78] flex items-center justify-center shadow-md">
                                <span className="text-xl font-bold text-white tracking-tight">D</span>
                            </div>
                            <div>
                                <span className="text-xl font-bold text-[#1A2B4A] tracking-tight">DDOR</span>
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-[#1A2B4A] mb-2">Welcome back</h1>
                        <p className="text-gray-500 text-sm">Sign in to your account to continue.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error === 'OAuthCallback' ? 'Authentication failed. Please try again.' : error}
                        </div>
                    )}

                    <button
                        onClick={() => signIn('cognito', { callbackUrl: '/' })}
                        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-[#1A73A8] text-white rounded-xl font-semibold hover:bg-[#156090] transition-all shadow-sm hover:shadow-md"
                    >
                        Sign In 
                        <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 mt-8 text-xs text-gray-400 justify-center">
                        <Shield className="w-3.5 h-3.5" />
                        <span>HIPAA-compliant &bull; Secured by AWS</span>
                    </div>

                    <p className="text-center text-gray-300 text-xs mt-12">
                        &copy; {new Date().getFullYear()} Fletcher Group, Inc.
                    </p>
                </div>
            </div>

            {/* RIGHT — Branded Panel */}
            <div className="hidden lg:flex flex-1 relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1A2B4A] via-[#1A3D5C] to-[#0d4f78]" />

                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                        backgroundSize: '32px 32px',
                    }}
                />

                {/* Decorative circles */}
                <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#1A73A8]/20 blur-3xl" />
                <div className="absolute -bottom-48 -left-24 w-[500px] h-[500px] rounded-full bg-[#2DD4BF]/10 blur-3xl" />
                <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-[#1A73A8]/10 blur-2xl" />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24 max-w-2xl">
                    {/* Main headline */}
                    <div className="mb-12">
                        <p className="text-[#2DD4BF] text-sm font-semibold tracking-widest uppercase mb-4">
                            Data Driven Outcomes Reporting
                        </p>
                        <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
                            Better data.<br />
                            Better outcomes.<br />
                            <span className="text-[#2DD4BF]">Better lives.</span>
                        </h2>
                        <p className="text-blue-200/70 text-base leading-relaxed max-w-md">
                            The comprehensive platform for Kentucky&apos;s Behavioral Health
                            Conditional Dismissal Program — tracking participants from
                            referral through recovery.
                        </p>
                    </div>

                    {/* Feature highlights */}
                    <div className="space-y-4">
                        {[
                            'Real-time report tracking & due date monitoring',
                            'Automated notifications across your team',
                            'Provider & facility management with drill-down analytics',
                            'Participant assessments with self-service links',
                        ].map((feature, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-[#2DD4BF] flex-shrink-0 mt-0.5" />
                                <span className="text-blue-100/80 text-sm">{feature}</span>
                            </div>
                        ))}
                    </div>

                    {/* Program badge */}
                    <div className="mt-16 pt-8 border-t border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                                <span className="text-lg font-bold text-[#2DD4BF]">FGI</span>
                            </div>
                            <div>
                                <p className="text-white/90 text-sm font-semibold">Fletcher Group, Inc.</p>
                                <p className="text-blue-200/50 text-xs">BHCDP / SB90 Program Administration</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
            <SignInContent />
        </Suspense>
    );
}
