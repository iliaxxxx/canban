import React, { useState } from 'react';
import { Competitor, SocialPlatform, Task, CompetitorPost, InstagramAnalysisResult } from '../types';
import { Plus, Trash2, Search, Loader2, X, Instagram, Copy, RefreshCw, Smartphone, AlertCircle, WifiOff, Zap, Settings, PlayCircle, Eye, Heart, MessageCircle, BarChart2, ArrowRight, Flame, ArrowLeft, FileText } from 'lucide-react';
import { analyzeInstagramContent, rewriteCompetitorIdea } from '../services/claudeService';
import { analyzeReelWithGroq, rewriteReelWithGroq } from '../services/groqService';
import { storageService } from '../services/storageService';

interface CompetitorViewProps {
  competitors: Competitor[];
  setCompetitors: React.Dispatch<React.SetStateAction<Competitor[]>>;
  onAddTasks: (tasks: Omit<Task, 'id' | 'columnId' | 'projectId'>[]) => void;
  onNavigateToBoard: () => void;
}

export const CompetitorView: React.FC<CompetitorViewProps> = ({ onAddTasks, onNavigateToBoard }) => {
  const [inputUrl, setInputUrl] = useState('');
  
  // TOKENS - Load from environment variables or localStorage
  const [apifyToken, setApifyToken] = useState(() =>
    localStorage.getItem('apify_token') ||
    import.meta.env.VITE_APIFY_API_KEY ||
    ''
  );
  const [groqApiKey, setGroqApiKey] = useState(() =>
    localStorage.getItem('groq_api_key') ||
    import.meta.env.VITE_GROQ_API_KEY ||
    ''
  );
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // ANALYSIS STATES
  const [analysisResult, setAnalysisResult] = useState<InstagramAnalysisResult | null>(null);
  const [scrapedPosts, setScrapedPosts] = useState<CompetitorPost[]>([]); // List of reels from profile
  const [profileStats, setProfileStats] = useState<any>(null); // Profile general info

  // Rewriting State
  const [myTopic, setMyTopic] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [transcribingId, setTranscribingId] = useState<string | null>(null);

  const saveSettings = () => {
    localStorage.setItem('apify_token', apifyToken.trim());
    localStorage.setItem('groq_api_key', groqApiKey.trim());
    setIsSettingsOpen(false);
    setError(null); // Clear error on save
  };

  const cleanUrl = (url: string) => {
      if (!url) return '';
      try {
          let formatted = url.trim();
          // Remove query params
          if (formatted.includes('?')) formatted = formatted.split('?')[0];
          // Ensure protocol
          if (!formatted.startsWith('http')) formatted = 'https://' + formatted;
          // Remove trailing slash
          if (formatted.endsWith('/')) formatted = formatted.slice(0, -1);
          return formatted;
      } catch (e) {
          return url.trim();
      }
  };

  const getUsernameFromUrl = (url: string): string | null => {
      try {
          const urlObj = new URL(cleanUrl(url));
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          if (pathParts.length === 0) return null;
          
          // If it's a profile url like instagram.com/username
          if (pathParts.length === 1 && !['reel', 'p', 'tv', 'stories', 'explore'].includes(pathParts[0])) {
              return pathParts[0];
          }
          return null;
      } catch (e) {
          return null;
      }
  };

  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 60000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      
      const fetchOptions: RequestInit = {
          ...options,
          signal: controller.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
      };

      const tryFetch = async (targetUrl: string) => {
          const res = await fetch(targetUrl, fetchOptions);
          return res;
      };

      try {
          try {
              const response = await tryFetch(url);
              clearTimeout(id);
              return response;
          } catch (err: any) {
              if (err.name === 'AbortError') throw err;
              // Only try proxy if it's a network error (TypeError), not a 4xx/5xx response
              const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
              const response = await tryFetch(proxyUrl);
              clearTimeout(id);
              return response;
          }
      } catch (err: any) {
          clearTimeout(id);
          if (err.name === 'AbortError') throw new Error('Превышено время ожидания. Apify работает медленно.');
          // Avoid circular reference in error logging
          throw new Error(err.message || "Ошибка сети при запросе к Apify");
      }
  };

  const isProfileUrl = (url: string) => {
      // Basic check: if it doesn't have /p/ or /reel/ it's likely a profile
      const lower = url.toLowerCase();
      return !lower.includes('/p/') && !lower.includes('/reel/') && !lower.includes('/tv/') && !lower.includes('/stories/');
  };

  const handleAnalyze = async (overrideUrl?: string) => {
      const targetUrl = overrideUrl || inputUrl;
      
      setError(null);
      setStatusMessage('');
      if (!targetUrl) return;
      
      const token = apifyToken.replace(/\s/g, '');
      if (!token) { setIsSettingsOpen(true); return; }

      setIsLoading(true);
      if (!overrideUrl) {
          setAnalysisResult(null);
          setScrapedPosts([]);
          setProfileStats(null);
      }

      try {
          if (!navigator.onLine) throw new Error("Нет подключения к интернету.");

          const cleanedUrl = cleanUrl(targetUrl);
          const isProfile = isProfileUrl(cleanedUrl);
          const username = isProfile ? getUsernameFromUrl(cleanedUrl) : null;
          
          let actorId = 'shu8hvrXbJbY3Eb9W'; // Default to Universal Scraper
          let input: any = {};

          if (isProfile && username) {
              // Use Specialized Profile Scraper (Reel Scraper)
              actorId = 'xMc5Ga1oCONPmWJIa'; 
              input = {
                  usernames: [username],
                  resultsType: "details", // We want the full profile details including latestPosts
              };
              setStatusMessage(`Сканирование профиля @${username} (Reel Scraper)...`);
          } else {
              // Universal Scraper for single posts or fallback
              actorId = 'shu8hvrXbJbY3Eb9W';
              input = {
                  directUrls: [cleanedUrl],
                  resultsType: "posts",
                  searchLimit: 1,
                  addParentData: true,
              };
              setStatusMessage('Сканирование Reels (Universal Scraper)...');
          }
          
          const startRunUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`;
          const startResponse = await fetchWithTimeout(startRunUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(input)
          });

          if (!startResponse.ok) {
               if (startResponse.status === 402) {
                   setIsSettingsOpen(true);
                   throw new Error("🛑 Лимиты Apify исчерпаны (402). На вашем токене закончились кредиты. Создайте новый аккаунт на Apify.com и вставьте свежий токен в настройки.");
               }

               const errText = await startResponse.text();
               let errMsg = `Ошибка запуска Apify (${startResponse.status})`;
               try {
                   const jsonErr = JSON.parse(errText);
                   if (jsonErr.error?.message) errMsg += `: ${jsonErr.error.message}`;
               } catch (e) { errMsg += `: ${errText.substring(0, 50)}`; }
               throw new Error(errMsg);
          }

          const runData = await startResponse.json();
          const runId = runData.data.id;
          const datasetId = runData.data.defaultDatasetId;

          // Poll Status
          let status = 'RUNNING';
          let attempts = 0;
          while ((status === 'RUNNING' || status === 'READY') && attempts < 60) {
              await new Promise(r => setTimeout(r, 3000));
              attempts++;
              setStatusMessage(`Анализ Instagram... ${attempts * 3}с`);
              
              const statusRes = await fetchWithTimeout(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
              
              // If status check fails with 402/401, stop immediately
              if (statusRes.status === 402) {
                  setIsSettingsOpen(true);
                  throw new Error("🛑 Лимиты Apify исчерпаны во время выполнения.");
              }

              if (!statusRes.ok) continue;
              const statusData = await statusRes.json();
              status = statusData.data.status;
          }

          if (status !== 'SUCCEEDED') {
              try {
                   const failRes = await fetchWithTimeout(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
                   const failData = await failRes.json();
                   const reason = failData.data.statusMessage || failData.data.status;
                   throw new Error(`Apify сбой: ${reason}. Попробуйте другую ссылку.`);
              } catch (innerErr: any) {
                   throw new Error(`Не удалось получить данные (${innerErr.message || 'Unknown'}).`);
              }
          }

          // Fetch Data
          setStatusMessage('Загрузка результатов...');
          const itemsRes = await fetchWithTimeout(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
          const rawData = await itemsRes.json();
          
          if (!Array.isArray(rawData) || rawData.length === 0) {
              // Try fallback if specialized scraper failed
              if (actorId === 'xMc5Ga1oCONPmWJIa') {
                   setStatusMessage("Пробуем альтернативный метод (Universal)...");
                   await handleUniversalFallback(cleanedUrl, token);
                   return;
              }
              throw new Error("Instagram вернул пустой список. Возможно аккаунт закрыт.");
          }

          if (isProfile && username && actorId === 'xMc5Ga1oCONPmWJIa') {
              // Handle Profile Scraper Output (xMc5Ga1oCONPmWJIa)
              const profileData = rawData[0];
              const latestPosts = profileData.latestPosts || [];

              const posts: CompetitorPost[] = latestPosts
                  .filter((item: any) => item.type === 'Video' || item.isReel) 
                  .map((item: any) => ({
                      id: item.id,
                      url: `https://www.instagram.com/reel/${item.shortCode}/`,
                      caption: item.caption || item.text || '',
                      type: 'Video',
                      likesCount: item.likesCount || item.likes || 0,
                      commentsCount: item.commentsCount || item.comments || 0,
                      videoViewCount: item.videoViewCount || item.videoPlayCount || item.viewCount || 0,
                      timestamp: item.timestamp,
                      isViral: false 
                  }));

              posts.sort((a, b) => (b.videoViewCount || 0) - (a.videoViewCount || 0));

              // Mark viral
              const topCount = Math.ceil(posts.length * 0.2);
              posts.forEach((p, idx) => {
                  if (idx < topCount && (p.videoViewCount || 0) > 1000) p.isViral = true;
              });

              setScrapedPosts(posts);
              setProfileStats({
                  username: profileData.username,
                  fullName: profileData.fullName,
              });
              setStatusMessage('Готово!');
          } else {
              // SINGLE POST MODE (shu8hvrXbJbY3Eb9W)
              const item = rawData[0];
              await performDeepAnalysis({
                   ...item,
                   caption: item.caption || item.text || '',
                   likesCount: item.likesCount || item.likes || 0,
                   commentsCount: item.commentsCount || item.comments || 0,
                   videoViewCount: item.videoViewCount || item.videoPlayCount || item.viewCount || 0
              });
          }

      } catch (error: any) {
          // SAFE ERROR LOGGING: Only log the message string, never the Error object itself
          console.error("Analysis Error:", error instanceof Error ? error.message : String(error));
          setError(error instanceof Error ? error.message : String(error));
      } finally {
          setIsLoading(false);
      }
  };

  const handleUniversalFallback = async (url: string, token: string) => {
      // Fallback logic for profiles when specialized scraper fails
      // Using Universal Scraper which takes directUrls
      try {
           const actorId = 'shu8hvrXbJbY3Eb9W';
           const startRunUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`;
           const startResponse = await fetchWithTimeout(startRunUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  directUrls: [url],
                  resultsType: "posts",
                  searchLimit: 1, // Only 1 if profile fails, usually specific post
              })
           });

           if (startResponse.status === 402) {
               setIsSettingsOpen(true);
               throw new Error("🛑 Лимиты Apify исчерпаны (402).");
           }

           if (!startResponse.ok) throw new Error("Fallback failed");
           const runData = await startResponse.json();
           const runId = runData.data.id;
           const datasetId = runData.data.defaultDatasetId;

            // Simple Poll
           let status = 'RUNNING';
           while (status === 'RUNNING' || status === 'READY') {
              await new Promise(r => setTimeout(r, 3000));
              const statusRes = await fetchWithTimeout(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
              if (!statusRes.ok) continue;
              const statusData = await statusRes.json();
              status = statusData.data.status;
              if (status === 'FAILED') throw new Error("Fallback Scraper Failed");
           }

           const itemsRes = await fetchWithTimeout(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
           const rawData = await itemsRes.json();

           if (rawData.length > 0) {
               const item = rawData[0];
               await performDeepAnalysis({
                   ...item,
                   caption: item.caption || item.text || '',
                   likesCount: item.likesCount || item.likes || 0,
                   commentsCount: item.commentsCount || item.comments || 0,
                   videoViewCount: item.videoViewCount || item.videoPlayCount || item.viewCount || 0
              });
           } else {
               throw new Error("Не удалось загрузить данные даже альтернативным методом.");
           }

      } catch (e: any) {
          throw new Error(e.message);
      }
  };

  const performDeepAnalysis = async (postData: any) => {
      try {
          const caption = postData.caption || '';
          
          let aiData;
          if (groqApiKey) {
              setStatusMessage('⚡ Groq (Llama 3) деконструирует сценарий...');
              aiData = await analyzeReelWithGroq(caption, groqApiKey);
          } else {
              setStatusMessage('Gemini анализирует контент...');
              aiData = await analyzeInstagramContent(caption);
          }
          
          setAnalysisResult({
               type: 'reel',
               data: postData,
               aiAnalysis: aiData
          });
          setStatusMessage('');
      } catch (e: any) {
          setError(e.message);
      }
  };

  const handleTranscribe = async (post: CompetitorPost) => {
      setTranscribingId(post.id);
      await performDeepAnalysis(post);
      setTranscribingId(null);
  };

  const handleRewrite = async () => {
      if (!analysisResult || !myTopic.trim()) return;
      
      setIsRewriting(true);
      
      let newIdea;
      
      if (groqApiKey && analysisResult.aiAnalysis) {
          const { hook, coreMessage, structure } = analysisResult.aiAnalysis;
          newIdea = await rewriteReelWithGroq({ hook, coreMessage, structure }, myTopic, groqApiKey);
      } else {
          const sourceText = analysisResult.data.caption || '';
          newIdea = await rewriteCompetitorIdea(sourceText, myTopic, 'instagram_reels');
      }
      
      onAddTasks([{
          title: newIdea.title,
          description: newIdea.description + `\n\n[Ref: ${analysisResult.data.url || inputUrl}]`,
          platform: 'instagram_reels'
      }]);

      setIsRewriting(false);
      onNavigateToBoard();
  };

  // UI: LIST FOR PROFILE POSTS
  const renderProfileList = () => (
      <div className="mt-8 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between mb-6">
              <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                      <BarChart2 className="text-blue-500" /> 
                      Топ рилсы {profileStats?.username ? `@${profileStats.username}` : ''}
                  </h3>
                  <p className="text-zinc-400 text-sm">Список топ рилсов по просмотрам</p>
              </div>
              <button 
                  onClick={() => { setScrapedPosts([]); setProfileStats(null); setInputUrl(''); }}
                  className="text-sm text-zinc-500 hover:text-white"
              >
                  Сбросить
              </button>
          </div>

          <div className="flex flex-col gap-3">
              {scrapedPosts.map((post) => (
                  <div 
                      key={post.id} 
                      className="bg-[#121214] border border-zinc-800 rounded-xl p-4 hover:bg-zinc-900 transition group flex flex-col sm:flex-row items-start sm:items-center gap-4 relative overflow-hidden"
                  >
                      {/* Left: Stats & Viral Indicator */}
                      <div className="flex flex-row sm:flex-col gap-3 sm:gap-1 min-w-[80px] text-zinc-400">
                          {post.isViral && (
                              <div className="text-red-500 text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider mb-1">
                                  <Flame size={12} fill="currentColor" /> Viral
                              </div>
                          )}
                          <span className="flex items-center gap-1.5 text-sm font-medium text-white">
                              <Eye size={14} className="text-zinc-500" /> 
                              {(post.videoViewCount/1000).toFixed(1)}k
                          </span>
                          <span className="flex items-center gap-1.5 text-xs">
                              <Heart size={12} /> {post.likesCount}
                          </span>
                      </div>

                      {/* Middle: Content Preview */}
                      <div className="flex-1 min-w-0">
                          <div className="text-sm text-zinc-200 line-clamp-2 font-mono leading-relaxed opacity-80">
                              {post.caption || 'Текст отсутствует...'}
                          </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                           <a 
                                href={post.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="p-2 text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                                title="Открыть в Instagram"
                           >
                               <Instagram size={16} />
                           </a>
                           <button 
                                onClick={() => handleTranscribe(post)}
                                disabled={transcribingId === post.id}
                                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-400 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 border border-blue-600/20"
                           >
                               {transcribingId === post.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                               Транскрибация
                           </button>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto p-8 min-h-screen">
      
      {!scrapedPosts.length && !analysisResult && (
        <div className="flex flex-col items-center justify-center text-center mb-12 animate-in fade-in">
             <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-900/20">
                 <Zap size={32} className="text-white" />
             </div>
             <h1 className="text-4xl font-bold text-white mb-3">Reels Analytics</h1>
             <p className="text-zinc-400 text-lg max-w-lg">
                 Вставьте ссылку на <b>Профиль</b> (для списка топ-рилс)<br/>
                 или на <b>Reels</b> (для быстрого разбора).
             </p>
             
             <button onClick={() => setIsSettingsOpen(true)} className="mt-4 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full text-zinc-300 transition flex items-center gap-1.5 border border-zinc-700">
                     <Settings size={12} /> Настройки API (Apify + Groq)
             </button>
        </div>
      )}

      {/* INPUT BAR */}
      <div className="max-w-2xl mx-auto relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl"></div>
          <div className={`relative bg-[#18181b] border ${error ? 'border-red-500' : 'border-zinc-700'} rounded-3xl p-2 flex items-center shadow-2xl transition-colors`}>
              <div className="pl-4 pr-2 text-zinc-500"><Instagram size={20} /></div>
              <input 
                  type="text" 
                  value={inputUrl}
                  onChange={(e) => {
                      setInputUrl(e.target.value);
                      setError(null);
                  }}
                  placeholder="Ссылка: instagram.com/username или /reel/..."
                  className="flex-1 bg-transparent border-none outline-none text-white px-2 py-4 text-lg placeholder-zinc-600"
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              <button 
                onClick={() => handleAnalyze()}
                disabled={isLoading || !inputUrl}
                className="bg-white hover:bg-zinc-200 text-black px-8 py-4 rounded-2xl font-bold text-lg transition flex items-center gap-2 disabled:opacity-50 min-w-[140px] justify-center"
              >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Поиск'}
              </button>
          </div>
          
          {isLoading && statusMessage && (
              <div className="absolute -bottom-8 left-0 right-0 text-center text-blue-400 text-sm animate-pulse font-mono flex items-center justify-center gap-2">
                  <Loader2 size={12} className="animate-spin" /> {statusMessage}
              </div>
          )}

          {error && (
              <div className="absolute -bottom-24 left-0 right-0 flex justify-center animate-in slide-in-from-top-2 z-20">
                  <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 shadow-lg backdrop-blur-md text-center max-w-lg">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{error}</span>
                  </div>
              </div>
          )}
      </div>

      {/* RESULT 1: PROFILE LIST */}
      {scrapedPosts.length > 0 && !analysisResult && renderProfileList()}

      {/* RESULT 2: DEEP ANALYSIS (Single Reel) */}
      {analysisResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-10 duration-500 mt-12">
              {/* LEFT: Analysis Stats */}
              <div className="space-y-6">
                  <button 
                    onClick={() => setAnalysisResult(null)} 
                    className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm mb-2"
                  >
                      <ArrowLeft size={16} /> Назад к списку
                  </button>

                  <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-8">
                      <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                              <PlayCircle className="text-pink-500" size={24} />
                              <h3 className="text-xl font-bold">Транскрибация</h3>
                          </div>
                          {(analysisResult.data.videoViewCount > 100000 || analysisResult.data.isViral) && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase animate-pulse">Viral</span>
                          )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-[#18181b] rounded-2xl p-4 text-center border border-zinc-800">
                              <div className="text-2xl font-bold text-white">
                                  {analysisResult.data.videoViewCount 
                                    ? (analysisResult.data.videoViewCount >= 1000 ? (analysisResult.data.videoViewCount/1000).toFixed(1) + 'k' : analysisResult.data.videoViewCount) 
                                    : 'N/A'}
                              </div>
                              <div className="text-xs text-zinc-500 font-bold uppercase">Просмотры</div>
                          </div>
                          <div className="bg-[#18181b] rounded-2xl p-4 text-center border border-zinc-800">
                              <div className="text-2xl font-bold text-white">{analysisResult.data.likesCount}</div>
                              <div className="text-xs text-zinc-500 font-bold uppercase">Лайки</div>
                          </div>
                          <div className="bg-[#18181b] rounded-2xl p-4 text-center border border-zinc-800">
                              <div className="text-2xl font-bold text-white">{analysisResult.data.commentsCount}</div>
                              <div className="text-xs text-zinc-500 font-bold uppercase">Комменты</div>
                          </div>
                      </div>

                      <div className="mb-6">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                             Описание (Источник)
                          </label>
                          <div className="bg-[#18181b] rounded-2xl p-4 text-sm text-zinc-300 leading-relaxed max-h-40 overflow-y-auto border border-zinc-800 whitespace-pre-wrap scrollbar-hide font-mono">
                              {analysisResult.data.caption || 'Текст отсутствует...'}
                          </div>
                      </div>

                      {analysisResult.aiAnalysis && (
                          <div className="space-y-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
                              <div className="flex gap-3">
                                  <div className="w-1 bg-yellow-500 rounded-full h-full min-h-[40px]"></div>
                                  <div className="flex-1">
                                      <div className="text-xs text-yellow-500 font-bold uppercase mb-1">🔥 Хук (Llama 3)</div>
                                      <p className="text-sm text-white font-medium">{analysisResult.aiAnalysis.hook}</p>
                                  </div>
                              </div>
                              <div className="flex gap-3">
                                  <div className="w-1 bg-blue-500 rounded-full h-full min-h-[40px]"></div>
                                  <div className="flex-1">
                                      <div className="text-xs text-blue-500 font-bold uppercase mb-1">💎 Суть (Core)</div>
                                      <p className="text-sm text-white font-medium">{analysisResult.aiAnalysis.coreMessage}</p>
                                  </div>
                              </div>
                              <div className="flex gap-3">
                                  <div className="w-1 bg-green-500 rounded-full h-full min-h-[40px]"></div>
                                  <div className="flex-1">
                                      <div className="text-xs text-green-500 font-bold uppercase mb-1">📐 Структура</div>
                                      <p className="text-sm text-white font-medium">{analysisResult.aiAnalysis.structure}</p>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              {/* RIGHT: Rewrite Action */}
              <div className="flex flex-col justify-center">
                  <div className="bg-gradient-to-br from-[#18181b] to-[#121214] border border-zinc-700 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                       <div className="absolute top-0 right-0 p-32 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"></div>
                       
                       <div className="relative z-10">
                           <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                               <RefreshCw className="text-blue-500" />
                               {groqApiKey ? 'Groq Рерайт' : 'AI Рерайт'}
                           </h2>
                           <p className="text-zinc-400 mb-6">
                               Llama 3 возьмет структуру этого успешного рилса и напишет сценарий для вас.
                           </p>

                           <div className="space-y-4 mb-8">
                               <div>
                                   <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Ваша Ниша / Тема?</label>
                                   <input 
                                        type="text" 
                                        value={myTopic}
                                        onChange={e => setMyTopic(e.target.value)}
                                        placeholder="Например: Недвижимость в Дубае..."
                                        className="w-full bg-[#09090b] border border-zinc-600 rounded-xl px-4 py-4 text-white outline-none focus:border-blue-500 transition placeholder-zinc-700 font-bold"
                                   />
                               </div>
                           </div>

                           <button 
                                onClick={handleRewrite}
                                disabled={isRewriting || !myTopic.trim()}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                           >
                               {isRewriting ? <Loader2 className="animate-spin" /> : <React.Fragment><Copy size={20} /> Забрать в Канбан</React.Fragment>}
                           </button>
                           
                           {!groqApiKey && (
                               <p className="text-[10px] text-zinc-600 mt-3 text-center">
                                   *Для лучшего результата подключите Groq API в настройках
                               </p>
                           )}
                       </div>
                  </div>
              </div>
          </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
               <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
                    <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X /></button>
                    <h3 className="text-xl font-bold mb-4">Настройки API</h3>
                    
                    <div className="space-y-4">
                        <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl mb-4">
                             <p className="text-xs text-orange-200">
                                 <b>Внимание:</b> Ошибка 402 означает, что бесплатные лимиты ($5) на токене закончились. Зарегистрируйте новый аккаунт на <a href="https://console.apify.com" target="_blank" className="underline font-bold">apify.com</a> и вставьте новый токен.
                             </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Apify Token (Скрапинг)</label>
                            <input 
                                type="text" 
                                className="w-full bg-[#09090b] border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-white font-mono text-sm" 
                                value={apifyToken} 
                                onChange={(e) => setApifyToken(e.target.value)} 
                                placeholder="apify_api_..." 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                Groq API Key (Llama 3) <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 rounded">Рекомендуем</span>
                            </label>
                            <input 
                                type="password" 
                                className="w-full bg-[#09090b] border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-white font-mono text-sm" 
                                value={groqApiKey} 
                                onChange={(e) => setGroqApiKey(e.target.value)} 
                                placeholder="gsk_..." 
                            />
                            <p className="text-[10px] text-zinc-500 mt-1">Бесплатный ключ: console.groq.com</p>
                        </div>

                        <button onClick={saveSettings} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition mt-2">Сохранить</button>
                    </div>
               </div>
          </div>
      )}
    </div>
  );
};