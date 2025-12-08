
import React, { useState, useRef, useEffect } from 'react';
import { Task, SocialPlatform } from '../types';
import { MoreHorizontal, Send, Music2, Youtube, AtSign, Play, StickyNote, Film, Images, Sparkles, Calendar, CheckCircle2, Settings, Trash2, Zap } from 'lucide-react';

interface KanbanCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onClick: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onRepurpose?: (task: Task) => void;
  progress?: number; // 0 to 100, or undefined if not generating
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ task, onDragStart, onClick, onDelete, onRepurpose, progress }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);
  
  const getPlatformConfig = (platform: SocialPlatform) => {
    switch (platform) {
      case 'instagram_reels':
        return {
          gradient: 'bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]',
          icon: <Film size={16} className="text-white" />,
          label: 'Insta Reels',
          textColor: 'text-white',
          descColor: 'text-white/90'
        };
      case 'instagram_post':
        return {
          gradient: 'bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]',
          icon: <Images size={16} className="text-white" />,
          label: 'Insta Post',
          textColor: 'text-white',
          descColor: 'text-white/90'
        };
      case 'telegram':
        return {
          gradient: 'bg-[#229ED9]',
          icon: <Send size={16} className="text-white" />,
          label: 'Telegram',
          textColor: 'text-white',
          descColor: 'text-white/90'
        };
      case 'tiktok':
        return {
          gradient: 'bg-[#000000] border border-[#2af0ea]',
          icon: <Music2 size={16} className="text-[#ff0050]" />,
          label: 'TikTok',
          textColor: 'text-white',
          descColor: 'text-zinc-400'
        };
      case 'youtube':
        return {
          gradient: 'bg-[#ff0000]',
          icon: <Youtube size={16} className="text-white" />,
          label: 'Shorts',
          textColor: 'text-white',
          descColor: 'text-white/90'
        };
      case 'threads':
        return {
          gradient: 'bg-[#101010] border border-zinc-700',
          icon: <AtSign size={16} className="text-white" />,
          label: 'Threads',
          textColor: 'text-white',
          descColor: 'text-zinc-400'
        };
      case 'custom':
        return {
            gradient: 'bg-[#27272a] border border-zinc-700/50',
            icon: <StickyNote size={16} className="text-zinc-400" />,
            label: 'Заметка',
            textColor: 'text-zinc-100',
            descColor: 'text-zinc-400'
        };
      default:
        return {
          gradient: 'bg-zinc-800',
          icon: <Play size={16} />,
          label: 'Content',
          textColor: 'text-white',
          descColor: 'text-zinc-400'
        };
    }
  };

  const config = getPlatformConfig(task.platform);

  // Format Date (e.g., 2023-10-25 -> 25.10)
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  // Helper to strip Markdown for preview
  const getCleanDescription = (text?: string) => {
      if (!text) return '';
      // Remove **bold** markers but keep text
      let clean = text.replace(/\*\*(.*?)\*\*/g, '$1');
      // Remove ## Headers
      clean = clean.replace(/#{1,6}\s?/g, '');
      // Remove [Link](url) keeping Link
      clean = clean.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
      return clean;
  };

  const formattedDate = formatDate(task.date);
  const cleanDesc = getCleanDescription(task.description);
  const isGenerating = progress !== undefined;

  return (
    <div
      draggable={!showMenu} // Disable dragging when menu open
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => !showMenu && onClick(task)}
      className={`
        relative group p-4 rounded-[1.5rem] shadow-lg cursor-pointer
        flex flex-col gap-2 min-h-[120px]
        ${config.gradient}
        ${showMenu ? 'z-[100] scale-100' : 'z-0 transform transition-all duration-200 hover:-translate-y-1 hover:shadow-xl'}
      `}
      style={{
          // Force high z-index and remove constraints when menu is open
          zIndex: showMenu ? 100 : 'auto', 
          overflow: 'visible' 
      }}
    >
      {/* Loading / Progress Overlay */}
      {isGenerating && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center flex-col gap-3 text-white animate-in fade-in duration-300 rounded-[1.5rem] overflow-hidden">
            {progress === 100 ? (
                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                    <CheckCircle2 size={32} className="text-green-400 mb-2" />
                    <span className="text-sm font-bold">Готово!</span>
                </div>
            ) : (
                <>
                    <div className="relative w-16 h-16 flex items-center justify-center">
                         <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                         <div 
                            className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent animate-spin"
                            style={{ borderTopColor: '#3b82f6', borderRightColor: '#3b82f6' }}
                         ></div>
                         <span className="font-bold text-lg font-mono">{progress}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-300 animate-pulse">
                        <Sparkles size={12} className="text-yellow-400" />
                        {task.platform === 'instagram_post' ? 'СОЗДАЮ СЛАЙДЫ...' : 'ПИШУ СЦЕНАРИЙ...'}
                    </div>
                </>
            )}
        </div>
      )}

      {/* Platform Header */}
      <div className="flex items-center justify-between mb-0.5 relative z-10">
        <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full">
                {config.icon}
                <span className={`text-[10px] uppercase tracking-wider font-bold ${config.textColor} opacity-90`}>{config.label}</span>
            </div>
            
            {/* Date Badge */}
            {formattedDate && (
                <div className="flex items-center gap-1 bg-black/20 backdrop-blur-md px-2 py-1 rounded-full text-white/90">
                    <Calendar size={10} />
                    <span className="text-[10px] font-bold">{formattedDate}</span>
                </div>
            )}
        </div>

        {/* Dropdown Menu */}
        <div className="relative" ref={menuRef}>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                }}
                className={`transition-all duration-200 p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white ${showMenu ? 'opacity-100 bg-black/60 shadow-inner' : 'opacity-0 group-hover:opacity-100'}`}
            >
                <MoreHorizontal size={14} />
            </button>

            {showMenu && (
                <div 
                    className="absolute right-0 top-8 mt-2 w-52 bg-[#09090b] border border-zinc-600 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,1)] z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right ring-1 ring-white/10"
                    onClick={(e) => e.stopPropagation()}
                >
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(false);
                                if (onRepurpose) onRepurpose(task);
                            }}
                            className="w-full text-left px-4 py-3.5 text-xs font-bold text-yellow-400 hover:bg-zinc-800 flex items-center gap-3 transition-colors border-b border-zinc-800"
                        >
                            <Zap size={14} fill="currentColor" />
                            Repurpose (AI)
                        </button>
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(false);
                                onClick(task);
                            }}
                            className="w-full text-left px-4 py-3.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
                        >
                            <Settings size={14} className="text-zinc-400" />
                            Настройки
                        </button>
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(false);
                                onDelete(task.id);
                            }}
                            className="w-full text-left px-4 py-3.5 text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                        >
                            <Trash2 size={14} />
                            Удалить
                        </button>
                </div>
            )}
        </div>
      </div>

      {/* Content Preview */}
      <div className={`relative z-10 flex-1 flex flex-col ${showMenu ? 'opacity-30 blur-[1px]' : ''} transition-all`}>
        <h3 className={`font-bold text-sm leading-snug mb-2 ${config.textColor}`}>
            {getCleanDescription(task.title) || 'Новая задача'}
        </h3>
        
        {cleanDesc && (
            <p className={`text-[11px] line-clamp-4 leading-relaxed font-medium ${config.descColor}`}>
                {cleanDesc}
            </p>
        )}
      </div>
    </div>
  );
};
