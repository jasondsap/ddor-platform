'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import {
    LayoutDashboard, Users, FileText, ClipboardList,
    DollarSign, Settings, LogOut, Menu, X, Activity,
    UserPlus, ChevronDown, RefreshCw, GraduationCap,
    Bell, UserCheck, Shield, Edit, Building, BarChart2,
    Heart, MessageSquarePlus, Wrench, StickyNote
} from 'lucide-react';

// Primary nav — always visible
const PRIMARY_NAV = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Clients', href: '/clients', icon: Users },
    { label: 'Reports', href: '/report-tracking', icon: ClipboardList },
    { label: 'Analytics', href: '/analytics', icon: BarChart2 },
    { label: 'Messages', href: '/messages', icon: MessageSquarePlus },
];

// Tools dropdown
const TOOLS_ITEMS = [
    { label: 'Referrals', href: '/referrals', icon: UserPlus, desc: 'Incoming referral pipeline' },
    { label: 'Assessments', href: '/assessments', icon: Activity, desc: 'BARC-10, PHQ-9, GAIN-SS' },
    { label: 'Notes', href: '/notes', icon: StickyNote, desc: 'Client notes & documentation' },
    { label: 'Invoices', href: '/invoices', icon: DollarSign, desc: 'Billing & reimbursement' },
];

// Admin dropdown (admin only)
const ADMIN_ITEMS = [
    { label: 'Providers', href: '/providers', icon: Building, desc: 'Provider organizations' },
    { label: 'Facilities', href: '/facilities', icon: Settings, desc: 'Treatment locations' },
    { label: 'Users', href: '/admin/users', icon: Shield, desc: 'Platform access & roles' },
    { label: 'Contracts', href: '/admin/contracts', icon: FileText, desc: 'Compliance tracking' },
    { label: 'Barrier Relief', href: '/admin/barrier-relief', icon: Heart, desc: 'Funding requests' },
];

// Forms dropdown
const FORM_ITEMS = [
    { label: 'Submit Report', href: '/reports/new', icon: FileText, desc: '14-Day / Progress / Final' },
    { label: 'Initiation', href: '/initiation/new', icon: Bell, desc: 'Treatment started or scheduled' },
    { label: 'Status Change', href: '/status-change/new', icon: RefreshCw, desc: 'Discharge or non-adherent' },
    { label: 'KYAE Referral', href: '/kyae-referral/new', icon: GraduationCap, desc: 'Education & workforce' },
    { label: 'Demographic', href: '/demographic/new', icon: UserCheck, desc: 'Intake demographics' },
    { label: 'GAIN-SS', href: '/gain-ss/new', icon: Shield, desc: 'Screening at referral' },
];

type MenuKey = 'tools' | 'admin' | 'forms' | 'user' | null;

