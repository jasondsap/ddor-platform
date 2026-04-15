'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
    MessageSquare, Plus, Loader2, Search, X, Send,
    Hash, Users, User, Clock, Building,
    Bell, AtSign, UserPlus, Mail
} from 'lucide-react';

export default function MessagesPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const ddor = (session as any)?.ddor;
    const currentUserId = ddor?.userId;

    const [channels, setChannels] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [activeChannel, setActiveChannel] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [channelInfo, setChannelInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [showNewDM, setShowNewDM] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [search, setSearch] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const pollRef = useRef<any>(null);

    useEffect(() => {
        if (!ddor) return;
        fetchChannels();
        fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients || []));
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [ddor]);

    const fetchChannels = async () => {
        const d = await fetch('/api/channels').then(r => r.json());
        setChannels(d.channels || []);
        setAllUsers(d.users || []);
        setLoading(false);
        if (!activeChannel && d.channels?.length > 0) selectChannel(d.channels[0].id);
    };

    const selectChannel = async (channelId: string) => {
        setActiveChannel(channelId);
        setLoadingMsgs(true);
        const d = await fetch(`/api/channels/${channelId}/messages`).then(r => r.json());
        setMessages(d.messages || []);
        setChannelInfo(d.channel);
        setLoadingMsgs(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        setChannels(prev => prev.map(ch => ch.id === channelId ? { ...ch, unread_count: '0' } : ch));

        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            const d2 = await fetch(`/api/channels/${channelId}/messages`).then(r => r.json());
            setMessages(d2.messages || []);
        }, 15000);
    };

    const startDM = async (targetUserId: string) => {
        const res = await fetch('/api/channels', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel_type: 'dm', dm_target_id: targetUserId }),
        });
        const d = await res.json();
        if (d.channel) {
            setShowNewDM(false);
            await fetchChannels();
            selectChannel(d.channel.id);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !activeChannel) return;
        setSending(true);

        // Parse mentions: @[Name](type:id)
        const mentionRegex = /@\[([^\]]+)\]\(([^:]+):([^)]+)\)/g;
        const mentions: any[] = [];
        let match;
        while ((match = mentionRegex.exec(newMessage)) !== null) {
            mentions.push({ type: match[2], name: match[1], id: match[3] });
        }

        await fetch(`/api/channels/${activeChannel}/messages`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: newMessage, mentions }),
        });

        setNewMessage('');
        setSending(false);
        const d = await fetch(`/api/channels/${activeChannel}/messages`).then(r => r.json());
        setMessages(d.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        fetchChannels();
    };

    const createChannel = async () => {
        if (!newChannelName.trim()) return;
        await fetch('/api/channels', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newChannelName, channel_type: 'general' }),
        });
        setNewChannelName(''); setShowNewChannel(false);
        fetchChannels();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        if (e.key === 'Escape' && showMentions) setShowMentions(false);
    };

    const insertMention = (item: { name: string; id: string; type: string }) => {
        // Remove the partial @ text, insert formatted mention
        const val = newMessage;
        const lastAt = val.lastIndexOf('@');
        const before = lastAt >= 0 ? val.substring(0, lastAt) : val;
        const mention = `@[${item.name}](${item.type}:${item.id})`;
        setNewMessage(before + mention + ' ');
        setShowMentions(false);
        inputRef.current?.focus();
    };

    const handleInputChange = (val: string) => {
        setNewMessage(val);
        const lastAt = val.lastIndexOf('@');
        if (lastAt >= 0) {
            const afterAt = val.substring(lastAt + 1);
            if (!afterAt.includes(' ') && !afterAt.includes('\n') && afterAt.length < 30) {
                setShowMentions(true);
                setMentionSearch(afterAt);
            } else {
                setShowMentions(false);
            }
        }
    };

    const renderMessage = (body: string) => {
        // Convert @[Name](type:id) to clickable links
        return body.replace(/@\[([^\]]+)\]\(([^:]+):([^)]+)\)/g, (_, name, type, id) => {
            const href = type === 'client' ? `/clients/${id}` : type === 'user' ? '#' : '#';
            const color = type === 'user' ? 'color:#8B5CF6' : 'color:#1A73A8';
            return `<a href="${href}" style="${color};font-weight:500;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">@${name}</a>`;
        });
    };

    // Build mention suggestions: users first, then clients
    const mentionSuggestions = [
        ...allUsers.filter(u => u.id !== currentUserId).map(u => ({
            name: `${u.first_name} ${u.last_name}`, id: u.id, type: 'user',
            subtitle: u.role?.replace('_', ' ') || '', icon: '👤',
        })),
        ...clients.map(c => ({
            name: `${c.first_name} ${c.last_name}`, id: c.id, type: 'client',
            subtitle: c.ddor_id ? `#${c.ddor_id}` : 'Participant', icon: '📋',
        })),
    ].filter(item =>
        !mentionSearch || item.name.toLowerCase().includes(mentionSearch.toLowerCase())
    ).slice(0, 10);

    const groupChannels = channels.filter(ch => ch.channel_type !== 'dm');
    const dmChannels = channels.filter(ch => ch.channel_type === 'dm');

    const filteredGroupChannels = groupChannels.filter(ch => !search || ch.name.toLowerCase().includes(search.toLowerCase()));
    const filteredDMChannels = dmChannels.filter(ch => !search || (ch.dm_partner_name || ch.name).toLowerCase().includes(search.toLowerCase()));

    const channelIcon = (type: string) => {
        if (type === 'dm') return Mail;
        if (type === 'team') return Users;
        if (type === 'announcement') return Bell;
        return Hash;
    };

    if (loading) return <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-ddor-blue" /></div></div>;

    return (
        <div className="min-h-screen bg-gray-50"><Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-ddor-navy">Messages</h1>
                    <p className="text-sm text-gray-500">Internal team communication — @mention users or participants</p>
                </div>

                <div className="flex gap-4" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
                    {/* Channel Sidebar */}
                    <div className="w-72 bg-white rounded-xl shadow-sm flex flex-col flex-shrink-0 overflow-hidden">
                        <div className="p-3 border-b">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Search..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-xs" />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {/* Channels section */}
                            <div className="p-2">
                                <div className="flex items-center justify-between px-2 py-1.5">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Channels</span>
                                    <button onClick={() => { setShowNewChannel(!showNewChannel); setShowNewDM(false); }}
                                        className="p-1 hover:bg-gray-100 rounded"><Plus className="w-3.5 h-3.5 text-gray-400" /></button>
                                </div>

                                {showNewChannel && (
                                    <div className="flex gap-1.5 px-2 mb-2">
                                        <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                                            placeholder="Channel name..." className="flex-1 p-1.5 border rounded text-xs"
                                            onKeyDown={e => { if (e.key === 'Enter') createChannel(); }} autoFocus />
                                        <button onClick={createChannel} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Add</button>
                                    </div>
                                )}

                                {filteredGroupChannels.map(ch => {
                                    const Icon = channelIcon(ch.channel_type);
                                    const unread = parseInt(ch.unread_count) || 0;
                                    const isActive = activeChannel === ch.id;
                                    return (
                                        <button key={ch.id} onClick={() => selectChannel(ch.id)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors mb-0.5 ${isActive ? 'bg-ddor-blue text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                                            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                            <span className="flex-1 truncate text-sm">{ch.name}</span>
                                            {unread > 0 && !isActive && <span className="w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">{unread}</span>}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* DMs section */}
                            <div className="p-2 border-t">
                                <div className="flex items-center justify-between px-2 py-1.5">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Direct Messages</span>
                                    <button onClick={() => { setShowNewDM(!showNewDM); setShowNewChannel(false); }}
                                        className="p-1 hover:bg-gray-100 rounded"><UserPlus className="w-3.5 h-3.5 text-gray-400" /></button>
                                </div>

                                {showNewDM && (
                                    <div className="px-2 mb-2 max-h-40 overflow-y-auto">
                                        <p className="text-xs text-gray-500 mb-1.5">Start a conversation with:</p>
                                        {allUsers.filter(u => u.id !== currentUserId).map(u => (
                                            <button key={u.id} onClick={() => startDM(u.id)}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-100 rounded text-xs">
                                                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-medium flex-shrink-0">
                                                    {u.first_name?.[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">{u.first_name} {u.last_name}</p>
                                                    <p className="text-gray-400 truncate">{u.role?.replace('_', ' ')}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {filteredDMChannels.map(ch => {
                                    const unread = parseInt(ch.unread_count) || 0;
                                    const isActive = activeChannel === ch.id;
                                    const partnerName = ch.dm_partner_name || ch.name;
                                    const initials = partnerName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                                    return (
                                        <button key={ch.id} onClick={() => selectChannel(ch.id)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors mb-0.5 ${isActive ? 'bg-ddor-blue text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'}`}>
                                                {initials}
                                            </div>
                                            <span className="flex-1 truncate text-sm">{partnerName}</span>
                                            {unread > 0 && !isActive && <span className="w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">{unread}</span>}
                                        </button>
                                    );
                                })}

                                {filteredDMChannels.length === 0 && !showNewDM && (
                                    <p className="px-3 py-2 text-xs text-gray-400">No direct messages yet</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Message Thread */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
                        {activeChannel ? (
                            <>
                                {/* Channel header */}
                                <div className="px-5 py-3 border-b flex items-center gap-3">
                                    {channelInfo?.channel_type === 'dm' ? (
                                        <>
                                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-sm font-medium">
                                                {(channels.find(c => c.id === activeChannel)?.dm_partner_name || '?')[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-ddor-navy">{channels.find(c => c.id === activeChannel)?.dm_partner_name || channelInfo?.name}</p>
                                                <p className="text-xs text-gray-500">Direct message</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Hash className="w-5 h-5 text-gray-400" />
                                            <div>
                                                <p className="font-semibold text-ddor-navy">{channelInfo?.name || '...'}</p>
                                                <p className="text-xs text-gray-500">{channelInfo?.channel_type === 'team' ? 'FGI team' : 'Open channel'}</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto px-5 py-4">
                                    {loadingMsgs ? (
                                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-ddor-blue" /></div>
                                    ) : messages.length === 0 ? (
                                        <div className="text-center py-16">
                                            <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                            <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {messages.map((msg, i) => {
                                                const isMe = msg.sender_id === currentUserId;
                                                const showAvatar = i === 0 || messages[i - 1].sender_id !== msg.sender_id;
                                                const initials = msg.sender_first?.[0]?.toUpperCase() || '?';

                                                return (
                                                    <div key={msg.id} className={`flex gap-3 ${!showAvatar ? 'pl-11' : ''}`}>
                                                        {showAvatar && (
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${isMe ? 'bg-ddor-blue text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                                {initials}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            {showAvatar && (
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <span className={`text-sm font-medium ${isMe ? 'text-ddor-blue' : 'text-gray-900'}`}>{msg.sender_name}</span>
                                                                    <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                                </div>
                                                            )}
                                                            <div className="text-sm text-gray-800 whitespace-pre-wrap"
                                                                dangerouslySetInnerHTML={{ __html: renderMessage(msg.body) }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </div>

                                {/* Compose */}
                                <div className="px-5 py-3 border-t relative">
                                    {showMentions && mentionSuggestions.length > 0 && (
                                        <div className="absolute bottom-full left-5 right-5 mb-1 bg-white border rounded-xl shadow-lg max-h-64 overflow-y-auto z-10">
                                            <div className="p-2 border-b">
                                                <p className="text-xs text-gray-500 font-medium flex items-center gap-1"><AtSign className="w-3 h-3" /> Mention a user or participant</p>
                                            </div>
                                            {mentionSuggestions.map(item => (
                                                <button key={`${item.type}-${item.id}`} onClick={() => insertMention(item)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 text-sm">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${item.type === 'user' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {item.name[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                                        <p className="text-xs text-gray-400">{item.type === 'user' ? 'Team member' : 'Participant'} • {item.subtitle}</p>
                                                    </div>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${item.type === 'user' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        {item.type}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-2 items-end">
                                        <textarea ref={inputRef} value={newMessage}
                                            onChange={e => handleInputChange(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Type a message... (@ to mention someone)"
                                            className="flex-1 p-3 border rounded-xl text-sm resize-none min-h-[44px] max-h-32"
                                            rows={1} />
                                        <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                                            className="p-3 bg-ddor-blue text-white rounded-xl hover:bg-[#156090] disabled:opacity-40 flex-shrink-0">
                                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Enter to send, Shift+Enter for new line. @ to mention users or participants.</p>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                    <p className="text-gray-500">Select a channel or DM to start messaging</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
