import React, { useState } from 'react';
import { AutomationRule } from '../types';
import { Bot, Plus, Trash2, Play, Pause, MessageCircle, Send, Instagram, Zap, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface AutomationBuilderProps {
    onClose?: () => void;
}

export const AutomationBuilder: React.FC<AutomationBuilderProps> = ({ onClose }) => {
    // Mock Data for UI demonstration
    const [rules, setRules] = useState<AutomationRule[]>([
        {
            id: '1',
            projectId: 'demo',
            title: 'Выдача Гайда "Система"',
            isActive: true,
            trigger: { type: 'comment_keyword', keywords: ['система', 'хочу гайд', 'system'] },
            action: { type: 'send_dm', text: 'Привет! 🔥 Лови ссылку на гайд: https://instaios.app/guide' },
            stats: { fired: 1240 }
        },
        {
            id: '2',
            projectId: 'demo',
            title: 'Ответ на цену',
            isActive: false,
            trigger: { type: 'dm_keyword', keywords: ['цена', 'сколько стоит', 'прайс'] },
            action: { type: 'send_dm', text: 'Наши тарифы доступны по ссылке в шапке профиля!' },
            stats: { fired: 45 }
        }
    ]);

    const [isConnected, setIsConnected] = useState(false); // Mock connection state
    const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

    // Editing State
    const [editTitle, setEditTitle] = useState('');
    const [editKeywords, setEditKeywords] = useState('');
    const [editResponse, setEditResponse] = useState('');

    const handleConnect = () => {
        // Simulation of OAuth flow
        const width = 600;
        const height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        // Just a visual simulation window
        const popup = window.open("", "Instagram Login", `width=${width},height=${height},top=${top},left=${left}`);
        if(popup) {
            popup.document.write(`
                <body style="background:#f0f2f5; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh;">
                    <div style="text-align:center;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/1024px-Facebook_Logo_%282019%29.png" width="80" style="margin-bottom:20px"/>
                        <h2 style="color:#1c1e21;">Connect InstaiOS to Instagram</h2>
                        <p>Simulating connection...</p>
                    </div>
                    <script>setTimeout(() => { window.close(); }, 1500);</script>
                </body>
            `);
            const timer = setInterval(() => {
                if(popup.closed) {
                    clearInterval(timer);
                    setIsConnected(true);
                }
            }, 500);
        }
    };

    const handleEditRule = (rule: AutomationRule) => {
        setSelectedRuleId(rule.id);
        setEditTitle(rule.title);
        setEditKeywords(rule.trigger.keywords.join(', '));
        setEditResponse(rule.action.text);
    };

    const handleSaveRule = () => {
        if (!selectedRuleId) return;
        setRules(prev => prev.map(r => r.id === selectedRuleId ? {
            ...r,
            title: editTitle,
            trigger: { ...r.trigger, keywords: editKeywords.split(',').map(k => k.trim()) },
            action: { ...r.action, text: editResponse }
        } : r));
        setSelectedRuleId(null);
    };

    const handleAddNew = () => {
        const newRule: AutomationRule = {
            id: Date.now().toString(),
            projectId: 'demo',
            title: 'Новая автоматизация',
            isActive: false,
            trigger: { type: 'comment_keyword', keywords: ['слово'] },
            action: { type: 'send_dm', text: 'Текст ответа...' },
            stats: { fired: 0 }
        };
        setRules([...rules, newRule]);
        handleEditRule(newRule);
    };

    const handleDelete = (id: string) => {
        setRules(prev => prev.filter(r => r.id !== id));
        if (selectedRuleId === id) setSelectedRuleId(null);
    };

    const toggleActive = (id: string) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
    };

    return (
        <div className="max-w-[1200px] mx-auto p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Bot className="text-blue-500" size={32} />
                        Автоматизация (Auto-DM)
                    </h2>
                    <p className="text-zinc-400 text-sm mt-1">Настройте автоответы на комментарии и сообщения.</p>
                </div>
                
                {!isConnected ? (
                    <button 
                        onClick={handleConnect}
                        className="bg-[#1877F2] hover:bg-[#166fe5] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition"
                    >
                        <Instagram size={20} />
                        Подключить Instagram
                    </button>
                ) : (
                    <div className="bg-green-500/10 text-green-400 px-4 py-2 rounded-xl border border-green-500/20 font-bold text-sm flex items-center gap-2">
                        <CheckCircle2 size={16} /> @instaios_user подключен
                    </div>
                )}
            </div>

            {!isConnected ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-[#121214] border border-dashed border-zinc-800 rounded-3xl p-12 text-center">
                    <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                        <Zap size={40} className="text-zinc-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Подключите аккаунт</h3>
                    <p className="text-zinc-400 max-w-md">
                        Чтобы бот мог отвечать на комментарии и отправлять сообщения в Директ, необходимо дать разрешение через Facebook API.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
                    {/* LEFT: Rules List */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
                        <button 
                            onClick={handleAddNew}
                            className="w-full py-3 border border-dashed border-zinc-700 hover:border-blue-500 text-zinc-400 hover:text-white rounded-xl transition flex items-center justify-center gap-2 font-medium"
                        >
                            <Plus size={18} /> Создать правило
                        </button>

                        {rules.map(rule => (
                            <div 
                                key={rule.id}
                                onClick={() => handleEditRule(rule)}
                                className={`p-4 rounded-xl border transition cursor-pointer relative group ${selectedRuleId === rule.id ? 'bg-blue-600/10 border-blue-500' : 'bg-[#121214] border-zinc-800 hover:border-zinc-600'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-white">{rule.title}</h4>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleActive(rule.id); }}
                                        className={`p-1.5 rounded-full transition ${rule.isActive ? 'text-green-400 bg-green-400/10' : 'text-zinc-600 bg-zinc-800'}`}
                                        title={rule.isActive ? 'Активно' : 'Остановлено'}
                                    >
                                        {rule.isActive ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                    </button>
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
                                    {rule.trigger.type === 'comment_keyword' ? <MessageCircle size={12} /> : <Send size={12} />}
                                    <span className="truncate max-w-[150px]">"{rule.trigger.keywords.join(', ')}"</span>
                                    <span className="text-zinc-600">•</span>
                                    <span>{rule.stats.fired} сраб.</span>
                                </div>

                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(rule.id); }}
                                    className="absolute bottom-4 right-4 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* RIGHT: Editor */}
                    <div className="flex-1 bg-[#121214] border border-zinc-800 rounded-3xl p-8 relative">
                        {selectedRuleId ? (
                            <div className="space-y-8 animate-in fade-in">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Название правила</label>
                                    <input 
                                        type="text" 
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className="w-full bg-[#09090b] border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition font-bold text-lg"
                                    />
                                </div>

                                {/* Trigger Section */}
                                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                                    <div className="flex items-center gap-3 mb-4 text-blue-400 font-bold">
                                        <Zap size={20} />
                                        <h3>Если... (Триггер)</h3>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Пользователь написал</label>
                                            <select className="w-full bg-[#09090b] border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none mb-3 text-sm">
                                                <option value="comment">Комментарий под постом/Reels</option>
                                                <option value="dm">Сообщение в Direct</option>
                                                <option value="story">Отметку в Stories</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Содержит ключевые слова</label>
                                            <input 
                                                type="text" 
                                                value={editKeywords}
                                                onChange={e => setEditKeywords(e.target.value)}
                                                placeholder="цена, купить, гайд"
                                                className="w-full bg-[#09090b] border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition font-mono text-sm"
                                            />
                                            <p className="text-[10px] text-zinc-500 mt-2">Разделяйте слова запятыми</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Section */}
                                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                                    <div className="flex items-center gap-3 mb-4 text-purple-400 font-bold">
                                        <Send size={20} />
                                        <h3>То... (Действие)</h3>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Отправить сообщение</label>
                                        <textarea 
                                            value={editResponse}
                                            onChange={e => setEditResponse(e.target.value)}
                                            placeholder="Привет! Вот ссылка..."
                                            rows={4}
                                            className="w-full bg-[#09090b] border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition resize-none text-sm leading-relaxed"
                                        />
                                        <div className="flex justify-between items-center mt-2">
                                             <p className="text-[10px] text-zinc-500">Доступны переменные: {'{name}'}</p>
                                             <button className="text-xs text-blue-400 hover:text-white transition">
                                                + Добавить кнопку-ссылку
                                             </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button 
                                        onClick={handleSaveRule}
                                        className="bg-white text-black hover:bg-zinc-200 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg"
                                    >
                                        <Save size={18} /> Сохранить
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                                <Bot size={48} className="mb-4 opacity-50" />
                                <p>Выберите правило слева или создайте новое</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="mt-8 flex items-start gap-3 p-4 bg-blue-900/10 border border-blue-900/30 rounded-xl">
                 <AlertCircle className="text-blue-400 shrink-0" size={20} />
                 <p className="text-xs text-blue-200/70 leading-relaxed">
                     <b>Техническая справка:</b> Для работы этого модуля в реальном времени требуется подключение Webhooks через Meta Graph API. 
                     В данной демо-версии мы моделируем интерфейс настройки. При деплое на Vercel/Firebase Functions, эти правила будут применяться сервером.
                 </p>
            </div>
        </div>
    );
};