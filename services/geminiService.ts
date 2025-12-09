import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SocialPlatform, Task } from "../types";

// ========================================
// CONFIGURATION
// ========================================

// Compatible key access
// In Vite, use import.meta.env with VITE_ prefix for client-side variables
const apiKey = import.meta.env.VITE_API_KEY;
const AI_REQUEST_TIMEOUT = 30000; // 30 seconds

// Validate API key on initialization
if (!apiKey) {
    console.error('CRITICAL: VITE_API_KEY is not set. AI features will not work.');
}

// Initialize AI client only if key exists
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Check if AI service is available
 * @throws Error if AI is not configured
 */
const checkAIAvailability = (): void => {
    if (!ai) {
        throw new Error(
            'AI service is not configured. Please set VITE_API_KEY in your environment variables.'
        );
    }
};

/**
 * Safe error logging with context
 */
const safeLog = (error: unknown, context?: string): void => {
    const prefix = context ? `[${context}]` : '[AI Service]';
    
    if (error instanceof Error) {
        console.error(`${prefix} Error:`, error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    } else {
        console.error(`${prefix} Unknown error:`, String(error));
    }
};

/**
 * Clean JSON string from markdown formatting
 * Robustly finds the first [ and last ] to extract array
 */
const cleanJsonString = (text: string): string => {
    if (!text) return '[]';
    let clean = text.trim();
    
    // Attempt to extract array pattern explicitly to handle pre/post text
    const startIndex = clean.indexOf('[');
    const endIndex = clean.lastIndexOf(']');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        clean = clean.substring(startIndex, endIndex + 1);
    } else {
        // Fallback cleanup if brackets not found or malformed (though regex below handles markdown blocks)
        if (clean.startsWith('```json')) {
            clean = clean.replace(/^```json/, '').replace(/```$/, '');
        } else if (clean.startsWith('```')) {
            clean = clean.replace(/^```/, '').replace(/```$/, '');
        }
    }
    
    return clean.trim();
};

/**
 * Safe JSON parsing with fallback
 */
const safeParseJSON = <T>(text: string, fallback: T): T => {
    try {
        const cleaned = cleanJsonString(text);
        return JSON.parse(cleaned) as T;
    } catch (error) {
        safeLog(error, 'JSON Parse');
        // Try one more desperate attempt: aggressive regex if simple cleaning failed
        try {
             const match = text.match(/\[.*\]/s);
             if (match) {
                 return JSON.parse(match[0]) as T;
             }
        } catch(e) {}
        
        return fallback;
    }
};

/**
 * Call AI with timeout protection
 */
const callAIWithTimeout = async <T>(
    aiCall: () => Promise<T>,
    timeoutMs: number = AI_REQUEST_TIMEOUT
): Promise<T> => {
    return Promise.race([
        aiCall(),
        new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('AI request timeout')), timeoutMs)
        )
    ]);
};

/**
 * Retry with exponential backoff
 */
const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> => {
    let lastError: unknown;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                // console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
};

// ========================================
// EXPORTED FUNCTIONS
// ========================================

