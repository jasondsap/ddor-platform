'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    Users, Plus, Loader2, Search, X, Shield, Building,
    Mail, CheckCircle2, AlertCircle, Save, Trash2, Edit, UserPlus
} from 'lucide-react';

const ROLES = [
    { value: 'super_admin', label: 'Super Admin', color: 'bg-red-50 text-red-700', desc: 'Full platform access — FGI leadership' },
    { value: 'business_user', label: 'Business User', color: 'bg-purple-50 text-purple-700', desc: 'Full access — FGI staff' },
    { value: 'navigator', label: 'Navigator', color: 'bg-blue-50 text-blue-700', desc: 'County-scoped — case navigators' },
    { value: 'administrative_provider', label: 'Admin Provider', color: 'bg-amber-50 text-amber-700', desc: 'Provider admin — manages their facilities' },
    { value: 'healthcare_user', label: 'Healthcare User', color: 'bg-green-50 text-green-700', desc: 'Standard — facility staff' },
    { value: 'court_assessor', label: 'Court Assessor', color: 'bg-indigo-50 text-indigo-700', desc: 'Read-only — court/prosecutor lookup via /court' },
];

const getRoleConfig = (role: string) => ROLES.find(r => r.value === role) || ROLES[4];

export default function AdminUsersPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const ddor = (session as any)?.ddor;
    const isAdmin = ddor?.role === 'super_admin' || ddor?.role === 'business_user';

    const [users, setUsers] = useState<any[]>([]);
    const [facilities, setFacilities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '', role: 'healthcare_user', facility_id: '' });
    const [editForm, setEditForm] = useState<any>({});

    useEffect(() => { if (authStatus === 'unauthenticated') router.push('/auth/signin'); }, [authStatus, router]);

    useEffect(() => {
        if (!ddor) return;
        fetchUsers();
        fetch('/api/facilities?include_inactive=true').then(r => r.json()).then(d => setFacilities(d.facilities || []));
    }, [ddor]);

    const fetchUsers = async () => {
        const d = await fetch('/api/admin/users').then(r => r.json());
        setUsers(d.users || []);
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!newUser.email || !newUser.first_name || !newUser.last_name) { setError('Name and email are required'); return; }
        setSaving(true); setError('');
        const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed'); setSaving(false); return; }
        setShowCreate(false); setNewUser({ first_name: '', last_name: '', email: '', role: 'healthcare_user', facility_id: '' });
        setSaving(false); setSuccessMsg('User created'); setTimeout(() => setSuccessMsg(''), 3000);
        fetchUsers();
    };

    const startEdit = (user: any) => {
        setEditingId(user.id);
        setEditForm({ first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role || 'healthcare_user', facility_id: user.facility_id || '' });
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        setSaving(true); setError('');
        const res = await fetch(`/api/admin/users/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
        if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
        setEditingId(null); setSaving(false); setSuccessMsg('User updated'); setTimeout(() => setSuccessMsg(''), 3000);
        fetchUsers();
    };

    const handleDelete = async (userId: string, userName: string) => {
        if (!confirm(`Remove ${userName} from the platform? This cannot be undone.`)) return;
        await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        setSuccessMsg('User removed'); setTimeout(() => setSuccessMsg(''), 3000);
        fetchUsers();
    };

    const filtered = users.filter(u => {
        const matchSearch = !search || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase());
        const matchRole = !roleFilter || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    if (!isAdmin) return <div className="min-h-screen bg-gray-50"><Header /><div className="text-center py-12 text-gray-500">Admin access required.</div></div>;

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-ddor-navy">User Management</h1>
                        <p className="text-sm text-gray-500 mt-1">{users.length} users • Manage DDOR platform access</p>
                    </div>
                    <button onClick={() => setShowCreate(!showCreate)}
                        className="flex items-center gap-2 px-4 py-2 bg-ddor-blue text-white rounded-lg font-medium hover:bg-[#156090] text-sm">
                        <UserPlus className="w-4 h-4" /> Add User
                    </button>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /><p className="text-sm text-red-700">{error}</p><button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button></div>}
                {successMsg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><p className="text-sm text-green-700">{successMsg}</p></div>}

                {/* Create User Form */}
                {showCreate && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-ddor-blue/20">
                        <h2 className="font-semibold text-ddor-navy mb-4">New User</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                                <input value={newUser.first_name} onChange={e => setNewUser(p => ({ ...p, first_name: e.target.value }))}
                                    className="w-full p-2.5 border rounded-lg text-sm" placeholder="Erin" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                                <input value={newUser.last_name} onChange={e => setNewUser(p => ({ ...p, last_name: e.target.value }))}
                                    className="w-full p-2.5 border rounded-lg text-sm" placeholder="Henle" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                                <input value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} type="email"
                                    className="w-full p-2.5 border rounded-lg text-sm" placeholder="ehenle@fletchergroup.org" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                                    className="w-full p-2.5 border rounded-lg text-sm">
                                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Assigned Facility</label>
                                <select value={newUser.facility_id} onChange={e => setNewUser(p => ({ ...p, facility_id: e.target.value }))}
                                    className="w-full p-2.5 border rounded-lg text-sm">
                                    <option value="">None (all facilities)</option>
                                    {facilities.map((f: any) => <option key={f.id} value={f.id}>{f.provider_name ? `${f.provider_name} — ` : ''}{f.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-white border rounded-lg text-sm">Cancel</button>
                            <button onClick={handleCreate} disabled={saving}
                                className="px-4 py-2 bg-ddor-blue text-white rounded-lg text-sm font-medium disabled:opacity-40 flex items-center gap-1">
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Create User
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-3">Note: After creating a user here, you also need to create their account in AWS Cognito so they can log in. Use the same email address.</p>
                    </div>
                )}

                {/* Filters */}
                <div className="flex gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or email..." className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm" />
                    </div>
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                        className="p-2.5 border rounded-lg text-sm min-w-[160px]">
                        <option value="">All Roles</option>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                </div>

                {/* User List */}
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">No users found.</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Facility</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Cognito</th>
                                        <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(user => {
                                        const roleCfg = getRoleConfig(user.role);
                                        const isEditing = editingId === user.id;

                                        return (
                                            <tr key={user.id} className={`border-b last:border-0 ${isEditing ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <div className="flex gap-2">
                                                            <input value={editForm.first_name} onChange={e => setEditForm((p: any) => ({ ...p, first_name: e.target.value }))}
                                                                className="w-24 p-1.5 border rounded text-sm" />
                                                            <input value={editForm.last_name} onChange={e => setEditForm((p: any) => ({ ...p, last_name: e.target.value }))}
                                                                className="w-24 p-1.5 border rounded text-sm" />
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                                                            <p className="text-xs text-gray-500">{user.email}</p>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <select value={editForm.role} onChange={e => setEditForm((p: any) => ({ ...p, role: e.target.value }))}
                                                            className="p-1.5 border rounded text-xs w-full">
                                                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                        </select>
                                                    ) : (
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleCfg.color}`}>{roleCfg.label}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <select value={editForm.facility_id || ''} onChange={e => setEditForm((p: any) => ({ ...p, facility_id: e.target.value }))}
                                                            className="p-1.5 border rounded text-xs w-full">
                                                            <option value="">None</option>
                                                            {facilities.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                        </select>
                                                    ) : (
                                                        <span className="text-xs text-gray-600">{user.facility_name || '—'}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {user.cognito_sub ? (
                                                        <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" /> Linked</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="w-3 h-3" /> Not linked</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {isEditing ? (
                                                        <div className="flex gap-1 justify-end">
                                                            <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs bg-white border rounded">Cancel</button>
                                                            <button onClick={handleUpdate} disabled={saving}
                                                                className="px-2 py-1 text-xs bg-green-600 text-white rounded flex items-center gap-1">
                                                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-1 justify-end">
                                                            <button onClick={() => startEdit(user)} className="p-1.5 hover:bg-gray-100 rounded" title="Edit">
                                                                <Edit className="w-3.5 h-3.5 text-gray-500" />
                                                            </button>
                                                            <button onClick={() => handleDelete(user.id, `${user.first_name} ${user.last_name}`)}
                                                                className="p-1.5 hover:bg-red-50 rounded" title="Remove">
                                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Role Legend */}
                <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold text-ddor-navy text-sm mb-3">Role Definitions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ROLES.map(r => (
                            <div key={r.value} className="flex items-start gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.color} whitespace-nowrap`}>{r.label}</span>
                                <span className="text-xs text-gray-500">{r.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
