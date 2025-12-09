
import React, { useState } from 'react';
import { TeamMember } from '../types';
import { X, Plus, Trash2, Mail, UserPlus, Users, Copy, Check, Link } from 'lucide-react';

interface TeamModalProps {
    projectId: string; // Added projectId prop
    members: TeamMember[];
    onAddMember: (email: string) => void;
    onRemoveMember: (id: string) => void;
    onClose: () => void;
}

export const TeamModal: React.FC<TeamModalProps> = ({ projectId, members, onAddMember, onRemoveMember, onClose }) => {
    const [email, setEmail] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim()) {
            onAddMember(email.trim());
            setEmail('');
        }
    };

    const handleCopyLink = () => {
        // Generate link with ID
        const baseUrl = window.location.origin;
        const text = `${baseUrl}?invite=${projectId}`;
        
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg bg-[#18181b] border border-zinc-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                            <Users size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Команда проекта</h3>
                            <p className="text-xs text-zinc-400">Участники этого рабочего пространства</p>
                        </div>
                    </div>
                    <button onClick={onClose}><X className="text-zinc-500 hover:text-white" /></button>
                </div>

                {/* Invite Form */}
                <div className="bg-zinc-900/50 p-4 rounded-2xl mb-6 border border-zinc-800 relative z-10">
                     <form onSubmit={handleInvite} className="mb-4">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Добавить по Email</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="colleague@gmail.com"
                                    className="w-full bg-[#09090b] border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500 transition text-sm"
                                    required
                                />
                            </div>
                            <button 
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl font-medium transition flex items-center gap-2"
                            >
                                <UserPlus size={18} />
                                <span className="hidden sm:inline">Добавить</span>
                            </button>
                        </div>
                    </form>

                    <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <div className="bg-blue-500 p-1.5 rounded-full mt-0.5">
                            <Link size={12} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-zinc-300 mb-2">
                                <b>Быстрое приглашение:</b> Скопируйте ссылку ниже. После регистрации пользователь <b>автоматически</b> попадет в этот проект.
                            </p>
                            <button 
                                onClick={handleCopyLink}
                                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                            >
                                {isCopied ? <Check size={14} /> : <Copy size={14} />}
                                {isCopied ? 'Ссылка скопирована!' : 'Скопировать умную ссылку'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 relative z-10 scrollbar-hide">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Участники ({members.length})</label>
                    
                    {members.length === 0 && (
                        <div className="text-center py-6 text-zinc-600 border border-dashed border-zinc-800 rounded-xl text-sm">
                            Команда пока пуста. Добавьте кого-нибудь!
                        </div>
                    )}

                    {members.map(member => (
                        <div key={member.id} className="flex items-center justify-between bg-[#09090b] p-3 rounded-xl border border-zinc-800 group hover:border-zinc-700 transition">
                            <div className="flex items-center gap-3">
                                <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full border border-zinc-700" />
                                <div>
                                    <div className="text-sm font-bold text-white">{member.name}</div>
                                    <div className="text-xs text-zinc-500">{member.email}</div>
                                </div>
                            </div>
                            <button 
                                onClick={() => onRemoveMember(member.id)}
                                className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                                title="Удалить из команды"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
