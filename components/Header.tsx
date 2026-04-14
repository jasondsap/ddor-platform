'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import {
    LayoutDashboard, Users, FileText, ClipboardList,
    DollarSign, Settings, LogOut, Menu, X, Activity,
    UserPlus, ChevronDown, RefreshCw, GraduationCap,
    Bell, UserCheck, Shield, Edit, Building, BarChart2, Heart
} from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Clients', href: '/clients', icon: Users },
    { label: 'Referrals', href: '/referrals', icon: UserPlus },
    { label: 'Reports', href: '/report-tracking', icon: ClipboardList },
    { label: 'Assessments', href: '/assessments', icon: Activity },
    { label: 'Analytics', href: '/analytics', icon: BarChart2 },
    { label: 'Invoices', href: '/invoices', icon: DollarSign },
];

const FORM_ITEMS = [
    { label: 'Submit Report', href: '/reports/new', icon: FileText, desc: '14-Day / Progress / Final' },
    { label: 'Initiation Notification', href: '/initiation/new', icon: Bell, desc: 'Treatment started or scheduled' },
    { label: 'Status Change', href: '/status-change/new', icon: RefreshCw, desc: 'Discharge or non-adherent' },
    { label: 'KYAE Referral', href: '/kyae-referral/new', icon: GraduationCap, desc: 'Education & workforce referral' },
    { label: 'Demographic Report', href: '/demographic/new', icon: UserCheck, desc: 'Intake demographics' },
    { label: 'GAIN-SS Screener', href: '/gain-ss/new', icon: Shield, desc: 'Screening at referral' },
];

const ADMIN_ITEMS = [
    { label: 'Providers', href: '/providers', icon: Building },
    { label: 'Facilities', href: '/facilities', icon: Settings },
    { label: 'Users', href: '/admin/users', icon: Shield },
    { label: 'Contracts', href: '/admin/contracts', icon: FileText },
    { label: 'Barrier Relief', href: '/admin/barrier-relief', icon: Heart },
];

export default function Header() {
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;
    const router = useRouter();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [formsMenuOpen, setFormsMenuOpen] = useState(false);

    const isAdmin = ddor?.role === 'super_admin' || ddor?.role === 'business_user';
    const allItems = isAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

    return (
        <header className="bg-ddor-navy text-white sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-14">
                    {/* Logo */}
                    <button onClick={() => router.push('/')} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-ddor-teal flex items-center justify-center text-sm font-bold">
                            D
                        </div>
                        <span className="font-bold text-lg hidden sm:block">DDOR</span>
                    </button>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {allItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <button
                                    key={item.href}
                                    onClick={() => router.push(item.href)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                        isActive
                                            ? 'bg-white/15 text-white'
                                            : 'text-blue-200 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </button>
                            );
                        })}

                        {/* Forms Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setFormsMenuOpen(!formsMenuOpen)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                    formsMenuOpen ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <Edit className="w-4 h-4" />
                                Forms
                                <ChevronDown className="w-3 h-3" />
                            </button>

                            {formsMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setFormsMenuOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg py-1 z-50">
                                        {FORM_ITEMS.map((item) => (
                                            <button
                                                key={item.href}
                                                onClick={() => { router.push(item.href); setFormsMenuOpen(false); }}
                                                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3"
                                            >
                                                <item.icon className="w-4 h-4 text-ddor-blue flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                                                    <p className="text-xs text-gray-400">{item.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </nav>

                    {/* User Menu */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                            <p className="text-xs text-blue-200 leading-tight">
                                {ddor?.providerAbbreviation || ddor?.providerName}
                            </p>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10"
                            >
                                <div className="w-7 h-7 rounded-full bg-ddor-teal flex items-center justify-center text-xs font-bold">
                                    {session?.user?.name?.[0] || '?'}
                                </div>
                                <ChevronDown className="w-3 h-3 text-blue-200" />
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                                    <div className="px-4 py-2 border-b">
                                        <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                                        <p className="text-xs text-gray-500">{session?.user?.email}</p>
                                        <p className="text-xs text-ddor-blue mt-1 capitalize">{ddor?.role?.replace('_', ' ')}</p>
                                    </div>
                                    <button
                                        onClick={() => { signOut({ callbackUrl: '/auth/signin' }); setUserMenuOpen(false); }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <LogOut className="w-4 h-4" /> Sign Out
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="md:hidden p-2 hover:bg-white/10 rounded-lg"
                        >
                            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                {menuOpen && (
                    <nav className="md:hidden py-3 border-t border-white/10 space-y-1">
                        {allItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <button
                                    key={item.href}
                                    onClick={() => { router.push(item.href); setMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                                        isActive ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10'
                                    }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </button>
                            );
                        })}

                        <div className="pt-2 mt-2 border-t border-white/10">
                            <p className="px-3 py-1 text-xs text-blue-300/60 uppercase tracking-wider font-medium">Forms</p>
                            {FORM_ITEMS.map((item) => (
                                <button
                                    key={item.href}
                                    onClick={() => { router.push(item.href); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-blue-200 hover:bg-white/10"
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </nav>
                )}
            </div>
        </header>
    );
}
