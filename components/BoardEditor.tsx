
import React, { useState } from 'react';
import { Column, ColumnId } from '../types';
import { X, Plus, GripVertical, Check, Trash2 } from 'lucide-react';
import { storageService } from '../services/storageService';

interface BoardEditorProps {
    columns: Column[];
    setColumns: (cols: Column[]) => void;
    onClose: () => void;
}

export const BoardEditor: React.FC<BoardEditorProps> = ({ columns, setColumns, onClose }) => {
    const [editedColumns, setEditedColumns] = useState<Column[]>([...columns]);
    const [newColName, setNewColName] = useState('');

    const handleNameChange = (id: ColumnId, name: string) => {
        setEditedColumns(prev => prev.map(c => c.id === id ? { ...c, title: name } : c));
    };

    const handleDelete = (id: ColumnId) => {
        setEditedColumns(prev => prev.filter(c => c.id !== id));
    };

    const handleAdd = () => {
        if (!newColName.trim()) return;
        const currentProjectId = storageService.getActiveProjectId();
        if (!currentProjectId) return;

        const newCol: Column = {
            id: `col_${Date.now()}`,
            projectId: currentProjectId,
            title: newColName,
            color: 'bg-zinc-800'
        };
        setEditedColumns([...editedColumns, newCol]);
        setNewColName('');
    };

    const handleSave = () => {
        setColumns(editedColumns);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg bg-[#18181b] border border-zinc-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Настройка доски</h3>
                    <button onClick={onClose}><X className="text-zinc-500 hover:text-white" /></button>
                </div>

                <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto">
                    {editedColumns.map((col, index) => (
                        <div key={col.id} className="flex items-center gap-3 bg-[#09090b] p-3 rounded-xl border border-zinc-800">
                             <GripVertical className="text-zinc-600 cursor-grab" size={18} />
                             <input 
                                type="text" 
                                value={col.title}
                                onChange={(e) => handleNameChange(col.id, e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-white text-sm font-medium"
                            />
                             {/* Don't allow deleting the first column (Ideas) to avoid logic breakage */}
                             {col.id !== 'ideas' && (
                                <button onClick={() => handleDelete(col.id)} className="text-zinc-600 hover:text-red-400">
                                    <Trash2 size={16} />
                                </button>
                             )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-2 mb-8">
                    <input 
                        type="text" 
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        placeholder="Название новой колонки..."
                        className="flex-1 bg-[#09090b] border border-zinc-700 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button 
                        onClick={handleAdd}
                        disabled={!newColName.trim()}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 rounded-xl disabled:opacity-50"
                    >
                        <Plus />
                    </button>
                </div>

                <button 
                    onClick={handleSave}
                    className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition flex items-center justify-center gap-2"
                >
                    <Check size={18} /> Сохранить изменения
                </button>
            </div>
        </div>
    );
};
