import { SocialPlatform, Task } from "../types";

// ========================================
// CONFIGURATION
// ========================================

// In Vite, use import.meta.env with VITE_ prefix for client-side variables
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const AI_REQUEST_TIMEOUT = 60000; // 60 seconds for Claude

// Validate API key on initialization
if (!API_KEY) {
    console.error('CRITICAL: VITE_ANTHROPIC_API_KEY is not set. AI features will not work.');
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Check if AI service is available
 */
const checkAIAvailability = (): void => {
    if (!API_KEY) {
        throw new Error(
            'AI service is not configured. Please set VITE_ANTHROPIC_API_KEY in your environment variables.'
        );
    }
};

/**
 * Safe error logging with context
 */
const safeLog = (error: unknown, context?: string): void => {
    const prefix = context ? `[${context}]` : '[Claude Service]';
    
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
 */
const cleanJsonString = (text: string): string => {
    if (!text) return '[]';
    let clean = text.trim();
    
    // Extract JSON array from Claude's response
    const startIndex = clean.indexOf('[');
    const endIndex = clean.lastIndexOf(']');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        clean = clean.substring(startIndex, endIndex + 1);
    } else {
        // Remove markdown code blocks
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
 * Call Claude API with timeout protection
 */
const callClaudeWithTimeout = async (
    messages: any[],
    systemPrompt: string,
    maxTokens: number = 4096
): Promise<string> => {
    checkAIAvailability();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT);

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY!,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: maxTokens,
                system: systemPrompt,
                messages: messages
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        
        if (!data.content || !data.content[0] || !data.content[0].text) {
            throw new Error('Invalid response format from Claude API');
        }

        return data.content[0].text;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout after ${AI_REQUEST_TIMEOUT / 1000} seconds`);
        }
        
        throw error;
    }
};

// ========================================
// PLATFORM CONFIGURATION
// ========================================

interface PlatformConfig {
    platform: string;
    format: string;
    duration: string;
    aspectRatio: string;
    maxLength?: number;
    style: string;
    hooks: string[];
}

const platformConfigs: Record<SocialPlatform, PlatformConfig> = {
    instagram_reels: {
        platform: 'Instagram Reels',
        format: 'Вертикальное видео',
        duration: '15-60 секунд',
        aspectRatio: '9:16',
        maxLength: 2200,
        style: 'Динамично, с трендовой музыкой, визуальные эффекты',
        hooks: ['Стоп-скролл в первые 3 секунды', 'Тренды и челленджи', 'Эмоциональный hook']
    },
    instagram_post: {
        platform: 'Instagram Post',
        format: 'Карусель или одиночный пост',
        duration: 'N/A',
        aspectRatio: '1:1 или 4:5',
        maxLength: 2200,
        style: 'Эстетика, качественная графика, сторителлинг',
        hooks: ['Первый слайд должен цеплять', 'Визуальная консистентность', 'Call-to-action']
    },
    tiktok: {
        platform: 'TikTok',
        format: 'Вертикальное видео',
        duration: '15-60 секунд',
        aspectRatio: '9:16',
        maxLength: 2200,
        style: 'Сырой, аутентичный контент, тренды',
        hooks: ['Хук в первые 2 секунды', 'Участие в трендах', 'Нативность']
    },
    youtube: {
        platform: 'YouTube Shorts',
        format: 'Вертикальное видео',
        duration: 'до 60 секунд',
        aspectRatio: '9:16',
        maxLength: 5000,
        style: 'Образовательный или развлекательный, качественная картинка',
        hooks: ['Интрига в начале', 'Ценность контента', 'Призыв к подписке']
    },
    telegram: {
        platform: 'Telegram',
        format: 'Текстовый пост',
        duration: 'N/A',
        aspectRatio: 'N/A',
        maxLength: 4096,
        style: 'Информативный, структурированный, с эмодзи',
        hooks: ['Цепляющий первый абзац', 'Структурированность', 'Полезность']
    },
    threads: {
        platform: 'Threads',
        format: 'Короткий текст + изображение',
        duration: 'N/A',
        aspectRatio: '1:1',
        maxLength: 500,
        style: 'Краткость, разговорный стиль, актуальность',
        hooks: ['Быстрая зацепка', 'Конверсейшн', 'Легкость восприятия']
    }
};

// ========================================
// MAIN GENERATION FUNCTIONS
// ========================================

/**
 * Generate content script for a specific platform
 */
export const generateContentScript = async (
    topic: string,
    platform: SocialPlatform,
    additionalContext: string = ''
): Promise<string> => {
    try {
        checkAIAvailability();
        
        const config = platformConfigs[platform];
        
        const systemPrompt = `Ты эксперт по созданию контента для социальных сетей с опытом работы в российском digital-маркетинге.

Твоя задача - создавать готовые к использованию сценарии контента, которые:
1. Адаптированы под специфику платформы
2. Следуют трендам и алгоритмам
3. Максимизируют вовлечённость
4. Написаны живым языком российской аудитории

Используй emoji, сленг, актуальные тренды. Пиши так, чтобы контент был готов к публикации.`;

        const userPrompt = `Создай детальный сценарий контента на тему: "${topic}"

Платформа: ${config.platform}
Формат: ${config.format}
${config.duration !== 'N/A' ? `Длительность: ${config.duration}` : ''}
Соотношение сторон: ${config.aspectRatio}
${config.maxLength ? `Максимальная длина текста: ${config.maxLength} символов` : ''}

Стиль контента: ${config.style}

Ключевые элементы:
${config.hooks.map(h => `- ${h}`).join('\n')}

${additionalContext ? `Дополнительный контекст:\n${additionalContext}` : ''}

Создай полноценный сценарий, который включает:

1. **Хук (первые секунды/строки)** - мощное начало, которое останавливает скролл
2. **Основной контент** - структурированная подача информации
3. **Визуальные указания** - что показывать на экране (для видео) или как оформить (для постов)
4. **Текст/озвучка** - готовый текст для озвучки или публикации
5. **Call-to-action** - призыв к действию
6. **Хештеги/теги** - релевантные теги для максимального охвата

Пиши конкретно и детально. Сценарий должен быть готов к производству контента.`;

        const messages = [
            { role: 'user', content: userPrompt }
        ];

        const response = await callClaudeWithTimeout(messages, systemPrompt, 4096);
        
        return response || 'Не удалось сгенерировать сценарий. Попробуйте снова.';
    } catch (error) {
        safeLog(error, 'generateContentScript');
        throw new Error('Ошибка при генерации сценария. Проверьте подключение к интернету и API ключ.');
    }
};

/**
 * Generate carousel slides for Instagram/Telegram
 */
export const generateCarouselSlides = async (
    topic: string,
    slideCount: number,
    style: string = 'educational'
): Promise<Array<{ title: string; content: string; designNotes: string }>> => {
    try {
        checkAIAvailability();

        const styleDescriptions: Record<string, string> = {
            educational: 'Образовательный - факты, статистика, полезная информация',
            storytelling: 'Сторителлинг - история с драматургией и эмоциями',
            listicle: 'Список - топ-N, чек-лист, пошаговая инструкция',
            inspirational: 'Вдохновляющий - мотивация, цитаты, кейсы успеха',
            comparison: 'Сравнение - до/после, мифы vs реальность, варианты'
        };

        const systemPrompt = `Ты креативный дизайнер и копирайтер, специализирующийся на создании вирусных каруселей для Instagram и Telegram.

Твоя задача - создать структурированный контент для карусели, где каждый слайд:
1. Имеет четкую визуальную концепцию
2. Содержит цепляющий заголовок
3. Подает информацию кратко и ёмко
4. Визуально связан с предыдущим и следующим слайдом

Формат ответа - только JSON массив, без дополнительного текста.`;

        const userPrompt = `Создай карусель из ${slideCount} слайдов на тему: "${topic}"

Стиль: ${styleDescriptions[style] || style}

Верни JSON массив объектов со следующей структурой:
[
  {
    "title": "Заголовок слайда (краткий, цепляющий)",
    "content": "Основной текст слайда (2-4 предложения)",
    "designNotes": "Рекомендации по визуальному оформлению (цвета, иконки, расположение)"
  }
]

Требования:
- Первый слайд должен быть интригующим и останавливать скролл
- Последний слайд должен содержать CTA
- Каждый слайд должен быть самодостаточным, но создавать желание свайпнуть дальше
- Используй актуальные emoji и визуальные тренды
- Контент должен быть адаптирован для российской аудитории

Верни ТОЛЬКО JSON массив, без markdown форматирования и дополнительного текста.`;

        const messages = [
            { role: 'user', content: userPrompt }
        ];

        const response = await callClaudeWithTimeout(messages, systemPrompt, 4096);
        
        const slides = safeParseJSON<Array<{ title: string; content: string; designNotes: string }>>(
            response,
            []
        );

        if (slides.length === 0) {
            throw new Error('Не удалось распарсить ответ от Claude');
        }

        return slides;
    } catch (error) {
        safeLog(error, 'generateCarouselSlides');
        throw new Error('Ошибка при генерации слайдов карусели');
    }
};

/**
 * Repurpose content for different platform
 */
export const repurposeContent = async (
    originalContent: string,
    fromPlatform: SocialPlatform,
    toPlatform: SocialPlatform
): Promise<string> => {
    try {
        checkAIAvailability();

        const fromConfig = platformConfigs[fromPlatform];
        const toConfig = platformConfigs[toPlatform];

        const systemPrompt = `Ты эксперт по адаптации контента между различными социальными платформами.

Твоя задача - не просто переписать контент, а адаптировать его под специфику новой платформы:
1. Изменить формат подачи
2. Адаптировать длину и стиль
3. Сохранить ключевое сообщение
4. Оптимизировать под алгоритмы новой платформы`;

        const userPrompt = `Адаптируй этот контент:

ОРИГИНАЛЬНЫЙ КОНТЕНТ (${fromConfig.platform}):
${originalContent}

ЦЕЛЕВАЯ ПЛАТФОРМА: ${toConfig.platform}

Характеристики целевой платформы:
- Формат: ${toConfig.format}
- ${toConfig.duration !== 'N/A' ? `Длительность: ${toConfig.duration}` : ''}
- Стиль: ${toConfig.style}
- ${toConfig.maxLength ? `Макс. длина: ${toConfig.maxLength} символов` : ''}

Особенности адаптации:
${toConfig.hooks.map(h => `- ${h}`).join('\n')}

Создай адаптированную версию контента, которая:
1. Сохраняет ключевое сообщение оригинала
2. Полностью соответствует формату целевой платформы
3. Использует специфические для платформы приёмы вовлечения
4. Готова к публикации без дополнительной обработки

Если это видео-контент, опиши визуальный ряд и текст/озвучку.
Если текстовый - структурируй согласно лучшим практикам платформы.`;

        const messages = [
            { role: 'user', content: userPrompt }
        ];

        const response = await callClaudeWithTimeout(messages, systemPrompt, 4096);
        
        return response || 'Не удалось адаптировать контент';
    } catch (error) {
        safeLog(error, 'repurposeContent');
        throw new Error('Ошибка при адаптации контента');
    }
};

/**
 * Analyze competitor content and generate insights
 */
export const analyzeCompetitor = async (
    competitorContent: string,
    platform: SocialPlatform
): Promise<string> => {
    try {
        checkAIAvailability();

        const config = platformConfigs[platform];

        const systemPrompt = `Ты аналитик контента в digital-маркетинге, специализирующийся на competitive intelligence.

Твоя задача - проанализировать контент конкурента и выявить:
1. Что работает и почему
2. Какие приёмы использованы
3. Как можно адаптировать для своего контента
4. Где есть возможности сделать лучше`;

        const userPrompt = `Проанализируй контент конкурента:

ПЛАТФОРМА: ${config.platform}

КОНТЕНТ:
${competitorContent}

Дай детальный анализ по следующим пунктам:

## 1. Структура и формат
- Как построен контент
- Какие элементы использованы
- Длина и темп подачи

## 2. Хуки и вовлечение
- Какие приёмы привлечения внимания использованы
- Точки вовлечения аудитории
- CTA и призывы к действию

## 3. Сильные стороны
- Что сделано хорошо
- Почему это может работать
- Какие тренды учтены

## 4. Возможности для улучшения
- Где можно сделать лучше
- Упущенные возможности
- Как выделиться на фоне этого контента

## 5. Рекомендации для адаптации
- Конкретные идеи для создания похожего, но лучшего контента
- Что взять, что улучшить
- Как применить в своей стратегии

Будь конкретным и практичным. Давай actionable insights.`;

        const messages = [
            { role: 'user', content: userPrompt }
        ];

        const response = await callClaudeWithTimeout(messages, systemPrompt, 4096);
        
        return response;
    } catch (error) {
        safeLog(error, 'analyzeCompetitor');
        throw new Error('Ошибка при анализе контента конкурента');
    }
};

/**
 * Generate content ideas based on trends
 */
export const generateContentIdeas = async (
    topic: string,
    niche: string,
    platform: SocialPlatform | 'all',
    tone: string = 'neutral',
    reelsFormat: string = 'mix',
    count: number = 10
): Promise<Array<{ title: string; description: string; platform: string }>> => {
    try {
        checkAIAvailability();

        const toneDescriptions: Record<string, string> = {
            neutral: 'Нейтральный, профессиональный',
            provocative: 'Провокационный, дерзкий стиль Саши Степановой',
            empathetic: 'Заботливый, эмпатичный, мягкий',
            scientific: 'Научный, экспертный, с фактами',
            sarcastic: 'Саркастичный, живой, с иронией'
        };

        const reelsFormatDescriptions: Record<string, string> = {
            mix: 'Микс форматов (сценарные и talking head)',
            scenario: 'Только сценарные видео (визуальный ряд, текст, музыка)',
            talking_head: 'Только talking head (говорящая голова в камеру)'
        };

        const systemPrompt = `Ты креативный стратег контента с глубоким пониманием трендов российских социальных сетей.

Твоя задача - генерировать актуальные, вовлекающие идеи контента, которые:
1. Соответствуют трендам и алгоритмам платформы
2. Учитывают специфику ниши
3. Имеют высокий потенциал вовлечения
4. Легко реализуемы

Формат ответа - только JSON массив.`;

        let platformDescription = '';
        if (platform === 'all') {
            platformDescription = 'Микс различных платформ (Instagram Reels, Instagram Post, TikTok, YouTube Shorts, Telegram, Threads)';
        } else {
            const config = platformConfigs[platform];
            platformDescription = `${config.platform} - ${config.format}, ${config.style}`;
        }

        const userPrompt = `Сгенерируй ${count} идей контента:

ТЕМА: ${topic}
НИША: ${niche}
ПЛАТФОРМА: ${platformDescription}
ТОН: ${toneDescriptions[tone] || tone}
${platform === 'instagram_reels' || platform === 'all' ? `ФОРМАТ REELS: ${reelsFormatDescriptions[reelsFormat]}` : ''}

Верни JSON массив:
[
  {
    "title": "Название идеи (короткое, цепляющее)",
    "description": "Описание концепции контента (2-3 предложения)",
    "platform": "instagram_reels|instagram_post|tiktok|youtube|telegram|threads"
  }
]

Требования:
- Идеи должны быть разнообразными (разные форматы, подходы)
- ${platform === 'all' ? 'Распредели идеи по разным платформам' : 'Все идеи для платформы ' + platform}
- Учитывай выбранный тон контента
- Каждая идея должна быть реализуема
- Фокус на вовлечение и виральность

Верни ТОЛЬКО JSON массив, без форматирования.`;

        const messages = [
            { role: 'user', content: userPrompt }
        ];

        const response = await callClaudeWithTimeout(messages, systemPrompt, 4096);
        
        const ideas = safeParseJSON<Array<{ title: string; description: string; platform: string }>>(
            response,
            []
        );

        if (ideas.length === 0) {
            throw new Error('Не удалось распарсить идеи от Claude');
        }

        return ideas;
    } catch (error) {
        safeLog(error, 'generateContentIdeas');
        throw new Error('Ошибка при генерации идей контента');
    }
};

/**
 * Generate strategic content plan for a week or month
 */
export const generateStrategicPlan = async (
    niche: string,
    duration: 'week' | 'month',
    tone: string = 'neutral'
): Promise<Array<{ title: string; description: string; platform: string; date?: string }>> => {
    try {
        checkAIAvailability();

        const toneDescriptions: Record<string, string> = {
            neutral: 'Нейтральный, профессиональный',
            provocative: 'Провокационный, дерзкий стиль Саши Степановой',
            empathetic: 'Заботливый, эмпатичный, мягкий',
            scientific: 'Научный, экспертный, с фактами',
            sarcastic: 'Саркастичный, живой, с иронией'
        };

        const durationInfo = {
            week: { days: 7, postsPerDay: 2, total: 14, description: 'неделю' },
            month: { days: 30, postsPerDay: 2, total: 60, description: 'месяц' }
        };

        const info = durationInfo[duration];

        const systemPrompt = `Ты опытный контент-стратег, специализирующийся на создании контент-планов для социальных сетей.

Твоя задача - создать сбалансированный, стратегический план контента, который:
1. Охватывает разные платформы
2. Включает разнообразные форматы
3. Поддерживает интерес аудитории
4. Достигает бизнес-целей
5. Учитывает алгоритмы платформ

Формат ответа - только JSON массив.`;

        const userPrompt = `Создай стратегический контент-план на ${info.description}:

НИША: ${niche}
ПЕРИОД: ${info.days} дней
КОЛИЧЕСТВО ПОСТОВ: около ${info.total} (${info.postsPerDay} в день)
ТОН: ${toneDescriptions[tone]}

Верни JSON массив:
[
  {
    "title": "Название контент-идеи",
    "description": "Подробное описание контента (формат, суть, хуки)",
    "platform": "instagram_reels|instagram_post|tiktok|youtube|telegram|threads"
  }
]

Требования к плану:
1. **Разнообразие платформ**: Сбалансируй контент по всем платформам
2. **Разнообразие форматов**: 
   - Образовательный контент
   - Развлекательный
   - Вдохновляющий
   - Behind the scenes
   - User-generated content
   - Интерактив (опросы, челленджи)
3. **Стратегическая последовательность**: Контент должен дополнять друг друга
4. **Тренды**: Включи актуальные тренды и челленджи
5. **Вовлечение**: Регулярные призывы к действию

Структура плана должна быть логичной и способствовать росту вовлечённости.

Верни ТОЛЬКО JSON массив без форматирования.`;

        const messages = [
            { role: 'user', content: userPrompt }
        ];

        const response = await callClaudeWithTimeout(messages, systemPrompt, 4096);
        
        const plan = safeParseJSON<Array<{ title: string; description: string; platform: string }>>(
            response,
            []
        );

        if (plan.length === 0) {
            throw new Error('Не удалось создать контент-план');
        }

        return plan;
    } catch (error) {
        safeLog(error, 'generateStrategicPlan');
        throw new Error('Ошибка при создании стратегического плана');
    }
};

/**
 * Analyze Instagram content (alternative to Gemini version)
 */
export const analyzeInstagramContent = async (
    caption: string
): Promise<{ hook: string; coreMessage: string; structure: string; recommendations: string }> => {
    try {
        checkAIAvailability();

        const systemPrompt = `Ты эксперт по анализу контента в Instagram Reels с глубоким пониманием механики виральности.

Твоя задача - разобрать контент на ключевые элементы:
1. Хук - что останавливает скролл в первые 3 секунды
2. Основное сообщение - ключевая идея контента
3. Структура - как построен сценарий
4. Рекомендации - что можно улучшить или адаптировать`;

        const userPrompt = `Проанализируй этот Instagram Reels контент:

${caption}

Дай структурированный анализ:

**ХУК (первые 3 секунды):**
[Что цепляет внимание]

**ОСНОВНОЕ СООБЩЕНИЕ:**
[Ключевая идея, которую несет контент]

**СТРУКТУРА:**
[Как построен сценарий, какие элементы использованы]

**РЕКОМЕНДАЦИИ:**
[Что работает хорошо, что можно улучшить, как адаптировать]`;

        const messages = [
            { role: 'user', content: userPrompt }
        ];

        const response = await callClaudeWithTimeout(messages, systemPrompt, 2048);
        
        // Parse the structured response
        const lines = response.split('\n').filter(l => l.trim());
        let hook = '';
        let coreMessage = '';
        let structure = '';
        let recommendations = '';
        let currentSection = '';

        for (const line of lines) {
            if (line.includes('**ХУК')) currentSection = 'hook';
            else if (line.includes('**ОСНОВНОЕ СООБЩЕНИЕ')) currentSection = 'core';
            else if (line.includes('**СТРУКТУРА')) currentSection = 'structure';
            else if (line.includes('**РЕКОМЕНДАЦИИ')) currentSection = 'recommendations';
            else if (line.trim() && !line.startsWith('**')) {
                const text = line.replace(/^\*\*|\*\*$/g, '').trim();
                if (currentSection === 'hook') hook += text + '\n';
                else if (currentSection === 'core') coreMessage += text + '\n';
                else if (currentSection === 'structure') structure += text + '\n';
                else if (currentSection === 'recommendations') recommendations += text + '\n';
            }
        }

        return {
            hook: hook.trim() || 'Не определен',
            coreMessage: coreMessage.trim() || 'Не определено',
            structure: structure.trim() || 'Не определена',
            recommendations: recommendations.trim() || 'Нет рекомендаций'
        };
    } catch (error) {
        safeLog(error, 'analyzeInstagramContent');
        throw new Error('Ошибка при анализе Instagram контента');
    }
};

/**
 * Rewrite competitor idea for your niche
 */
export const rewriteCompetitorIdea = async (
    sourceContent: string,
    myTopic: string,
    platform: SocialPlatform
): Promise<{ title: string; description: string }> => {
    try {
        checkAIAvailability();

        const config = platformConfigs[platform];

        const systemPrompt = `Ты креативный копирайтер, специализирующийся на адаптации контент-идей.

Твоя задача - не копировать, а создать оригинальный контент, вдохновленный удачной идеей конкурента:
1. Сохранить работающую механику
2. Адаптировать под новую тему
3. Добавить уникальность
4. Сделать готовым к производству`;

        const userPrompt = `Адаптируй эту контент-идею под мою тему:

ИСХОДНЫЙ КОНТЕНТ:
${sourceContent}

МОЯ ТЕМА: ${myTopic}
ПЛАТФОРМА: ${config.platform}

Требования:
- Сохрани работающую структуру и механику вовлечения
- Полностью адаптируй под новую тему
- Создай оригинальный контент, а не копию
- Сделай готовым к производству

Верни в формате:

НАЗВАНИЕ:
[Короткое цепляющее название]

СЦЕНАРИЙ:
[Детальный сценарий для ${config.platform}]

Не добавляй дополнительные комментарии.`;

        const messages = [
            { role: 'user', content: userPrompt }
        ];

        const response = await callClaudeWithTimeout(messages, systemPrompt, 3072);
        
        // Parse title and description
        const parts = response.split('СЦЕНАРИЙ:');
        const titlePart = parts[0]?.replace('НАЗВАНИЕ:', '').trim() || 'Новая идея контента';
        const descriptionPart = parts[1]?.trim() || response;

        return {
            title: titlePart,
            description: descriptionPart
        };
    } catch (error) {
        safeLog(error, 'rewriteCompetitorIdea');
        throw new Error('Ошибка при переписывании идеи конкурента');
    }
};

export default {
    generateContentScript,
    generateCarouselSlides,
    repurposeContent,
    analyzeCompetitor,
    generateContentIdeas,
    generateStrategicPlan,
    analyzeInstagramContent,
    rewriteCompetitorIdea
};
