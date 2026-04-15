'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Send, X, Sparkles, Loader2, User, Bot,
    Minimize2, Maximize2
} from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function DoriChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => { if (isOpen && !isMinimized) inputRef.current?.focus(); }, [isOpen, isMinimized]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input.trim(), timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/dori', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                }),
            });

            if (!response.ok) throw new Error('Failed');
            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.message, timestamp: new Date() }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again.", timestamp: new Date() }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickQuestion = (q: string) => {
        setInput(q);
        setTimeout(() => handleSubmit(), 100);
    };

    const quickQuestions = [
        "How many active participants do I have?",
        "Who has overdue reports?",
        "Show me recent referrals",
        "What's the invoice summary?",
    ];

    // Closed — floating button
    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-ddor-blue text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50 group"
                title="Ask Dori">
                <div className="relative">
                    <Sparkles className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-ddor-teal rounded-full border-2 border-white" />
                </div>
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Ask Dori about your data
                </span>
            </button>
        );
    }

    // Minimized
    if (isMinimized) {
        return (
            <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-xl border z-50 w-72">
                <div className="flex items-center justify-between p-3 bg-ddor-navy text-white rounded-t-lg cursor-pointer" onClick={() => setIsMinimized(false)}>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-ddor-teal" />
                        <span className="font-medium">Dori</span>
                        {messages.length > 0 && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{messages.length} msgs</span>}
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }} className="p-1 hover:bg-white/20 rounded"><Maximize2 className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-1 hover:bg-white/20 rounded"><X className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
        );
    }

    // Full chat
    return (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-xl shadow-2xl border z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-ddor-navy text-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-ddor-teal/30 rounded-full flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-ddor-teal" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Dori</h3>
                        <p className="text-xs text-blue-200">DDOR Intelligence</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/20 rounded-lg" title="Minimize"><Minimize2 className="w-4 h-4" /></button>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg" title="Close"><X className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-16 h-16 bg-ddor-blue/10 rounded-full flex items-center justify-center mb-4">
                            <Sparkles className="w-8 h-8 text-ddor-blue" />
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">Ask me anything!</h4>
                        <p className="text-sm text-gray-500 mb-6">I can look up clients, reports, referrals, invoices, notes, and more.</p>
                        <div className="space-y-2 w-full">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Quick questions</p>
                            {quickQuestions.map((q, i) => (
                                <button key={i} onClick={() => handleQuickQuestion(q)}
                                    className="w-full text-left text-sm p-3 bg-white rounded-lg border hover:border-ddor-blue hover:bg-blue-50/50 transition-colors">
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 bg-ddor-navy rounded-full flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4 text-ddor-teal" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-ddor-blue text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm border rounded-bl-sm'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-gray-600" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 bg-ddor-navy rounded-full flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-4 h-4 text-ddor-teal" />
                                </div>
                                <div className="bg-white p-3 rounded-xl rounded-bl-sm shadow-sm border">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Searching DDOR data...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
                <div className="flex gap-2">
                    <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                        placeholder="Ask about clients, reports, invoices..."
                        className="flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-ddor-blue focus:border-ddor-blue text-sm"
                        disabled={isLoading} />
                    <button type="submit" disabled={!input.trim() || isLoading}
                        className="px-4 py-2.5 bg-ddor-blue text-white rounded-lg hover:bg-[#156090] disabled:opacity-50 transition-all">
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                    Try: "Does Joseph have overdue reports?" or "How many SUD clients?"
                </p>
            </form>
        </div>
    );
}
