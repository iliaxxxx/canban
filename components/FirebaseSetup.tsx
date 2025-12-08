
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { FirebaseConfig } from '../services/firebase';
import { Flame, X, Check, AlertCircle, Link } from 'lucide-react';

interface FirebaseSetupProps {
    onClose: () => void;
}

export const FirebaseSetup: React.FC<FirebaseSetupProps> = ({ onClose }) => {
    const [configJson, setConfigJson] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleConnect = () => {
        try {
            // Allow user to paste the raw JS object or JSON
            let cleanString = configJson;
            // basic cleanup if they pasted "const firebaseConfig = { ... }"
            if (cleanString.includes('=')) {
                cleanString = cleanString.substring(cleanString.indexOf('=') + 1);
            }
            if (cleanString.trim().endsWith(';')) {
                cleanString = cleanString.trim().slice(0, -1);
            }
            // Replace single quotes with double quotes for JSON parsing if necessary (simple heuristic)
            // Ideally user pastes JSON. If they paste JS object, JSON.parse might fail. 
            // We'll trust they paste valid JSON or object structure that we can fix slightly
            cleanString = cleanString.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": '); // Quote keys
            cleanString = cleanString.replace(/'/g, '"'); // Replace single quotes

            const config: FirebaseConfig = JSON.parse(cleanString);
            
            if (!config.apiKey || !config.projectId) {
                throw new Error("Неверный формат конфигурации. Нужен apiKey и projectId.");
            }

            const success = storageService.connectFirebase(config);
            if (success) {
                onClose();
                window.location.reload();
            } else {
                setError("Не удалось инициализировать Firebase.");
            }

        } catch (e: any) {
            setError("Ошибка парсинга: " + e.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-lg bg-[#18181b] border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X /></button>
                
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500">
                        <Flame size={24} fill="currentColor" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Подключение Firebase</h2>
                        <p className="text-zinc-400 text-sm">Включите синхронизацию и командную работу</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-sm text-zinc-400 leading-relaxed">
                        1. Создайте проект на <a href="https://console.firebase.google.com" target="_blank" className="text-blue-400 hover:underline inline-flex items-center gap-1">console.firebase.google.com <Link size={10} /></a><br/>
                        2. Создайте веб-приложение и скопируйте <code>firebaseConfig</code>.<br/>
                        3. Вставьте объект конфигурации ниже.
                    </div>

                    <textarea 
                        value={configJson}
                        onChange={e => setConfigJson(e.target.value)}
                        placeholder={'{ "apiKey": "...", "authDomain": "...", ... }'}
                        className="w-full h-40 bg-[#09090b] border border-zinc-700 rounded-xl p-4 text-xs font-mono text-zinc-300 outline-none focus:border-orange-500 resize-none"
                    />

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <button 
                        onClick={handleConnect}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
                    >
                        Подключиться
                    </button>
                    
                    <button 
                         onClick={onClose}
                         className="w-full py-2 text-zinc-500 hover:text-white text-sm"
                    >
                        Остаться в офлайн-режиме
                    </button>
                </div>
            </div>
        </div>
    );
};
