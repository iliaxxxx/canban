
import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';
import { ChevronDown, Plus, Folder, Trash2, Check, X, Edit2 } from 'lucide-react';
import { storageService } from '../services/storageService';

interface ProjectSelectorProps {
    projects: Project[];
    currentProjectId: string | null;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ projects, currentProjectId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    // Editing State
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    
    const [newProjectName, setNewProjectName] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const currentProject = projects.find(p => p.id === currentProjectId);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsCreating(false);
                setEditingProjectId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSwitch = (id: string) => {
        if (editingProjectId) return; // Prevent switch while editing
        storageService.setActiveProject(id);
        setIsOpen(false);
    };

    const handleCreate = async () => {
        if (!newProjectName.trim()) return;
        await storageService.createProject(newProjectName.trim());
        setNewProjectName('');
        setIsCreating(false);
        setIsOpen(false);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        const proj = projects.find(p => p.id === id);
        // Using window.confirm is safe here. If user confirms, we proceed.
        if (window.confirm(`Вы уверены, что хотите удалить проект "${proj?.name}"? Все задачи будут удалены.`)) {
            // Close menu FIRST to prevent clicking other things
            setIsOpen(false); 
            await storageService.deleteProject(id);
        }
    };

    const handleStartEdit = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingProjectId(project.id);
        setEditName(project.name);
    };

    const handleSaveRename = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (editingProjectId && editName.trim()) {
            await storageService.renameProject(editingProjectId, editName.trim());
            setEditingProjectId(null);
            setEditName('');
        }
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingProjectId(null);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition text-sm font-medium text-zinc-300 hover:text-white border border-transparent hover:border-zinc-700 max-w-[200px]"
            >
                <Folder size={14} className="text-blue-500 shrink-0" />
                <span className="truncate">{currentProject ? currentProject.name : 'Проекты'}</span>
                <ChevronDown size={14} className={`transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#18181b] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-left">
                    <div className="p-2 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/30">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 px-2">Рабочие пространства</span>
                    </div>
                    
                    <div className="max-h-[300px] overflow-y-auto p-1">
                        {projects.map(p => (
                            <div 
                                key={p.id}
                                onClick={() => handleSwitch(p.id)}
                                className={`
                                    relative flex items-center justify-between p-2 rounded-lg cursor-pointer group transition mb-1
                                    ${p.id === currentProjectId ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'hover:bg-zinc-800 text-zinc-300 border border-transparent'}
                                `}
                            >
                                {editingProjectId === p.id ? (
                                    <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                                        <input 
                                            type="text" 
                                            autoFocus
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="flex-1 bg-zinc-900 border border-blue-500/50 rounded px-2 py-1 text-sm text-white outline-none"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSaveRename(e as any);
                                                if (e.key === 'Escape') handleCancelEdit(e as any);
                                            }}
                                        />
                                        <button onClick={handleSaveRename} className="p-1 text-green-400 hover:bg-green-500/10 rounded"><Check size={14} /></button>
                                        <button onClick={handleCancelEdit} className="p-1 text-zinc-500 hover:text-white rounded"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 truncate flex-1">
                                            <Folder size={14} className={p.id === currentProjectId ? 'text-blue-500' : 'text-zinc-600'} />
                                            <span className="font-medium text-sm truncate">{p.name}</span>
                                        </div>
                                        
                                        <div className={`flex items-center gap-1 ${p.id === currentProjectId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                            <button 
                                                onClick={(e) => handleStartEdit(e, p)}
                                                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition"
                                                title="Переименовать"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            
                                            {projects.length > 1 && (
                                                <button 
                                                    onClick={(e) => handleDelete(e, p.id)}
                                                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                                                    title="Удалить"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-2 border-t border-zinc-800 bg-zinc-900/50">
                        {isCreating ? (
                            <div className="flex items-center gap-2 animate-in slide-in-from-bottom-2">
                                <input 
                                    type="text" 
                                    autoFocus
                                    value={newProjectName}
                                    onChange={e => setNewProjectName(e.target.value)}
                                    placeholder="Название..."
                                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                />
                                <button onClick={handleCreate} disabled={!newProjectName} className="p-1.5 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-lg transition"><Check size={14}/></button>
                                <button onClick={() => setIsCreating(false)} className="p-1.5 text-zinc-500 hover:text-white rounded-lg"><X size={14}/></button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsCreating(true)}
                                className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition border border-dashed border-zinc-700 hover:border-zinc-500"
                            >
                                <Plus size={14} /> Создать новый проект
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
