
import React, { useState, useRef, useEffect } from 'react';
import { Task, ColumnId, SocialPlatform, Competitor, Slide, User, Column, TeamMember, Project, DEFAULT_COLUMNS } from './types';
import { KanbanCard } from './components/KanbanCard';
import { AIGenerator } from './components/AIGenerator';
import { CompetitorView } from './components/CompetitorView';
import { CarouselMaker } from './components/CarouselMaker';
import { CalendarView } from './components/CalendarView';
import { AuthScreen } from './components/AuthScreen';
import { BoardEditor } from './components/BoardEditor';
import { TeamModal } from './components/TeamModal';
import { ProjectSelector } from './components/ProjectSelector';
import { storageService } from './services/storageService';
import { generateContentScript, generateCarouselSlides, repurposeContent } from './services/claudeService';
import { Layout, Search, Settings, Send, Music2, Youtube, AtSign, StickyNote, Plus, X, Trash2, Film, Images, Sparkles, Calendar, LogOut, UserPlus, Users, Edit3, Flame, Wifi, Zap, RefreshCw, WifiOff, PenLine, Eye } from 'lucide-react';

interface TaskDetailsModalProps {
    task: Task;
    onClose: () => void;
    onUpdate: (taskId: string, updates: Partial<Task>) => void;
    onDelete: (taskId: string) => void;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, onClose, onUpdate, onDelete }) => {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [date, setDate] = useState(task.date || '');
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (title !== task.title || description !== task.description || date !== task.date) {
                onUpdate(task.id, { title, description, date });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [title, description, date, task.id, task.title, task.description, task.date, onUpdate]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [description, isEditing]);

    const getPlatformStyles = (p: SocialPlatform) => {
        switch(p) {
            case 'instagram_reels': return { color: 'text-pink-500', icon: <Film />, label: 'Instagram Reels' };
            case 'instagram_post': return { color: 'text-pink-500', icon: <Images />, label: 'Instagram Post' };
            case 'telegram': return { color: 'text-blue-400', icon: <Send />, label: 'Telegram' };
            case 'tiktok': return { color: 'text-cyan-400', icon: <Music2 />, label: 'TikTok' };
            case 'youtube': return { color: 'text-red-500', icon: <Youtube />, label: 'Shorts' };
            case 'threads': return { color: 'text-white', icon: <AtSign />, label: 'Threads' };
            default: return { color: 'text-zinc-400', icon: <StickyNote />, label: 'Заметка' };
        }
    };
    const style = getPlatformStyles(task.platform);

    const renderMarkdown = (text: string) => {
        if (!text) return <span className="text-zinc-500 italic">Нет описания...</span>;
        return text.split('\n').map((line, index) => {
            if (line.trim().startsWith('###')) return <h3 key={index} className="text-lg font-bold text-white mt-4 mb-2">{line.replace(/###/g, '').trim()}</h3>;
            if (line.trim().startsWith('##')) return <h2 key={index} className="text-xl font-bold text-blue-400 mt-6 mb-3">{line.replace(/##/g, '').trim()}</h2>;
            if (line.trim().startsWith('**') && line.trim().endsWith('**')) return <div key={index} className="font-bold text-white mt-2 mb-1">{line.replace(/\*\*/g, '')}</div>;
            if (line.trim().startsWith('- ')) {
                const content = line.trim().substring(2);
                return (
                    <div key={index} className="flex gap-2 ml-2 mb-1">
                        <span className="text-blue-500">•</span>
                        <span className="text-zinc-300">{content}</span>
                    </div>
                );
            }
            return <p key={index} className="text-zinc-300 mb-2 leading-relaxed">{line}</p>;
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-2xl bg-[#18181b] border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 ${style.color}`}>{style.icon}<span className="font-bold text-lg capitalize hidden sm:block">{style.label}</span></div>
                        <div className="relative group bg-zinc-800 hover:bg-zinc-700 transition rounded-full px-3 py-1.5 flex items-center gap-2 cursor-pointer">
                             <Calendar size={16} className="text-zinc-400 group-hover:text-white" />
                             <span className="text-sm font-medium text-zinc-300 group-hover:text-white">{date ? new Date(date).toLocaleDateString('ru-RU') : 'Выбрать дату'}</span>
                             <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-full transition ${isEditing ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title={isEditing ? 'Просмотр' : 'Редактировать'}>{isEditing ? <Eye size={20} /> : <PenLine size={20} />}</button>
                        <button onClick={() => { onDelete(task.id); onClose(); }} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition" title="Удалить"><Trash2 size={20} /></button>
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition"><X size={24} /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                    <div className="mb-6"><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название задачи" className="w-full bg-transparent text-3xl font-bold text-white placeholder-zinc-600 outline-none border-none p-0 focus:ring-0" /></div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between"><label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">{isEditing ? 'Редактор' : 'Сценарий / Контент'}</label></div>
                        {isEditing ? (
                            <textarea ref={textareaRef} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Опишите идею, сценарий или текст поста..." className="w-full bg-zinc-900/50 rounded-xl p-4 text-base text-zinc-300 placeholder-zinc-700 outline-none border border-zinc-800 resize-none min-h-[300px] focus:ring-1 focus:ring-blue-500 leading-relaxed font-mono" />
                        ) : (
                            <div className="w-full min-h-[200px] text-base cursor-text pb-10" onClick={() => setIsEditing(true)}>{renderMarkdown(description)}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AddTaskFooter: React.FC<{ columnId: ColumnId, onAdd: (col: ColumnId, p: SocialPlatform) => void }> = ({ columnId, onAdd }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); }
        document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const handleSelect = (platform: SocialPlatform) => { onAdd(columnId, platform); setIsOpen(false); };
    const options: { id: SocialPlatform; label: string; icon: React.ReactNode; color: string }[] = [
        { id: 'custom', label: 'Заметка', icon: <StickyNote size={18} />, color: 'bg-zinc-700' },
        { id: 'instagram_reels', label: 'Insta Reels', icon: <Film size={18} />, color: 'bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]' },
        { id: 'instagram_post', label: 'Insta Post', icon: <Images size={18} />, color: 'bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]' },
        { id: 'telegram', label: 'Telegram', icon: <Send size={18} />, color: 'bg-[#229ED9]' },
        { id: 'tiktok', label: 'TikTok', icon: <Music2 size={18} />, color: 'bg-black border border-cyan-400' },
        { id: 'youtube', label: 'Shorts', icon: <Youtube size={18} />, color: 'bg-[#ff0000]' },
        { id: 'threads', label: 'Threads', icon: <AtSign size={18} />, color: 'bg-[#101010]' },
    ];
    if (isOpen) {
        return (
            <div ref={containerRef} className="p-3 border-t border-zinc-800/50 bg-[#121214] rounded-b-[2rem]">
                <div className="flex items-center justify-between mb-2 px-1"><span className="text-xs font-semibold text-zinc-400">Выберите тип</span><button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white"><X size={14} /></button></div>
                <div className="grid grid-cols-2 gap-2">{options.map((opt) => (<button key={opt.id} onClick={() => handleSelect(opt.id)} className="flex items-center gap-2 p-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition group"><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm ${opt.color} group-hover:scale-110 transition-transform`}>{opt.icon}</div><span className="text-xs font-medium text-zinc-300">{opt.label}</span></button>))}</div>
            </div>
        );
    }
    return <div className="p-3 border-t border-zinc-800/50 bg-[#121214] rounded-b-[2rem]"><button onClick={() => setIsOpen(true)} className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-zinc-300 transition flex items-center justify-center gap-2 text-sm font-medium"><Plus size={16} /> Добавить задачу</button></div>;
};

type ViewMode = 'board' | 'calendar' | 'competitors' | 'carousel_maker';

const COLUMN_PRIORITY: Record<string, number> = {
  'ideas': 0,
  'scripting': 1,
  'filming': 2,
  'done': 3
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(storageService.getCurrentUser());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>(storageService.getLocalProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(storageService.getActiveProjectId());

  const [currentView, setCurrentView] = useState<ViewMode>('board');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isBoardEditorOpen, setIsBoardEditorOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isOnline, setIsOnline] = useState(storageService.isOnline());
  const [activeCarouselTask, setActiveCarouselTask] = useState<Task | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState<Record<string, number>>({});
  const [isRepurposing, setIsRepurposing] = useState(false);

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const inviteId = params.get('invite');
      if (inviteId) {
          sessionStorage.setItem('pending_invite_project', inviteId);
          window.history.replaceState({}, '', window.location.pathname);
      }
      const user = storageService.getCurrentUser();
      if (user) {
          setCurrentUser(user);
          const pendingInvite = sessionStorage.getItem('pending_invite_project');
          if (pendingInvite) {
              storageService.joinProject(pendingInvite).then(() => sessionStorage.removeItem('pending_invite_project'));
          }
      }
      const unsubscribeConnection = storageService.subscribeToConnectionStatus(setIsOnline);
      const unsubscribeProjects = storageService.subscribeToProjects(setProjects);
      const unsubscribeActiveProject = storageService.subscribeToActiveProject(setActiveProjectId);
      return () => { unsubscribeConnection(); unsubscribeProjects(); unsubscribeActiveProject(); };
  }, []);
  
  useEffect(() => {
      if (!activeProjectId) return;
      const unsubscribeTasks = storageService.subscribeToTasks(setTasks);
      const unsubscribeColumns = storageService.subscribeToColumns(setColumns);
      const unsubscribeCompetitors = storageService.subscribeToCompetitors(setCompetitors);
      const unsubscribeTeam = storageService.subscribeToTeam(setTeamMembers);
      return () => { unsubscribeTasks(); unsubscribeColumns(); unsubscribeCompetitors(); unsubscribeTeam(); };
  }, [activeProjectId]);

  // Fail-Safe: Ensure active project is valid
  useEffect(() => {
      if (projects.length > 0 && !activeProjectId) {
           storageService.setActiveProject(projects[0].id);
      }
  }, [projects, activeProjectId]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setActiveTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault(); 

  const handleDrop = async (e: React.DragEvent, targetColumnId: ColumnId) => {
    e.preventDefault();
    if (!activeTaskId) return;
    const task = tasks.find(t => t.id === activeTaskId);
    if (!task) return;
    const sourceColumnId = task.columnId;

    // Optimistic Update
    const updatedTask = { ...task, columnId: targetColumnId };
    setTasks(prev => prev.map(t => t.id === activeTaskId ? updatedTask : t));
    storageService.updateTask(activeTaskId, { columnId: targetColumnId });
    setActiveTaskId(null);

    // AI Generation Trigger
    if (sourceColumnId === 'ideas' && targetColumnId === 'scripting' && task.platform !== 'custom') {
        // Avoid re-generation if script exists (Length > 50 chars as heuristic)
        if (task.description && task.description.length > 50) return;

        setTaskProgress(prev => ({ ...prev, [task.id]: 0 }));
        const progressInterval = setInterval(() => {
            setTaskProgress(prev => {
                const current = prev[task.id] || 0;
                return current >= 90 ? prev : { ...prev, [task.id]: current + (Math.random() * 10) };
            });
        }, 500);
        
        try {
            if (task.platform === 'instagram_post') {
                const slides = await generateCarouselSlides(task.title);
                const slidesWithIds = slides.map((s, i) => ({ ...s, id: i.toString() }));
                clearInterval(progressInterval);
                setTaskProgress(prev => ({ ...prev, [task.id]: 100 }));
                await storageService.updateTask(task.id, { description: 'Слайды готовы!', carouselSlides: slidesWithIds });
            } else {
                const script = await generateContentScript(task);
                clearInterval(progressInterval);
                setTaskProgress(prev => ({ ...prev, [task.id]: 100 }));
                await storageService.updateTask(task.id, { description: script });
            }
            setTimeout(() => setTaskProgress(prev => { const next = { ...prev }; delete next[task.id]; return next; }), 1000);
        } catch (error) {
            console.error("Content generation failed", error);
            clearInterval(progressInterval);
            setTaskProgress(prev => { const next = { ...prev }; delete next[task.id]; return next; });
        }
    }
  };

  const addTask = async (columnId: ColumnId, platform: SocialPlatform) => {
    if (!activeProjectId) return;
    const newTask: Task = {
      id: Date.now().toString(), 
      projectId: activeProjectId,
      title: '',
      description: '',
      columnId,
      platform,
      authorId: currentUser?.id
    };
    await storageService.addTask(newTask);
  };

  const handleSaveCarousel = async (title: string, slides: Slide[]) => {
      if (!activeProjectId) return;
      const newTask: Task = {
        id: Date.now().toString(),
        projectId: activeProjectId,
        title: title || 'Новая карусель',
        description: 'Черновик карусели',
        columnId: 'ideas',
        platform: 'instagram_post',
        carouselSlides: slides,
        authorId: currentUser?.id,
        date: new Date().toISOString()
      };
      await storageService.addTask(newTask);
      setActiveCarouselTask(newTask);
  };

  const handleDeleteTask = (taskId: string) => {
    storageService.deleteTask(taskId);
    if (selectedTask?.id === taskId) setSelectedTask(null);
  };
  
  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => storageService.updateTask(taskId, updates);
  const handleUpdateTaskSlides = (taskId: string, slides: Slide[]) => storageService.updateTask(taskId, { carouselSlides: slides });

  const handleAddAITasks = async (newTasks: Omit<Task, 'id' | 'columnId' | 'projectId'>[]) => {
      if (!activeProjectId) return;
      for (const t of newTasks) {
          await storageService.addTask({
              ...t, id: Date.now().toString() + Math.random(), columnId: 'ideas', projectId: activeProjectId, authorId: currentUser?.id
          } as Task);
      }
  };
  
  const handleCardClick = (task: Task) => {
      if (taskProgress[task.id] !== undefined) return;
      if (task.platform === 'instagram_post') { setActiveCarouselTask(task); setCurrentView('carousel_maker'); } else { setSelectedTask(task); }
  };

  const handleRepurposeTask = async (task: Task) => {
      setIsRepurposing(true);
      const repurposedIdeas = await repurposeContent(task);
      if (repurposedIdeas.length > 0) { await handleAddAITasks(repurposedIdeas.map(idea => ({ ...idea, platform: idea.platform as SocialPlatform }))); }
      setIsRepurposing(false);
  };

  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description?.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const sortedColumns = [...columns].sort((a, b) => {
      // Use systemId for priority check, falling back to id (offline mode)
      const idA = a.systemId || a.id;
      const idB = b.systemId || b.id;
      
      const priorityA = COLUMN_PRIORITY[idA] !== undefined ? COLUMN_PRIORITY[idA] : 99;
      const priorityB = COLUMN_PRIORITY[idB] !== undefined ? COLUMN_PRIORITY[idB] : 99;
      
      return priorityA - priorityB;
  });

  const handleResetApp = async () => { await storageService.logout(); setCurrentUser(null); setActiveProjectId(null); setProjects([]); setTasks([]); };
  if (!currentUser) return <AuthScreen onLogin={setCurrentUser} />;
  const isWorkspaceReady = !!activeProjectId;

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden flex flex-col font-sans selection:bg-blue-500/30">
      <nav className="border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20"><Layout className="text-white" size={20} /></div>
                <div><h1 className="text-sm font-bold tracking-tight text-zinc-400 flex items-center gap-2">InstaiOS <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded font-bold">BETA</span></h1><ProjectSelector projects={projects} currentProjectId={activeProjectId} /></div>
             </div>
             <div className="w-px h-8 bg-zinc-800 hidden md:block"></div>
             <div className="hidden md:flex bg-[#18181b] p-1 rounded-full border border-zinc-800">
                <button onClick={() => { setCurrentView('board'); setActiveCarouselTask(null); }} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${currentView === 'board' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}>Доска</button>
                <button onClick={() => { setCurrentView('calendar'); setActiveCarouselTask(null); }} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${currentView === 'calendar' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}>Календарь</button>
                <button onClick={() => setCurrentView('competitors')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${currentView === 'competitors' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}>Конкуренты</button>
                <button onClick={() => { setCurrentView('carousel_maker'); setActiveCarouselTask(null); }} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${currentView === 'carousel_maker' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}>Карусели</button>
             </div>
          </div>
          <div className="flex items-center gap-4">
             {isOnline ? (<div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full text-xs font-bold border border-green-500/20 animate-in fade-in"><Wifi size={12} /> Online</div>) : (<div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-full text-xs font-bold border border-orange-500/20 animate-in fade-in"><WifiOff size={12} /> Offline Mode</div>)}
            <div className="hidden lg:flex items-center -space-x-2 mr-2">
                <img src={currentUser.avatarUrl} alt="Me" className="w-8 h-8 rounded-full border-2 border-[#09090b] shadow-sm z-10" />
                {teamMembers.map((member) => (<img key={member.id} src={member.avatarUrl} alt={member.name} className="w-8 h-8 rounded-full border-2 border-[#09090b] shadow-sm bg-zinc-800" title={member.email} />))}
                <button onClick={() => setIsTeamModalOpen(true)} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-[#09090b] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition z-20"><UserPlus size={14} /></button>
            </div>
            {currentView === 'board' && (<div className="hidden xl:flex items-center bg-[#18181b] rounded-full px-4 py-2 border border-zinc-800 focus-within:border-blue-500 transition-colors w-64"><Search size={16} className="text-zinc-500 mr-2" /><input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm w-full placeholder-zinc-600"/></div>)}
            <div className="flex items-center gap-2">
                <button onClick={() => setIsBoardEditorOpen(true)} className="p-2.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"><Edit3 size={20} /></button>
                <button onClick={handleResetApp} className="p-2.5 text-zinc-400 hover:text-red-400 rounded-full hover:bg-red-500/10 transition"><LogOut size={20} /></button>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 overflow-x-auto relative">
        {isRepurposing && (
             <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in"><div className="bg-[#18181b] p-6 rounded-3xl border border-zinc-800 flex flex-col items-center gap-4 shadow-2xl"><div className="relative"><div className="w-16 h-16 rounded-full border-4 border-t-blue-500 border-zinc-800 animate-spin"></div><Zap className="absolute inset-0 m-auto text-yellow-400 animate-pulse" fill="currentColor" size={24} /></div><div className="text-center"><h3 className="font-bold text-white text-lg">AI Репакинг контента</h3><p className="text-zinc-400 text-sm">Создаю адаптации...</p></div></div></div>
        )}
        {!isWorkspaceReady && (
            <div className="flex-1 flex items-center justify-center"><div className="flex flex-col items-center gap-4 text-zinc-500"><div className="w-12 h-12 border-4 border-t-blue-500 border-zinc-800 rounded-full animate-spin"></div><p>Загрузка рабочего пространства...</p><button onClick={handleResetApp} className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm transition">Сбросить</button></div></div>
        )}
        {isWorkspaceReady && currentView === 'board' && (
            <div className="p-6 h-full"><div className="min-w-[1200px] max-w-[1800px] mx-auto h-full grid gap-6" style={{ gridTemplateColumns: `repeat(${sortedColumns.length}, minmax(300px, 1fr))` }}>
                {sortedColumns.map((col) => (
                    <div key={col.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)} className="flex flex-col h-full rounded-[2rem] bg-[#121214] border border-zinc-800/50">
                        <div className="p-5 flex flex-col gap-3 border-b border-zinc-800/50">
                            <div className="flex items-center justify-between"><div className="flex items-center gap-3"><h2 className="font-bold text-gray-200 text-lg">{col.title}</h2><span className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400 font-mono">{filteredTasks.filter((t) => t.columnId === col.id).length}</span></div></div>
                            {/* Check both ID (offline) and systemId (online) */}
                            {(col.id === 'ideas' || col.systemId === 'ideas') && (<button onClick={() => setIsAIModalOpen(true)} className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 group"><Sparkles size={16} className="group-hover:animate-pulse" /> Брейншторм</button>)}
                        </div>
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-hide">
                            {filteredTasks.filter((task) => task.columnId === col.id).map((task) => (<KanbanCard key={task.id} task={task} onDragStart={handleDragStart} onClick={handleCardClick} onDelete={handleDeleteTask} onRepurpose={handleRepurposeTask} progress={taskProgress[task.id] !== undefined ? Math.round(taskProgress[task.id]) : undefined} />))}
                            {filteredTasks.filter((t) => t.columnId === col.id).length === 0 && (<div className="h-32 border-2 border-dashed border-zinc-800/50 rounded-3xl flex items-center justify-center text-zinc-600 text-sm">Пусто...</div>)}
                        </div>
                        <AddTaskFooter columnId={col.id} onAdd={addTask} />
                    </div>
                ))}
            </div></div>
        )}
        {isWorkspaceReady && currentView === 'calendar' && <CalendarView tasks={tasks} onUpdateTaskDate={(id, date) => handleUpdateTask(id, { date })} onNavigateToTask={handleCardClick} />}
        {isWorkspaceReady && currentView === 'competitors' && <CompetitorView competitors={competitors} setCompetitors={setCompetitors} onAddTasks={handleAddAITasks} onNavigateToBoard={() => setCurrentView('board')} />}
        {isWorkspaceReady && currentView === 'carousel_maker' && <CarouselMaker activeTask={activeCarouselTask} onUpdateTask={handleUpdateTaskSlides} onBack={() => { setCurrentView('board'); setActiveCarouselTask(null); }} libraryTasks={tasks.filter(t => t.platform === 'instagram_post')} onSaveNew={handleSaveCarousel} onSelectTask={setActiveCarouselTask} />}
      </main>
      <AIGenerator isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} onAddTasks={handleAddAITasks} />
      {selectedTask && <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />}
      {isBoardEditorOpen && <BoardEditor columns={columns} setColumns={(cols) => storageService.saveColumns(cols)} onClose={() => setIsBoardEditorOpen(false)} />}
      {isTeamModalOpen && activeProjectId && <TeamModal projectId={activeProjectId} members={teamMembers} onAddMember={(email) => storageService.addTeamMember(email)} onRemoveMember={(id) => storageService.removeTeamMember(id)} onClose={() => setIsTeamModalOpen(false)} />}
    </div>
  );
}
