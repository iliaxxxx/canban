
import React, { useState } from 'react';
import { Task, SocialPlatform } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Film, Images, Send, Music2, Youtube, AtSign, StickyNote, ArrowRight } from 'lucide-react';

interface CalendarViewProps {
    tasks: Task[];
    onUpdateTaskDate: (taskId: string, newDate: string) => void;
    onNavigateToTask: (task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onUpdateTaskDate, onNavigateToTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
        
        // Adjust for Monday start (0 = Mon, 6 = Sun)
        const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        
        return { daysInMonth, startDay: adjustedFirstDay };
    };

    const { daysInMonth, startDay } = getDaysInMonth(currentDate);

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
        setCurrentDate(newDate);
    };

    const handleDrop = (e: React.DragEvent, day: number) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("taskId");
        if (taskId) {
            // Construct new date string YYYY-MM-DD
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const newDateStr = `${year}-${month}-${dayStr}`;
            
            onUpdateTaskDate(taskId, newDateStr);
        }
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const getTasksForDay = (day: number) => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;
        
        return tasks.filter(t => t.date === dateStr);
    };

    const getPlatformIcon = (platform: SocialPlatform) => {
        switch(platform) {
            case 'instagram_reels': return <Film size={12} />;
            case 'instagram_post': return <Images size={12} />;
            case 'telegram': return <Send size={12} />;
            case 'tiktok': return <Music2 size={12} />;
            case 'youtube': return <Youtube size={12} />;
            case 'threads': return <AtSign size={12} />;
            default: return <StickyNote size={12} />;
        }
    };

    const getPlatformColor = (platform: SocialPlatform) => {
        switch(platform) {
            case 'instagram_reels': return 'bg-gradient-to-r from-pink-500 to-orange-500';
            case 'instagram_post': return 'bg-pink-600';
            case 'telegram': return 'bg-blue-500';
            case 'tiktok': return 'bg-cyan-500';
            case 'youtube': return 'bg-red-500';
            case 'threads': return 'bg-zinc-700';
            default: return 'bg-zinc-600';
        }
    };

    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    return (
        <div className="max-w-[1600px] mx-auto p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-800 rounded-2xl">
                        <CalendarIcon size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white capitalize">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <p className="text-zinc-400 text-sm">Планирование контента</p>
                    </div>
                </div>

                <div className="flex items-center bg-[#18181b] rounded-xl border border-zinc-800 p-1">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 bg-[#121214] border border-zinc-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-zinc-800 bg-[#18181b]">
                    {weekDays.map((day) => (
                        <div key={day} className="py-4 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                    {/* Empty cells for start offset */}
                    {Array.from({ length: startDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-[#0e0e10] border-r border-b border-zinc-800/50" />
                    ))}

                    {/* Day Cells */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dayTasks = getTasksForDay(day);
                        const isToday = 
                            day === new Date().getDate() && 
                            currentDate.getMonth() === new Date().getMonth() &&
                            currentDate.getFullYear() === new Date().getFullYear();

                        return (
                            <div
                                key={day}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, day)}
                                className={`
                                    min-h-[120px] p-3 border-r border-b border-zinc-800/50 transition-colors relative group
                                    ${isToday ? 'bg-blue-500/5' : 'hover:bg-zinc-800/20'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`
                                        text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                        ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-zinc-400 group-hover:text-zinc-200'}
                                    `}>
                                        {day}
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    {dayTasks.map(task => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onClick={() => onNavigateToTask(task)}
                                            className={`
                                                text-[10px] p-1.5 rounded-lg text-white shadow-sm cursor-pointer
                                                hover:scale-105 transition-transform flex items-center gap-1.5 truncate font-medium
                                                ${getPlatformColor(task.platform)}
                                            `}
                                        >
                                            {getPlatformIcon(task.platform)}
                                            <span className="truncate">{task.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <p className="text-center text-xs text-zinc-500 mt-4">
                Перетащите задачу между днями, чтобы изменить дату публикации.
            </p>
        </div>
    );
};