export default function Header() {
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openMenu, setOpenMenu] = useState<MenuKey>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const isAdmin = ddor?.role === 'super_admin' || ddor?.role === 'business_user';

    useEffect(() => {
        if (!ddor) return;
        const fetchUnread = () => {
            fetch('/api/notifications').then(r => r.json()).then(d => setUnreadCount(d.totalUnread || 0)).catch(() => {});
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, [ddor]);

    const toggle = (key: MenuKey) => setOpenMenu(prev => prev === key ? null : key);
    const close = () => setOpenMenu(null);

    const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));
    const isDropdownActive = (items: { href: string }[]) => items.some(i => isActive(i.href));

    return (
        <header className="bg-ddor-navy text-white sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-14">
                    {/* Logo */}
                    <button onClick={() => router.push('/')} className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-ddor-teal flex items-center justify-center text-sm font-bold">D</div>
                        <span className="font-bold text-lg hidden sm:block">DDOR</span>
                    </button>

                    {/* Desktop Nav */}
                    <nav className="hidden lg:flex items-center gap-0.5">
                        {/* Primary items */}
                        {PRIMARY_NAV.map(item => {
                            const active = isActive(item.href);
                            const showBadge = item.href === '/messages' && unreadCount > 0;
                            return (
                                <button key={item.href} onClick={() => { router.push(item.href); close(); }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors relative ${active ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                    {showBadge && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}

                        <div className="w-px h-5 bg-white/20 mx-1" />

                        {/* Tools dropdown */}
                        <DropdownTrigger label="Tools" icon={Wrench} isOpen={openMenu === 'tools'}
                            isActive={isDropdownActive(TOOLS_ITEMS)} onClick={() => toggle('tools')} />

                        {/* Admin dropdown */}
                        {isAdmin && (
                            <DropdownTrigger label="Admin" icon={Shield} isOpen={openMenu === 'admin'}
                                isActive={isDropdownActive(ADMIN_ITEMS)} onClick={() => toggle('admin')} />
                        )}

                        {/* Forms dropdown */}
                        <DropdownTrigger label="Forms" icon={Edit} isOpen={openMenu === 'forms'}
                            isActive={isDropdownActive(FORM_ITEMS)} onClick={() => toggle('forms')} />
                    </nav>

                    {/* Right: user + mobile toggle */}
                    <div className="flex items-center gap-2">
                        {/* Mobile messages badge */}
                        <button onClick={() => router.push('/messages')} className="lg:hidden relative p-2 hover:bg-white/10 rounded-lg">
                            <MessageSquarePlus className="w-5 h-5 text-blue-200" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        <div className="hidden sm:block text-right">
                            <p className="text-xs text-blue-200 leading-tight">{ddor?.providerAbbreviation || ddor?.providerName}</p>
                        </div>

                        {/* User menu */}
                        <div className="relative">
                            <button onClick={() => toggle('user')} className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/10">
                                <div className="w-7 h-7 rounded-full bg-ddor-teal flex items-center justify-center text-xs font-bold">{session?.user?.name?.[0] || '?'}</div>
                                <ChevronDown className="w-3 h-3 text-blue-200 hidden sm:block" />
                            </button>
                        </div>

                        <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
                            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Dropdown panels — positioned below header */}
            {openMenu && openMenu !== 'user' && (
                <>
                    <div className="fixed inset-0 z-40" onClick={close} />
                    <div className="absolute left-0 right-0 bg-white border-t shadow-lg z-50">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                            {openMenu === 'tools' && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {TOOLS_ITEMS.map(item => (
                                        <DropdownItem key={item.href} item={item} active={isActive(item.href)}
                                            onClick={() => { router.push(item.href); close(); }} />
                                    ))}
                                </div>
                            )}
                            {openMenu === 'admin' && (
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    {ADMIN_ITEMS.map(item => (
                                        <DropdownItem key={item.href} item={item} active={isActive(item.href)}
                                            onClick={() => { router.push(item.href); close(); }} />
                                    ))}
                                </div>
                            )}
                            {openMenu === 'forms' && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {FORM_ITEMS.map(item => (
                                        <DropdownItem key={item.href} item={item} active={isActive(item.href)}
                                            onClick={() => { router.push(item.href); close(); }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* User dropdown */}
            {openMenu === 'user' && (
                <>
                    <div className="fixed inset-0 z-40" onClick={close} />
                    <div className="absolute right-4 sm:right-6 top-12 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                        <div className="px-4 py-2 border-b">
                            <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                            <p className="text-xs text-gray-500">{session?.user?.email}</p>
                            <p className="text-xs text-ddor-blue mt-1 capitalize">{ddor?.role?.replace(/_/g, ' ')}</p>
                        </div>
                        <button onClick={() => { signOut({ callbackUrl: '/auth/signin' }); close(); }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                </>
            )}

            {/* Mobile Nav */}
            {mobileOpen && (
                <nav className="lg:hidden border-t border-white/10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-1">
                        {PRIMARY_NAV.map(item => (
                            <button key={item.href} onClick={() => { router.push(item.href); setMobileOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive(item.href) ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10'}`}>
                                <item.icon className="w-4 h-4" /> {item.label}
                            </button>
                        ))}

                        <MobileSection label="Tools" items={TOOLS_ITEMS} router={router} close={() => setMobileOpen(false)} isActive={isActive} />
                        {isAdmin && <MobileSection label="Admin" items={ADMIN_ITEMS} router={router} close={() => setMobileOpen(false)} isActive={isActive} />}
                        <MobileSection label="Forms" items={FORM_ITEMS} router={router} close={() => setMobileOpen(false)} isActive={isActive} />
                    </div>
                </nav>
            )}
        </header>
    );
}

// === Sub-components ===

function DropdownTrigger({ label, icon: Icon, isOpen, isActive, onClick }: {
    label: string; icon: any; isOpen: boolean; isActive: boolean; onClick: () => void;
}) {
    return (
        <button onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${isOpen || isActive ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
            <Icon className="w-4 h-4" />
            {label}
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
    );
}

function DropdownItem({ item, active, onClick }: {
    item: { label: string; href: string; icon: any; desc: string }; active: boolean; onClick: () => void;
}) {
    return (
        <button onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${active ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-ddor-blue text-white' : 'bg-gray-100 text-gray-500'}`}>
                <item.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className={`text-sm font-medium ${active ? 'text-ddor-blue' : 'text-gray-900'}`}>{item.label}</p>
                <p className="text-xs text-gray-400 truncate">{item.desc}</p>
            </div>
        </button>
    );
}

function MobileSection({ label, items, router, close, isActive }: {
    label: string; items: any[]; router: any; close: () => void; isActive: (h: string) => boolean;
}) {
    return (
        <div className="pt-2 mt-2 border-t border-white/10">
            <p className="px-3 py-1 text-xs text-blue-300/60 uppercase tracking-wider font-medium">{label}</p>
            {items.map((item: any) => (
                <button key={item.href} onClick={() => { router.push(item.href); close(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive(item.href) ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10'}`}>
                    <item.icon className="w-4 h-4" /> {item.label}
                </button>
            ))}
        </div>
    );
}
