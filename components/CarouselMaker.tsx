

import React, { useState, useRef, useEffect } from 'react';
import { generateCarouselSlides } from '../services/geminiService';
import { Download, Sparkles, Loader2, Image as ImageIcon, Type, Trash2, Plus, Palette, Upload, Eraser, AtSign, ArrowLeft, LayoutTemplate, BoxSelect, Droplet, Save, FolderOpen, FileText } from 'lucide-react';
import { Task, Slide } from '../types';

interface DesignSettings {
    fontFamily: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string; // New: For lines, numbers, highlights
    backgroundImage: string | null;
    texture: 'none' | 'paper' | 'noise';
    overlayOpacity: number;
    titleFontSize: number;
    bodyFontSize: number;
    layout: 'center' | 'left-modern' | 'editorial'; // New: Layout modes
}

interface CarouselMakerProps {
    activeTask?: Task | null;
    onUpdateTask?: (taskId: string, slides: Slide[]) => void;
    onBack?: () => void;
    libraryTasks?: Task[]; // All saved carousels
    onSaveNew?: (title: string, slides: Slide[]) => Promise<void>;
    onSelectTask?: (task: Task) => void;
}

// SVG Textures
const PAPER_TEXTURE_SVG = `data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 500 500' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5' result='noise'/%3E%3CfeDiffuseLighting in='noise' lighting-color='white' surfaceScale='3'%3E%3CfeDistantLight azimuth='45' elevation='60'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)' opacity='1'/%3E%3C/svg%3E`;
const NOISE_TEXTURE_SVG = `data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E`;