export const generateContentIdeas = async (
    topic: string, 
    niche: string = 'General',
    platform: SocialPlatform | 'all' = 'all',
    tone: string = 'neutral',
    reelsFormat: 'mix' | 'scenario' | 'talking_head' = 'mix'
): Promise<{ title: string; description: string; platform: string }[]> => {
    try {
        checkAIAvailability();
        
        const toneInstruction = tone !== 'neutral' 
            ? `Тональность (Tone of Voice): ${tone}. Учитывай этот стиль в заголовках и описании.` 
            : '';

        let reelsInstruction = "Формат: Reels (15-60 сек). Логика: Вирусный заголовок, визуальный хук. Краткое описание сути ролика.";
        if (platform === 'instagram_reels') {
            if (reelsFormat === 'talking_head') {
                reelsInstruction = "Формат: 'Говорящая голова' (Talking Head). Экспертный монолог. Темы, которые удобно рассказывать на камеру. Описание должно содержать основную мысль для рассказа.";
            } else if (reelsFormat === 'scenario') {
                reelsInstruction = "Формат: Сценарный/Игровой Reels. Скетчи, переходы, визуальная демонстрация, монтаж. Описание должно содержать визуальную идею.";
            }
        }

        let prompt = `Сгенерируй 4 конкретные идеи для контента.
        Ниша / Роль автора: "${niche}".
        Тема: "${topic}".
        ${toneInstruction}
        
        ВАЖНО: Ответ должен быть ПОЛНОСТЬЮ НА РУССКОМ ЯЗЫКЕ.`;

        const platformGuides: Record<string, string> = {
            instagram_reels: reelsInstruction,
            instagram_post: "Формат: Карусель или Пост. Логика: 'Сохраняемый' контент, списки, польза. Кратко опиши структуру.",
            telegram: "Формат: Текстовый пост. Логика: Личный тон, инсайт, 'мысль дня' или разбор. Кратко суть.",
            tiktok: "Формат: TikTok. Логика: Тренды, POV, сценки или быстрый экспертный контент.",
            youtube: "Формат: Shorts. Логика: Быстрые факты, развенчание мифов.",
            threads: "Формат: Микроблог (Twitter-style). Логика: Триггер на комменты, короткий вброс, спорное мнение или начало треда (серии). Максимум реакции, минимум воды.",
            custom: "Формат: Заметка. Логика: Любая."
        };

        if (platform === 'all') {
            prompt += `
            Каждая идея должна подходить под определенную соцсеть (сделай микс).
            Строго следуй логике площадок:
            - Instagram Reels: ${platformGuides.instagram_reels}
            - Instagram Post: ${platformGuides.instagram_post}
            - Telegram: ${platformGuides.telegram}
            - TikTok: ${platformGuides.tiktok}
            - YouTube Shorts: ${platformGuides.youtube}
            - Threads: ${platformGuides.threads}
            
            Поле 'title' должно быть цепляющим заголовком (Кликбейт/Хук).
            Поле 'description' должно быть КОРОТКИМ наброском (суть идеи в 1-2 предложениях).
            Верни поле 'platform' строго как одно из: 'instagram_reels', 'instagram_post', 'telegram', 'tiktok', 'youtube', 'threads'.`;
        } else {
            prompt += `
            Все идеи должны быть адаптированы для **${platform}**.
            ${platformGuides[platform] || "Фокус на лучших практиках площадки."}
            Поле 'title' - это яркий заголовок.
            Поле 'description' - это КОРОТКИЙ набросок идеи (не пиши сценарий, только суть).
            Верни поле 'platform' строго как '${platform}'.`;
        }

        const response = await retryWithBackoff<GenerateContentResponse>(() =>
            callAIWithTimeout(() =>
                ai!.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    platform: { type: Type.STRING }
                                },
                                required: ["title", "description", "platform"]
                            }
                        }
                    }
                })
            )
        );

        if (response.text) {
            return safeParseJSON(response.text, []);
        }
        
        return [];
    } catch (error) {
        safeLog(error, 'generateContentIdeas');
        return [];
    }
};

export const generateStrategicPlan = async (
    niche: string,
    duration: 'week' | 'month',
    tone: string = 'neutral'
): Promise<{ title: string; description: string; platform: string }[]> => {
    try {
        checkAIAvailability();

        const count = duration === 'week' ? 7 : 15;
        const durationText = duration === 'week' ? '1 НЕДЕЛЮ (7 постов)' : '1 МЕСЯЦ (Стратегия из 15 ключевых единиц контента)';

        const prompt = `
            Ты - профессиональный контент-стратег.
            ЗАДАЧА: Создай контент-план на ${durationText} для ниши: "${niche}".
            Тональность: ${tone}.
            Структура:
            1. Reels (40%)
            2. Telegram (30%)
            3. Instagram Post (20%)
            4. Threads/Shorts (10%)
            
            Верни JSON массив из ${count} объектов: {title, description, platform}.
            Язык: Русский.
        `;

        const response = await retryWithBackoff<GenerateContentResponse>(() =>
            callAIWithTimeout(() =>
                ai!.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    platform: { type: Type.STRING }
                                },
                                required: ["title", "description", "platform"]
                            }
                        }
                    }
                })
            )
        );

        if (response.text) {
             return safeParseJSON(response.text, []);
        }
        return [];
    } catch (error) {
        safeLog(error, 'generateStrategicPlan');
        return [];
    }
};

export const generateContentScript = async (task: Task): Promise<string> => {
    try {
        checkAIAvailability();
        const platform = task.platform;
        
        let instructions = "";
        if (platform === 'instagram_reels') {
            instructions = `
                Напиши ДВА ВАРИАНТА сценария:
                ### 🎬 ВАРИАНТ 1: Сценарный план (Визуальный)
                - Хук -> Действие -> Развязка. Опиши кадры и аудио.
                ---
                ### 🗣️ ВАРИАНТ 2: Текст для суфлера (Разговорный)
                - СПЛОШНОЙ ТЕКСТ для чтения на камеру. Живая речь.
                В конце добавь описание для поста.
            `;
        } else if (['tiktok', 'youtube'].includes(platform)) {
            instructions = `Напиши ПОДРОБНЫЙ ПОКАДРОВЫЙ СЦЕНАРИЙ ВИДЕО. 1. Хук 2. Основная часть 3. CTA 4. Описание.`;
        } else if (platform === 'instagram_post') {
            instructions = `Распиши структуру КАРУСЕЛИ (Слайд за слайдом) и текст для Caption.`;
        } else if (platform === 'telegram') {
            instructions = `Напиши ГОТОВЫЙ ТЕКСТ ПОСТА для Телеграм-канала. Используй Markdown.`;
        } else if (platform === 'threads') {
            instructions = `Напиши 3 ВАРИАНТА: 1. Триггер/Вброс. 2. Жиза/Relatable. 3. Мини-тред. Стиль дерзкий.`;
        } else {
            instructions = `Распиши эту идею в подробный план действий.`;
        }

        const prompt = `
            Ты - продюсер. Преврати идею в готовый материал. Язык: РУССКИЙ.
            Платформа: ${platform}
            Заголовок: "${task.title}"
            Идея: "${task.description}"
            ${instructions}
        `;

        const response = await retryWithBackoff<GenerateContentResponse>(() =>
            callAIWithTimeout(() =>
                ai!.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                })
            )
        );

        return response.text || task.description || '';
    } catch (error) {
        safeLog(error, 'generateContentScript');
        return task.description || '';
    }
};

