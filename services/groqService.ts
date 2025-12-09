import { InstagramAnalysisResult } from '../types';

interface GroqResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
    error?: {
        message: string;
        type: string;
    };
}

export const analyzeReelWithGroq = async (text: string, apiKey: string): Promise<{ hook: string; coreMessage: string; structure: string; tone: string }> => {
    if (!apiKey) throw new Error("Groq API Key is missing");

    const prompt = `
        Ты - профессиональный сценарист Reels. Твоя задача - деконструировать этот текст (описание видео) и восстановить структуру сценария.
        
        Текст видео:
        "${text.substring(0, 3000)}"

        Проанализируй и верни JSON (СТРОГО JSON, без лишнего текста):
        {
            "hook": "Первая фраза или визуальный триггер, который цепляет (до 15 слов)",
            "coreMessage": "Главная мысль/польза видео в 1 предложении",
            "structure": "Скелет сценария (например: Проблема -> Боль -> Решение -> CTA)",
            "tone": "Тональность автора (например: Агрессивный, Заботливый, Экспертный)"
        }
    `;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.5,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            let errMsg = `Groq API Error (${response.status})`;
            try {
                const errJson = JSON.parse(errBody);
                if (errJson.error?.message) errMsg += `: ${errJson.error.message}`;
            } catch (e) {
                errMsg += `: ${errBody}`;
            }
            throw new Error(errMsg);
        }

        const data: GroqResponse = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error("Groq returned empty choices. Check API Key or Model availability.");
        }

        const content = data.choices[0]?.message?.content || "{}";
        return JSON.parse(content);

    } catch (error: any) {
        console.error("Groq Analysis Error:", error instanceof Error ? error.message : String(error));
        return { 
            hook: "Ошибка анализа", 
            coreMessage: error.message || "Не удалось обработать текст", 
            structure: "Попробуйте позже", 
            tone: "N/A" 
        };
    }
};

export const rewriteReelWithGroq = async (
    originalAnalysis: { hook: string; coreMessage: string; structure: string },
    myNiche: string,
    apiKey: string
): Promise<{ title: string; description: string }> => {
    if (!apiKey) throw new Error("Groq API Key is missing");

    const prompt = `
        Ты - топовый креатор InstaiOS.
        Твоя задача: Взять УСПЕШНУЮ структуру вирусного рилса и адаптировать её под ДРУГУЮ нишу.
        
        ИСХОДНЫЕ ДАННЫЕ (ЧУЖОЙ РИЛС):
        - Хук: "${originalAnalysis.hook}"
        - Суть: "${originalAnalysis.coreMessage}"
        - Структура: "${originalAnalysis.structure}"
        
        МОЯ НИША / ТЕМА: "${myNiche}"
        
        ЗАДАЧА:
        Напиши идею для моего рилса, используя ту же структуру и логику удержания, но на мою тему.
        
        Верни JSON:
        {
            "title": "Кликбейтный заголовок для обложки (на мою тему)",
            "description": "Покадровый сценарий (Хук -> Суть -> Призыв)"
        }
    `;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            let errMsg = `Groq API Error (${response.status})`;
            try {
                const errJson = JSON.parse(errBody);
                if (errJson.error?.message) errMsg += `: ${errJson.error.message}`;
            } catch (e) {
                errMsg += `: ${errBody}`;
            }
            throw new Error(errMsg);
        }

        const data: GroqResponse = await response.json();

        if (!data.choices || data.choices.length === 0) {
             throw new Error("Groq returned empty choices.");
        }

        const content = data.choices[0]?.message?.content || "{}";
        return JSON.parse(content);
    } catch (error: any) {
        console.error("Groq Rewrite Error:", error instanceof Error ? error.message : String(error));
        return { title: "Ошибка генерации", description: error.message || "Попробуйте позже" };
    }
};