export const CarouselMaker: React.FC<CarouselMakerProps> = ({ 
    activeTask, 
    onUpdateTask, 
    onBack, 
    libraryTasks = [], 
    onSaveNew, 
    onSelectTask 
}) => {
    const [topic, setTopic] = useState('');
    const [nickname, setNickname] = useState('@instaios_creator');
    const [slides, setSlides] = useState<Slide[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync with active task
    useEffect(() => {
        if (activeTask) {
            setTopic(activeTask.title);
            if (activeTask.carouselSlides && activeTask.carouselSlides.length > 0) {
                setSlides(activeTask.carouselSlides);
            }
        }
    }, [activeTask]);

    // Auto-save
    useEffect(() => {
        if (activeTask && onUpdateTask && slides.length > 0) {
            const timer = setTimeout(() => {
                onUpdateTask(activeTask.id, slides);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [slides, activeTask, onUpdateTask]);

    // Design State
    const [settings, setSettings] = useState<DesignSettings>({
        fontFamily: 'Oswald',
        backgroundColor: '#F5F5F5',
        textColor: '#1A1A1A',
        accentColor: '#FF3B30',
        backgroundImage: null,
        texture: 'none',
        overlayOpacity: 0,
        titleFontSize: 90,
        bodyFontSize: 42,
        layout: 'left-modern'
    });

    const fonts = [
        { name: 'Oswald (Bold)', value: 'Oswald' },
        { name: 'Montserrat (Modern)', value: 'Montserrat' },
        { name: 'Playfair (Elegant)', value: 'Playfair Display' },
        { name: 'Bebas Neue (Tall)', value: 'Bebas Neue' },
        { name: 'Raleway (Clean)', value: 'Raleway' },
        { name: 'Caveat (Hand)', value: 'Caveat' },
    ];

    const presets = [
        { 
            label: 'Guru Red', 
            bg: '#111111', text: '#FFFFFF', accent: '#FF3B30', 
            tex: 'noise', layout: 'left-modern', font: 'Oswald' 
        },
        { 
            label: 'Editorial', 
            bg: '#F2F0E9', text: '#2A2A2A', accent: '#000000', 
            tex: 'paper', layout: 'editorial', font: 'Playfair Display' 
        },
        { 
            label: 'Clean Blue', 
            bg: '#FFFFFF', text: '#1E3A8A', accent: '#3B82F6', 
            tex: 'none', layout: 'center', font: 'Montserrat' 
        },
        { 
            label: 'Vibe', 
            bg: '#4C1D95', text: '#F3E8FF', accent: '#A78BFA', 
            tex: 'noise', layout: 'left-modern', font: 'Raleway' 
        },
    ];

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setIsLoading(true);
        const generatedSlides = await generateCarouselSlides(topic);
        const newSlides = generatedSlides.map((s, i) => ({ ...s, id: i.toString() }));
        setSlides(newSlides);
        setIsLoading(false);
    };

    const handleSaveProject = async () => {
        if (!topic.trim()) {
            alert("Введите название темы перед сохранением");
            return;
        }
        setIsSaving(true);
        if (activeTask && onUpdateTask) {
             // Already saving via auto-save, but force UI feedback
             await onUpdateTask(activeTask.id, slides);
        } else if (onSaveNew) {
             await onSaveNew(topic, slides);
        }
        setIsSaving(false);
    };

    const handleUpdateSlide = (id: string, field: 'title' | 'content', value: string) => {
        setSlides(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleDeleteSlide = (id: string) => {
        setSlides(prev => prev.filter(s => s.id !== id));
    };

    const handleAddSlide = () => {
        setSlides(prev => [...prev, { id: Date.now().toString(), title: 'Заголовок', content: 'Текст...' }]);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setSettings(prev => ({
                    ...prev,
                    backgroundImage: event.target?.result as string,
                    backgroundColor: '#000000',
                    textColor: '#FFFFFF',
                    overlayOpacity: 0.5
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const applyPreset = (p: any) => {
        setSettings(prev => ({
            ...prev,
            backgroundColor: p.bg,
            textColor: p.text,
            accentColor: p.accent,
            texture: p.tex as any,
            layout: p.layout as any,
            fontFamily: p.font,
            backgroundImage: null,
            overlayOpacity: 0
        }));
    };

    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = reject;
        });
    };

    // --- DRAWING ENGINE ---
    const drawSlide = async (slide: Slide, index: number, ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const isCover = index === 0;

        // 1. Fill Background
        ctx.fillStyle = settings.backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Background Image
        if (settings.backgroundImage) {
            try {
                const img = await loadImage(settings.backgroundImage);
                const scale = Math.max(width / img.width, height / img.height);
                const x = (width / 2) - (img.width / 2) * scale;
                const y = (height / 2) - (img.height / 2) * scale;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                
                if (settings.overlayOpacity > 0) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${settings.overlayOpacity})`;
                    ctx.fillRect(0, 0, width, height);
                }
            } catch (e) { console.error(e); }
        }

        // 3. Texture Overlay
        if (settings.texture !== 'none') {
            try {
                ctx.save();
                const src = settings.texture === 'paper' ? PAPER_TEXTURE_SVG : NOISE_TEXTURE_SVG;
                const img = await loadImage(src);
                ctx.globalCompositeOperation = settings.texture === 'paper' ? 'multiply' : 'overlay';
                ctx.globalAlpha = settings.texture === 'paper' ? 0.6 : 0.15;
                ctx.drawImage(img, 0, 0, width, height);
                ctx.restore();
            } catch (e) { console.error(e); }
        }

        // 4. Layout Logic
        const padding = 100;
        const maxTextWidth = width - (padding * 2);
        const titleFontSize = isCover ? settings.titleFontSize * 1.3 : settings.titleFontSize; // Bigger on cover
        const contentFontSize = settings.bodyFontSize;
        
        ctx.fillStyle = settings.textColor;

        // Helper: Wrap Text
        const getLines = (text: string, fontSize: number, fontWeight: string, font: string): string[] => {
            ctx.font = `${fontWeight} ${fontSize}px ${font}`;
            const words = text.split(' ');
            let line = '';
            const lines = [];
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxTextWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
            return lines;
        };

        const titleLines = getLines(slide.title, titleFontSize, 'bold', settings.fontFamily);
        const contentLines = getLines(slide.content, contentFontSize, '400', settings.fontFamily);
        
        // Calculate vertical positions based on layout
        
        if (settings.layout === 'center') {
            // CENTER ALIGNED (Classic)
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const centerX = width / 2;
            
            const totalH = (titleLines.length * titleFontSize * 1.2) + 60 + (contentLines.length * contentFontSize * 1.4);
            let startY = (height - totalH) / 2;

            // Draw Title
            ctx.font = `bold ${titleFontSize}px ${settings.fontFamily}`;
            titleLines.forEach(line => {
                ctx.fillText(line.trim(), centerX, startY);
                startY += titleFontSize * 1.2;
            });

            // Accent Line
            ctx.fillStyle = settings.accentColor;
            ctx.fillRect(centerX - 60, startY + 10, 120, 4);
            startY += 60;

            // Draw Content
            ctx.fillStyle = settings.textColor;
            ctx.font = `400 ${contentFontSize}px ${settings.fontFamily}`;
            contentLines.forEach(line => {
                ctx.fillText(line.trim(), centerX, startY);
                startY += contentFontSize * 1.4;
            });

            // Numbering
            if (!isCover) {
                ctx.font = `bold 24px ${settings.fontFamily}`;
                ctx.fillStyle = settings.accentColor;
                ctx.fillText(`${index + 1} / ${slides.length}`, centerX, height - 140);
            }

        } else if (settings.layout === 'left-modern') {
            // LEFT ALIGNED with Big Numbers & Accents
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            const startX = padding;
            
            // Big Number in background/top
            if (!isCover) {
                ctx.fillStyle = settings.accentColor;
                ctx.font = `bold 200px ${settings.fontFamily}`;
                ctx.globalAlpha = 0.15;
                ctx.fillText(`0${index + 1}`, width - 350, -20); // Top right corner watermark
                ctx.globalAlpha = 1.0;
            }

            const totalH = (titleLines.length * titleFontSize * 1.1) + 80 + (contentLines.length * contentFontSize * 1.4);
            let startY = (height - totalH) / 2;

            // Accent Bar for Title
            ctx.fillStyle = settings.accentColor;
            ctx.fillRect(startX - 20, startY + 10, 8, (titleLines.length * titleFontSize * 1.1));

            // Title
            ctx.fillStyle = settings.textColor;
            ctx.font = `bold ${titleFontSize}px ${settings.fontFamily}`;
            titleLines.forEach(line => {
                ctx.fillText(line.trim(), startX, startY);
                startY += titleFontSize * 1.1;
            });

            startY += 60;

            // Content
            ctx.font = `500 ${contentFontSize}px ${settings.fontFamily}`;
            contentLines.forEach(line => {
                ctx.fillText(line.trim(), startX, startY);
                startY += contentFontSize * 1.4;
            });

             // Pagination Line
            ctx.fillStyle = settings.textColor;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(padding, height - 120, width - (padding*2), 2);
            ctx.fillStyle = settings.accentColor;
            ctx.globalAlpha = 1;
            const progress = ((index + 1) / slides.length) * (width - (padding*2));
            ctx.fillRect(padding, height - 120, progress, 2);

        } else if (settings.layout === 'editorial') {
            // EDITORIAL (Frame, Serif vibes)
            const framePadding = 40;
            
            // Draw Frame
            ctx.strokeStyle = settings.textColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(framePadding, framePadding, width - (framePadding*2), height - (framePadding*2));

            ctx.textAlign = 'center';
            const centerX = width / 2;
            
            const totalH = (titleLines.length * titleFontSize * 1.2) + 80 + (contentLines.length * contentFontSize * 1.5);
            let startY = (height - totalH) / 2;

            // Decorative Top Element
            ctx.fillStyle = settings.accentColor;
            ctx.beginPath();
            ctx.arc(centerX, startY - 60, 6, 0, 2 * Math.PI);
            ctx.fill();

            // Title
            ctx.fillStyle = settings.textColor;
            ctx.font = `bold ${titleFontSize}px ${settings.fontFamily}`; // Usually Playfair
            titleLines.forEach(line => {
                ctx.fillText(line.trim(), centerX, startY);
                startY += titleFontSize * 1.2;
            });

            // Separator
            ctx.font = `italic 30px ${settings.fontFamily}`;
            ctx.fillStyle = settings.accentColor;
            ctx.fillText("✦", centerX, startY + 20);
            startY += 80;

            // Content
            ctx.fillStyle = settings.textColor;
            ctx.font = `400 ${contentFontSize}px ${settings.fontFamily}`;
            contentLines.forEach(line => {
                ctx.fillText(line.trim(), centerX, startY);
                startY += contentFontSize * 1.5;
            });
            
             if (!isCover) {
                ctx.font = `400 24px ${settings.fontFamily}`;
                ctx.fillText(`${index + 1}`, centerX, height - 80);
            }
        }

        // Footer / Nickname
        if (settings.layout !== 'left-modern') {
            ctx.textAlign = 'center';
            ctx.font = `bold 28px ${settings.fontFamily}`;
            ctx.fillStyle = settings.textColor;
            ctx.globalAlpha = 0.5;
            ctx.fillText(nickname, width / 2, height - 60);
        } else {
             ctx.textAlign = 'right';
             ctx.font = `bold 24px ${settings.fontFamily}`;
             ctx.fillStyle = settings.textColor;
             ctx.globalAlpha = 0.5;
             ctx.fillText(nickname, width - padding, height - 60);
        }
        ctx.globalAlpha = 1.0;
    };

    const handleDownloadAll = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 1080;
        canvas.height = 1350;

        for (let i = 0; i < slides.length; i++) {
            await drawSlide(slides[i], i, ctx, canvas.width, canvas.height);
            const link = document.createElement('a');
            link.download = `insta_slide_${i + 1}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            await new Promise(r => setTimeout(r, 100));
        }
    };

    return (
        <div className="max-w-[1920px] mx-auto p-4 lg:p-6 h-full flex flex-col xl:flex-row gap-6">
            {/* LEFT SIDEBAR: Library & Controls */}
            <div className="w-full xl:w-[420px] flex flex-col gap-4 h-fit sticky top-6">
                
                {/* 1. HEADER & LIBRARY */}
                <div className="flex items-center gap-2 mb-2">
                    {onBack && (
                        <button onClick={onBack} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition">
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    <h2 className="text-2xl font-bold text-white">Карусели</h2>
                </div>

                {/* LIBRARY SECTION */}
                <div className="bg-[#121214] border border-zinc-800 rounded-[1.5rem] p-4 flex flex-col gap-2 max-h-[300px] overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                            <FolderOpen size={14} /> Мои проекты ({libraryTasks.length})
                        </span>
                        <button 
                            onClick={() => {
                                setSlides([]);
                                setTopic('');
                                if(onSelectTask) onSelectTask(null as any); // Clear active task
                            }}
                            className="text-[10px] bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white px-2 py-1 rounded transition"
                        >
                            + Новый
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {libraryTasks.length === 0 ? (
                            <div className="text-center py-4 text-zinc-600 text-xs italic">
                                Нет сохраненных проектов
                            </div>
                        ) : (
                            libraryTasks.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => onSelectTask && onSelectTask(t)}
                                    className={`w-full text-left p-2 rounded-lg text-sm flex items-center gap-2 transition ${activeTask?.id === t.id ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-600/30' : 'hover:bg-zinc-800 text-zinc-300'}`}
                                >
                                    <FileText size={14} />
                                    <span className="truncate">{t.title || 'Без названия'}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* 2. TOPIC & GENERATE */}
                <div className="bg-[#121214] border border-zinc-800 rounded-[1.5rem] p-5">
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Тема поста..."
                            className="flex-1 px-4 py-2.5 bg-[#09090b] border border-zinc-700 rounded-xl outline-none text-white text-sm focus:border-blue-500 transition"
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !topic.trim()}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                            {slides.length > 0 ? 'Пересоздать' : 'Генерация'}
                        </button>
                        
                        <button
                            onClick={handleSaveProject}
                            disabled={isSaving || !topic.trim()}
                            className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                            title="Сохранить в библиотеку"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        </button>
                    </div>
                </div>

                {/* 3. DESIGN CONTROLS */}
                <div className="bg-[#121214] border border-zinc-800 rounded-[1.5rem] p-5 space-y-5">
                    <div className="flex items-center justify-between">
                         <h3 className="font-bold flex items-center gap-2 text-sm text-zinc-300">
                            <Palette size={16} className="text-pink-500" /> Стиль
                        </h3>
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        {presets.map(p => (
                            <button
                                key={p.label}
                                onClick={() => applyPreset(p)}
                                className="aspect-square rounded-xl border border-zinc-700 relative overflow-hidden group hover:scale-105 transition"
                                style={{ backgroundColor: p.bg }}
                                title={p.label}
                            >
                                <div className="absolute inset-0 flex items-center justify-center font-bold text-[10px]" style={{ color: p.text }}>
                                    Aa
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: p.accent }}></div>
                            </button>
                        ))}
                    </div>

                    {/* Layout Mode */}
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <LayoutTemplate size={12} /> Макет
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'left-modern', label: 'Modern', icon: 'M' },
                                { id: 'center', label: 'Classic', icon: 'C' },
                                { id: 'editorial', label: 'Editor', icon: 'E' },
                            ].map(l => (
                                <button
                                    key={l.id}
                                    onClick={() => setSettings(s => ({ ...s, layout: l.id as any }))}
                                    className={`py-2 rounded-lg text-xs font-bold border transition ${settings.layout === l.id ? 'bg-zinc-100 text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'}`}
                                >
                                    {l.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Typography */}
                    <div className="space-y-3">
                         <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Type size={12} /> Шрифт
                            </label>
                            <select 
                                value={settings.fontFamily}
                                onChange={e => setSettings(s => ({ ...s, fontFamily: e.target.value }))}
                                className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2 outline-none text-white text-xs appearance-none cursor-pointer"
                            >
                                {fonts.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="flex justify-between text-[10px] text-zinc-500 mb-1">
                                    <span>Заголовок</span>
                                    <span>{settings.titleFontSize}</span>
                                </label>
                                <input 
                                    type="range" min="60" max="150" step="5"
                                    value={settings.titleFontSize}
                                    onChange={e => setSettings(s => ({ ...s, titleFontSize: parseInt(e.target.value) }))}
                                    className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                />
                             </div>
                             <div>
                                <label className="flex justify-between text-[10px] text-zinc-500 mb-1">
                                    <span>Текст</span>
                                    <span>{settings.bodyFontSize}</span>
                                </label>
                                <input 
                                    type="range" min="30" max="80" step="2"
                                    value={settings.bodyFontSize}
                                    onChange={e => setSettings(s => ({ ...s, bodyFontSize: parseInt(e.target.value) }))}
                                    className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                />
                             </div>
                        </div>
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-3 gap-3">
                         <div>
                            <label className="text-[10px] font-bold text-zinc-500 mb-2 block">Фон</label>
                            <div className="flex items-center gap-2 bg-[#09090b] p-1.5 rounded-lg border border-zinc-700">
                                <input type="color" value={settings.backgroundColor} onChange={e => setSettings(s => ({ ...s, backgroundColor: e.target.value, backgroundImage: null }))} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none" />
                            </div>
                         </div>
                         <div>
                            <label className="text-[10px] font-bold text-zinc-500 mb-2 block">Текст</label>
                            <div className="flex items-center gap-2 bg-[#09090b] p-1.5 rounded-lg border border-zinc-700">
                                <input type="color" value={settings.textColor} onChange={e => setSettings(s => ({ ...s, textColor: e.target.value }))} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none" />
                            </div>
                         </div>
                         <div>
                            <label className="text-[10px] font-bold text-zinc-500 mb-2 block flex gap-1"><Droplet size={10}/> Акцент</label>
                            <div className="flex items-center gap-2 bg-[#09090b] p-1.5 rounded-lg border border-zinc-700">
                                <input type="color" value={settings.accentColor} onChange={e => setSettings(s => ({ ...s, accentColor: e.target.value }))} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none" />
                            </div>
                         </div>
                    </div>

                    {/* Nickname */}
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 mb-2 flex items-center gap-1">
                            <AtSign size={12} /> Подпись
                        </label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2 outline-none text-white text-xs focus:border-blue-500"
                        />
                    </div>

                    {/* Backgrounds Extra */}
                    <div className="flex gap-2 border-t border-zinc-800 pt-4">
                         <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition"
                        >
                            <Upload size={12} /> Фото
                        </button>
                        <button 
                             onClick={() => setSettings(s => ({ ...s, texture: s.texture === 'none' ? 'noise' : 'none' }))}
                             className={`px-3 py-2 rounded-lg text-[10px] font-bold transition ${settings.texture !== 'none' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                        >
                            Шум
                        </button>
                    </div>

                    <button 
                        onClick={handleDownloadAll}
                        disabled={slides.length === 0}
                        className="w-full py-3 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                    >
                        <Download size={18} /> Скачать ({slides.length})
                    </button>
                </div>
            </div>

            {/* MAIN PREVIEW AREA */}
            <div className="flex-1 overflow-y-auto">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-xl flex items-center gap-2 text-white">
                        <BoxSelect size={20} className="text-zinc-400" />
                        Слайды
                    </h3>
                    {slides.length > 0 && (
                        <button 
                            onClick={handleAddSlide}
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                        >
                            <Plus size={16} /> Добавить слайд
                        </button>
                    )}
                </div>

                {slides.length === 0 ? (
                    <div className="h-[500px] border-2 border-dashed border-zinc-800 rounded-[2rem] flex flex-col items-center justify-center text-zinc-500 bg-[#121214]">
                        <Sparkles size={48} className="mb-4 text-zinc-700" />
                        <p>Выберите проект слева или создайте новую тему</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8 pb-20">
                        {slides.map((slide, index) => {
                            const isCover = index === 0;
                            return (
                                <div key={slide.id} className="relative group">
                                    {/* PREVIEW CARD */}
                                    <div 
                                        className="aspect-[4/5] shadow-2xl overflow-hidden relative rounded-xl transition-all duration-300 ring-1 ring-zinc-800 hover:ring-zinc-600"
                                        style={{
                                            backgroundColor: settings.backgroundColor,
                                            fontFamily: settings.fontFamily,
                                            color: settings.textColor,
                                        }}
                                    >
                                        {/* CSS Preview Logic (Simplified approximation of Canvas) */}
                                        {/* Background Image */}
                                        {settings.backgroundImage && (
                                            <>
                                                <img src={settings.backgroundImage} className="absolute inset-0 w-full h-full object-cover z-0" alt="bg" />
                                                <div className="absolute inset-0 z-0 bg-black" style={{ opacity: settings.overlayOpacity }} />
                                            </>
                                        )}
                                        {/* Texture */}
                                        {settings.texture === 'paper' && (
                                             <div className="absolute inset-0 z-[1] pointer-events-none mix-blend-multiply opacity-60" style={{ backgroundImage: `url("${PAPER_TEXTURE_SVG}")`, backgroundSize: 'cover' }} />
                                        )}
                                        {settings.texture === 'noise' && (
                                             <div className="absolute inset-0 z-[1] pointer-events-none mix-blend-overlay opacity-20" style={{ backgroundImage: `url("${NOISE_TEXTURE_SVG}")` }} />
                                        )}

                                        {/* Layout Container */}
                                        <div className={`relative z-10 h-full flex flex-col p-8 ${settings.layout === 'center' ? 'items-center justify-center text-center' : 'items-start justify-center text-left'}`}>
                                            
                                            {/* Editorial Frame */}
                                            {settings.layout === 'editorial' && (
                                                <div className="absolute inset-4 border-2 pointer-events-none opacity-80" style={{ borderColor: settings.textColor }}></div>
                                            )}

                                            {/* Big Number (Modern Left) */}
                                            {settings.layout === 'left-modern' && !isCover && (
                                                <div className="absolute -top-4 -right-10 text-[120px] font-bold leading-none opacity-10 pointer-events-none" style={{ color: settings.accentColor }}>
                                                    0{index + 1}
                                                </div>
                                            )}

                                            {/* Editorial Accent */}
                                            {settings.layout === 'editorial' && <div className="w-2 h-2 rounded-full mb-8" style={{ backgroundColor: settings.accentColor }}></div>}

                                            {/* Accent Line (Modern) */}
                                            {settings.layout === 'left-modern' && (
                                                <div className="w-1.5 mb-4" style={{ height: '40px', backgroundColor: settings.accentColor }}></div>
                                            )}

                                            <textarea
                                                value={slide.title}
                                                onChange={(e) => handleUpdateSlide(slide.id, 'title', e.target.value)}
                                                className="w-full bg-transparent border-none outline-none font-bold leading-tight placeholder-current overflow-hidden resize-none mb-6"
                                                style={{ 
                                                    color: 'inherit',
                                                    fontSize: `${isCover ? settings.titleFontSize * 0.4 : settings.titleFontSize * 0.35}px`, // Scaled for preview
                                                    textAlign: settings.layout === 'center' || settings.layout === 'editorial' ? 'center' : 'left'
                                                }}
                                                placeholder="Заголовок"
                                                rows={isCover ? 3 : 2}
                                            />

                                            {/* Center Accent Line */}
                                            {settings.layout === 'center' && (
                                                <div className="w-20 h-1 mb-8" style={{ backgroundColor: settings.accentColor }}></div>
                                            )}
                                            
                                            <textarea
                                                value={slide.content}
                                                onChange={(e) => handleUpdateSlide(slide.id, 'content', e.target.value)}
                                                className="w-full bg-transparent border-none outline-none leading-relaxed placeholder-current/70 overflow-hidden resize-none"
                                                style={{ 
                                                    color: 'inherit',
                                                    fontSize: `${settings.bodyFontSize * 0.35}px`,
                                                    textAlign: settings.layout === 'center' || settings.layout === 'editorial' ? 'center' : 'left'
                                                }}
                                                placeholder="Текст слайда..."
                                                rows={6}
                                            />

                                            {/* Footer */}
                                            <div className={`absolute bottom-6 left-0 right-0 text-[10px] font-bold opacity-60 uppercase tracking-widest px-8 ${settings.layout === 'left-modern' ? 'text-right' : 'text-center'}`}>
                                                {nickname}
                                            </div>
                                            
                                            {/* Pagination Bar (Modern) */}
                                            {settings.layout === 'left-modern' && (
                                                <div className="absolute bottom-16 left-8 right-8 h-0.5 bg-current opacity-20">
                                                    <div className="h-full bg-current opacity-100" style={{ width: `${((index + 1) / slides.length) * 100}%`, color: settings.accentColor, backgroundColor: settings.accentColor }}></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <button 
                                        onClick={() => handleDeleteSlide(slide.id)}
                                        className="absolute -top-3 -right-3 bg-zinc-800 text-red-400 p-2 rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg hover:bg-zinc-700 z-30 ring-2 ring-[#09090b]"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    
                                    <div className="absolute top-2 left-4 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[10px] text-white font-mono opacity-0 group-hover:opacity-100 transition z-30 pointer-events-none">
                                        Слайд {index + 1}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};