export const generateCarouselSlides = async (topic: string): Promise<{ title: string; content: string }[]> => {
    try {
        checkAIAvailability();
        const prompt = `
            Создай структуру карусели для Инстаграм на тему: "${topic}" (5-8 слайдов).
            Слайд 1: Кликбейт + Хук. Слайды 2-N: Польза. Последний: CTA.
            Верни JSON: [{title, content}].
        `;

        const response = await retryWithBackoff<GenerateContentResponse>(() =>
            callAIWithTimeout(() =>
                ai!.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    content: { type: Type.STRING },
                                },
                                required: ["title", "content"]
                            }
                        }
                    }
                })
            )
        );

        if (response.text) {
            return safeParseJSON(response.text, []);
        }
        return [];
    } catch (error) {
        safeLog(error, 'generateCarouselSlides');
        return [];
    }
};

export const repurposeContent = async (originalTask: Task): Promise<{ title: string; description: string; platform: string }[]> => {
    try {
        checkAIAvailability();

        const prompt = `
            Ты - контент-стратег. "Переупакуй" контент.
            ИСХОДНЫЙ: ${originalTask.platform}, "${originalTask.title}", "${originalTask.description}".
            ЗАДАЧА: Создай 2 адаптации:
            1. Для Telegram.
            2. Для YouTube Shorts.
            Если исходник для одной из них, замени на Instagram Post.
            Верни JSON: [{title, description, platform}].
        `;

        const response = await retryWithBackoff<GenerateContentResponse>(() =>
            callAIWithTimeout(() =>
                ai!.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    platform: { type: Type.STRING }
                                },
                                required: ["title", "description", "platform"]
                            }
                        }
                    }
                })
            )
        );
        
        if (response.text) {
            return safeParseJSON(response.text, []);
        }
        return [];
    } catch (error) {
        safeLog(error, 'repurposeContent');
        return [];
    }
};

export const analyzeInstagramContent = async (text: string): Promise<{ hook: string; coreMessage: string; structure: string; tone: string }> => {
    try {
        checkAIAvailability();

        const prompt = `
            Проанализируй текст Instagram Reels/Поста.
            Текст: "${text.substring(0, 2000)}"
            Выдели: 1. Хук 2. Основной посыл 3. Структура 4. Тон.
            Верни JSON.
        `;

        const response = await retryWithBackoff<GenerateContentResponse>(() =>
            callAIWithTimeout(() =>
                ai!.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                hook: { type: Type.STRING },
                                coreMessage: { type: Type.STRING },
                                structure: { type: Type.STRING },
                                tone: { type: Type.STRING },
                            }
                        }
                    }
                })
            )
        );

        if (response.text) {
            return safeParseJSON(response.text, { hook: '', coreMessage: '', structure: '', tone: '' });
        }
        return { hook: '', coreMessage: '', structure: '', tone: '' };
    } catch (error) {
        safeLog(error, 'analyzeInstagramContent');
        return { hook: '', coreMessage: '', structure: '', tone: '' };
    }
};

export const rewriteCompetitorIdea = async (
    originalText: string, 
    myTopic: string,
    platform: SocialPlatform = 'instagram_reels'
): Promise<{ title: string; description: string }> => {
    try {
        checkAIAvailability();
        const prompt = `
            Я блогер. Адаптируй структуру поста конкурента под МОЮ тему: "${myTopic}".
            Оригинал: "${originalText.substring(0, 1500)}"
            Верни JSON: { title, description }.
        `;
        
        const response = await retryWithBackoff<GenerateContentResponse>(() =>
            callAIWithTimeout(() =>
                ai!.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                            }
                        }
                    }
                })
            )
        );

        if (response.text) {
            return safeParseJSON(response.text, { title: 'Идея адаптирована', description: 'Посмотрите исходный пост.' });
        }
        return { title: 'Идея адаптирована', description: 'Посмотрите исходный пост.' };
    } catch (error) {
        safeLog(error, 'rewriteCompetitorIdea');
        return { title: 'Ошибка', description: 'Не удалось переписать идею.' };
    }
}