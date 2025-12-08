
import React, { useState } from 'react';
import { Layout, ArrowRight, Lock, User, Mail, Sparkles, AlertCircle, Loader2, WifiOff } from 'lucide-react';
import { storageService } from '../services/storageService';
import { User as UserType } from '../types';

interface AuthScreenProps {
    onLogin: (user: UserType) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        
        try {
            // storageService handles critical config errors internally and returns offline user
            const user = await storageService.login(email, password, !isLogin);
            onLogin(user);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') {
                setError("Неверный email или пароль");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("Email уже зарегистрирован");
            } else if (err.code === 'auth/weak-password') {
                setError("Пароль должен быть не менее 6 символов");
            } else {
                setError(err.message || "Ошибка авторизации");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40 mb-4 transform rotate-3">
                         <Layout className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">InstaiOS</h1>
                    <p className="text-zinc-400 text-center text-sm">
                        Operating System for Creators
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full bg-[#09090b] border border-zinc-700 rounded-xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Пароль</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-[#09090b] border border-zinc-700 rounded-xl py-3.5 pl-11 pr-4 text-white outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>
                    
                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl text-lg flex items-center justify-center gap-2 transition mt-6 disabled:opacity-70"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                {isLogin ? 'Войти' : 'Создать аккаунт'}
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(null);
                        }}
                        className="text-sm text-zinc-500 hover:text-white transition"
                    >
                        {isLogin ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
                    </button>
                </div>
                
                {/* Status Indicator */}
                <div className="mt-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex items-start gap-3">
                     {storageService.isOnline() ? (
                         <>
                            <Sparkles className="text-green-400 shrink-0" size={18} />
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Онлайн-режим: Данные хранятся в Firebase и доступны команде.
                            </p>
                         </>
                     ) : (
                         <>
                            <WifiOff className="text-orange-400 shrink-0" size={18} />
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Офлайн-режим: Облачное хранилище недоступно или не настроено. Данные сохраняются только в браузере.
                            </p>
                         </>
                     )}
                </div>
            </div>
        </div>
    );
};
