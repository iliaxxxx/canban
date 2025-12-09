
import React, { useState } from 'react';
import { generateContentIdeas, generateStrategicPlan } from '../services/claudeService';
import { Sparkles, Loader2, X, ChevronDown, Mic2, Film, User, Zap, Calendar, Lightbulb, AlertCircle } from 'lucide-react';
import { Task, SocialPlatform } from '../types';

interface AIGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTasks: (tasks: Omit<Task, 'id' | 'columnId' | 'projectId'>[]) => Promise<void>; // Changed to return Promise
}

export const AIGenerator: React.FC<AIGeneratorProps> = ({ isOpen, onClose, onAddTasks }) => {
  const [mode, setMode] = useState<'brainstorm' | 'magic'>('brainstorm');
  
  // Brainstorm State
  const [topic, setTopic] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'all'>('all');
  const [selectedTone, setSelectedTone] = useState<string>('neutral');
  const [reelsFormat, setReelsFormat] = useState<'mix' | 'scenario' | 'talking_head'>('mix');
  
  // Magic State
  const [niche, setNiche] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setError(null);
    
    try {
        const ideas = await generateContentIdeas(topic, niche || 'General', selectedPlatform, selectedTone, reelsFormat);
        
        if (ideas && ideas.length > 0) {
          const newTasks: Omit<Task, 'id' | 'columnId' | 'projectId'>[] = ideas.map((idea) => ({
            title: idea.title,
            description: idea.description,
            platform: idea.platform as SocialPlatform,
          }));
          await onAddTasks(newTasks); // Wait for tasks to be added
          onClose();
          setTopic('');
        } else {
            setError("Не удалось сгенерировать идеи. AI вернул пустой результат.");
        }
    } catch (err) {
        console.error(err);
        setError("Ошибка при сохранении задач. Попробуйте еще раз.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleMagicPlan = async (duration: 'week' | 'month') => {
      if (!niche.trim()) {
          alert("Пожалуйста, укажите вашу нишу для магии ✨");
          return;
      }
      setIsLoading(true);
      setError(null);
      
      try {
          const ideas = await generateStrategicPlan(niche, duration, selectedTone);
          
          if (ideas && ideas.length > 0) {
              const newTasks: Omit<Task, 'id' | 'columnId' | 'projectId'>[] = ideas.map((idea) => ({
                title: idea.title,
                description: idea.description,
                platform: idea.platform as SocialPlatform,
              }));
              await onAddTasks(newTasks);
              onClose();
          } else {
              setError("Не удалось создать стратегию. Проверьте API подключение.");
          }
      } catch (err) {
          console.error(err);
          setError("Ошибка при сохранении стратегии.");
      } finally {
          setIsLoading(false);
      }
  };

  const platforms: { id: SocialPlatform | 'all'; label: string }[] = [
      { id: 'all', label: '🎲 Микс площадок' },
      { id: 'instagram_reels', label: '📸 Insta Reels' },
      { id: 'instagram_post', label: '🖼️ Insta Post' },
      { id: 'telegram', label: '✈️ Telegram' },
      { id: 'tiktok', label: '🎵 TikTok' },
      { id: 'youtube', label: '▶️ YouTube Shorts' },
      { id: 'threads', label: '📝 Threads' },
  ];

  const tones = [
      { id: 'neutral', label: '😐 Нейтральный' },
      { id: 'provocative', label: '🔥 Провокационный (Степанова)' },
      { id: 'empathetic', label: '❤️ Заботливый / Мягкий' },
      { id: 'scientific', label: '🧠 Научный / Экспертный' },
      { id: 'sarcastic', label: '😏 Саркастичный / Живой' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Decorative gradient blob */}
        <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${mode === 'magic' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`} />

        <div className="p-6 pb-0 relative z-10 shrink-0">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    {mode === 'brainstorm' ? (
                        <><Sparkles className="text-blue-500" /> AI Brainstorm</>
                    ) : (
                        <><Zap className="text-purple-500" /> Magic Plan</>
                    )}
                </h2>
                <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
                    <X size={24} />
                </button>
            </div>

            {/* Mode Switcher */}
            <div className="bg-zinc-900 p-1 rounded-xl flex gap-1 mb-6 border border-zinc-800">
                <button 
                    onClick={() => setMode('brainstorm')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${mode === 'brainstorm' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <Lightbulb size={16} /> Идеи
                </button>
                <button 
                    onClick={() => setMode('magic')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${mode === 'magic' ? 'bg-purple-900/20 text-purple-400 shadow-sm border border-purple-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <Zap size={16} /> Авто-план
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 relative z-10 scrollbar-hide">
          {/* SHARED INPUT: NICHE */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Ваша Ниша / Роль
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Например: Фитнес-тренер, Таролог, Дизайнер..."
              className="w-full px-4 py-3 bg-[#09090b] border border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-zinc-600 transition"
            />
          </div>

          <div>
             <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Mic2 size={12} /> Тональность
             </label>
             <div className="relative">
                 <select
                     value={selectedTone}
                     onChange={(e) => setSelectedTone(e.target.value)}
                     className="w-full appearance-none px-4 py-3 bg-[#09090b] border border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white cursor-pointer hover:bg-zinc-900 transition text-sm"
                 >
                     {tones.map(t => (
                         <option key={t.id} value={t.id}>{t.label}</option>
                     ))}
                 </select>
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                     <ChevronDown size={14} />
                 </div>
             </div>
           </div>

          {mode === 'brainstorm' ? (
              // --- BRAINSTORM MODE ---
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                      О чём хотите написать?
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Например: Ошибки новичков..."
                      className="w-full px-4 py-3 bg-[#09090b] border border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-zinc-600 transition"
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                      Площадка
                    </label>
                    <div className="relative">
                        <select
                            value={selectedPlatform}
                            onChange={(e) => setSelectedPlatform(e.target.value as SocialPlatform | 'all')}
                            className="w-full appearance-none px-4 py-3 bg-[#09090b] border border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white cursor-pointer hover:bg-zinc-900 transition text-sm"
                        >
                            {platforms.map(p => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            <ChevronDown size={14} />
                        </div>
                    </div>
                  </div>

                  {/* REELS SPECIFIC FORMAT SELECTOR */}
                  {selectedPlatform === 'instagram_reels' && (
                      <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-top-2">
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                              Формат Reels
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                              <button 
                                  onClick={() => setReelsFormat('mix')}
                                  className={`p-2 rounded-lg text-xs font-medium border transition flex flex-col items-center gap-1 ${reelsFormat === 'mix' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-zinc-800 border-transparent text-zinc-400 hover:text-white'}`}
                              >
                                  <Sparkles size={14} />
                                  Микс
                              </button>
                              <button 
                                  onClick={() => setReelsFormat('scenario')}
                                  className={`p-2 rounded-lg text-xs font-medium border transition flex flex-col items-center gap-1 ${reelsFormat === 'scenario' ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-zinc-800 border-transparent text-zinc-400 hover:text-white'}`}
                              >
                                  <Film size={14} />
                                  Сценарий
                              </button>
                              <button 
                                  onClick={() => setReelsFormat('talking_head')}
                                  className={`p-2 rounded-lg text-xs font-medium border transition flex flex-col items-center gap-1 ${reelsFormat === 'talking_head' ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-zinc-800 border-transparent text-zinc-400 hover:text-white'}`}
                              >
                                  <User size={14} />
                                  Разговорный
                              </button>
                          </div>
                      </div>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={isLoading || !topic.trim()}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Думаю...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Создать идеи
                      </>
                    )}
                  </button>
              </div>
          ) : (
              // --- MAGIC PLAN MODE (Unlocked for all) ---
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 pt-2">
                  <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-2xl">
                      <p className="text-xs text-purple-200 leading-relaxed text-center">
                          <b>Волшебный план:</b> AI создаст сбалансированную стратегию (Reels, Telegram, Posts), чтобы охватить всю вашу аудиторию.
                      </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                       <button
                           onClick={() => handleMagicPlan('week')}
                           disabled={isLoading}
                           className="py-6 bg-gradient-to-br from-[#18181b] to-[#202025] hover:from-[#202025] hover:to-[#25252a] border border-zinc-700 hover:border-blue-500 rounded-2xl flex flex-col items-center gap-2 transition-all group"
                       >
                           <Zap size={24} className="text-blue-500 group-hover:scale-110 transition-transform" />
                           <span className="font-bold text-sm text-zinc-200">На неделю</span>
                           <span className="text-[10px] text-zinc-500">~7 постов</span>
                       </button>

                       <button
                           onClick={() => handleMagicPlan('month')}
                           disabled={isLoading}
                           className="py-6 bg-gradient-to-br from-[#18181b] to-[#202025] hover:from-[#202025] hover:to-[#25252a] border border-zinc-700 hover:border-purple-500 rounded-2xl flex flex-col items-center gap-2 transition-all group"
                       >
                           <Calendar size={24} className="text-purple-500 group-hover:scale-110 transition-transform" />
                           <span className="font-bold text-sm text-zinc-200">На месяц</span>
                           <span className="text-[10px] text-zinc-500">~15 постов</span>
                       </button>
                  </div>
                  
                  {isLoading && (
                      <div className="text-center py-4 text-purple-400 text-sm font-bold animate-pulse flex flex-col items-center gap-2">
                          <Loader2 className="animate-spin" size={24} />
                          <span>Создаю магию...</span>
                      </div>
                  )}
              </div>
          )}
          
          {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                  <AlertCircle size={16} /> {error}
              </div>
          )}
          
        </div>
      </div>
    </div>
  );
};
