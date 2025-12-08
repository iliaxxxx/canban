# 💡 Примеры использования claudeService

## Базовый импорт

```typescript
import {
  generateContentIdeas,
  generateContentScript,
  generateCarouselSlides,
  repurposeContent,
  analyzeInstagramContent,
  rewriteCompetitorIdea
} from './services/claudeService';
```

---

## 1. Генерация идей контента

### Простой пример
```typescript
const ideas = await generateContentIdeas(
  'Как начать свой бизнес',
  'Бизнес-коуч'
);

// Результат:
// [
//   {
//     title: "5 ошибок начинающих предпринимателей",
//     description: "Разбираю реальные кейсы...",
//     platform: "instagram_reels"
//   },
//   ...
// ]
```

### С указанием платформы
```typescript
const ideas = await generateContentIdeas(
  'Правильное питание',
  'Нутрициолог',
  'instagram_reels', // конкретная платформа
  'Дружелюбный', // тон
  'talking_head' // формат для reels
);
```

### Для всех платформ (микс)
```typescript
const ideas = await generateContentIdeas(
  'Психология отношений',
  'Психолог',
  'all', // генерирует для разных платформ
  'Эмпатичный'
);
```

### Параметры tone (тональность)
```typescript
// Популярные варианты:
'Вдохновляющий'
'Дружелюбный'
'Профессиональный'
'Дерзкий'
'Экспертный'
'Юмористический'
'Эмпатичный'
'Мотивирующий'
```

### Параметры reelsFormat
```typescript
'mix' // микс форматов (default)
'talking_head' // говорящая голова, монолог
'scenario' // сценарный, игровой контент
```

---

## 2. Создание детального сценария

```typescript
const task = {
  id: '123',
  title: '5 способов увеличить продажи',
  description: 'Расскажу про эффективные стратегии',
  platform: 'instagram_reels',
  status: 'todo',
  createdAt: new Date().toISOString()
};

const script = await generateContentScript(task);

// Результат - полный сценарий:
// ХУК:
// "Теряете клиентов? Вот что вы делаете не так..."
// 
// ОСНОВНАЯ ЧАСТЬ:
// "Первый способ - персонализация..."
// ...
```

### Сценарий для разных платформ

**Instagram Reels (Talking Head):**
```typescript
// Возвращает: сплошной текст для чтения на камеру
// с хуком, основной частью и CTA
```

**TikTok / YouTube Shorts:**
```typescript
// Возвращает: покадровый сценарий
// 1. Хук (0-3 сек)
// 2. Основная часть
// 3. CTA
// 4. Описание
```

**Instagram Post:**
```typescript
// Возвращает: структуру карусели
// Слайд 1: Обложка
// Слайд 2-N: Контент
// + Caption для поста
```

**Telegram:**
```typescript
// Возвращает: готовый текст поста с Markdown
```

**Threads:**
```typescript
// Возвращает: 3 варианта
// 1. Триггерный вброс
// 2. Relatable контент
// 3. Мини-тред
```

---

## 3. Генерация карусели

```typescript
const slides = await generateCarouselSlides(
  'Как побороть прокрастинацию'
);

// Результат:
// [
//   {
//     title: "Почему вы откладываете дела?",
//     content: "90% людей страдают от прокрастинации..."
//   },
//   {
//     title: "Способ №1: Правило 2 минут",
//     content: "Если задача занимает меньше 2 минут..."
//   },
//   ...
//   {
//     title: "Начни прямо сейчас!",
//     content: "Какое дело ты отложишь первым? Напиши в комментах!"
//   }
// ]
```

### Использование в UI
```typescript
const CarouselPreview = () => {
  const [slides, setSlides] = useState([]);
  
  const handleGenerate = async () => {
    const result = await generateCarouselSlides(topic);
    setSlides(result);
  };
  
  return (
    <div>
      {slides.map((slide, idx) => (
        <div key={idx} className="slide">
          <h3>Слайд {idx + 1}: {slide.title}</h3>
          <p>{slide.content}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## 4. Переупаковка контента

```typescript
const originalTask = {
  id: '456',
  title: 'Топ-5 лайфхаков для продуктивности',
  description: 'Как успевать больше за меньшее время',
  platform: 'instagram_reels',
  status: 'done',
  createdAt: new Date().toISOString()
};

const adaptations = await repurposeContent(originalTask);

// Результат - 2 адаптации:
// [
//   {
//     title: "5 лайфхаков продуктивности для удалёнки",
//     description: "Углублённый разбор методов...",
//     platform: "telegram"
//   },
//   {
//     title: "Продуктивность за 60 секунд",
//     description: "Быстрые советы...",
//     platform: "youtube"
//   }
// ]
```

### Автоматизация переупаковки
```typescript
const repurposeAllContent = async (tasks: Task[]) => {
  const allAdaptations = [];
  
  for (const task of tasks.filter(t => t.status === 'done')) {
    const adaptations = await repurposeContent(task);
    allAdaptations.push(...adaptations);
  }
  
  return allAdaptations;
};
```

---

## 5. Анализ контента конкурентов

```typescript
const competitorText = `
Устала от бесконечных диет? 
Вот 3 простых правила, которые изменят твоё тело за месяц...
`;

const analysis = await analyzeInstagramContent(competitorText);

// Результат:
// {
//   hook: "Риторический вопрос + боль аудитории",
//   coreMessage: "Простота вместо сложности, быстрый результат",
//   structure: "Хук → Обещание → Список правил → CTA",
//   tone: "Мотивирующий, дружелюбный, без давления"
// }
```

### Использование анализа
```typescript
const CompetitorAnalyzer = ({ text }: { text: string }) => {
  const [analysis, setAnalysis] = useState(null);
  
  const handleAnalyze = async () => {
    const result = await analyzeInstagramContent(text);
    setAnalysis(result);
  };
  
  return (
    <div>
      <button onClick={handleAnalyze}>Анализировать</button>
      {analysis && (
        <div className="analysis">
          <div>
            <strong>Хук:</strong> {analysis.hook}
          </div>
          <div>
            <strong>Основной посыл:</strong> {analysis.coreMessage}
          </div>
          <div>
            <strong>Структура:</strong> {analysis.structure}
          </div>
          <div>
            <strong>Тон:</strong> {analysis.tone}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 6. Адаптация идеи конкурента

```typescript
const competitorPost = `
Хватит бояться камеры! 
Вот 5 упражнений, которые помогут тебе...
`;

const myTopic = 'продажи в прямом эфире';

const adapted = await rewriteCompetitorIdea(
  competitorPost,
  myTopic,
  'instagram_reels'
);

// Результат:
// {
//   title: "Хватит бояться продавать в прямом эфире!",
//   description: "5 техник, которые превратят страх в уверенность..."
// }
```

### Пакетная адаптация
```typescript
const adaptMultipleIdeas = async (
  competitorTexts: string[],
  myTopic: string
) => {
  const adaptations = await Promise.all(
    competitorTexts.map(text => 
      rewriteCompetitorIdea(text, myTopic)
    )
  );
  
  return adaptations;
};
```

---

## 7. Обработка ошибок

### Базовая обработка
```typescript
try {
  const ideas = await generateContentIdeas(topic, niche);
  console.log('Успешно:', ideas);
} catch (error) {
  console.error('Ошибка генерации:', error);
  // Показать пользователю уведомление
}
```

### С фоллбэком
```typescript
const generateWithFallback = async (topic: string) => {
  try {
    return await generateContentIdeas(topic);
  } catch (error) {
    console.error('AI недоступен, используем шаблоны');
    return [
      {
        title: 'Идея 1',
        description: 'Создайте контент на тему: ' + topic,
        platform: 'instagram_reels'
      }
    ];
  }
};
```

### Показ прогресса
```typescript
const GeneratorWithProgress = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const generate = async () => {
    setIsLoading(true);
    setProgress(20);
    
    try {
      setProgress(40);
      const ideas = await generateContentIdeas(topic, niche);
      setProgress(100);
      return ideas;
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };
  
  return (
    <div>
      {isLoading && (
        <div className="progress-bar">
          <div style={{ width: `${progress}%` }} />
        </div>
      )}
      <button onClick={generate} disabled={isLoading}>
        {isLoading ? 'Генерация...' : 'Сгенерировать'}
      </button>
    </div>
  );
};
```

---

## 8. Оптимизация и кэширование

### Кэширование результатов
```typescript
const cache = new Map();

const getCachedOrGenerate = async (
  key: string,
  generator: () => Promise<any>
) => {
  if (cache.has(key)) {
    console.log('Используем кэш');
    return cache.get(key);
  }
  
  const result = await generator();
  cache.set(key, result);
  return result;
};

// Использование:
const ideas = await getCachedOrGenerate(
  `ideas-${topic}-${niche}`,
  () => generateContentIdeas(topic, niche)
);
```

### Batch генерация
```typescript
const generateBatch = async (topics: string[]) => {
  // Генерируем последовательно, чтобы избежать rate limits
  const results = [];
  
  for (const topic of topics) {
    const ideas = await generateContentIdeas(topic, niche);
    results.push({ topic, ideas });
    
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
};
```

---

## 9. Интеграция с React компонентами

### Хук для генерации
```typescript
const useContentGenerator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generate = async (
    topic: string,
    niche: string,
    platform?: string
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const ideas = await generateContentIdeas(topic, niche, platform);
      return ideas;
    } catch (err) {
      setError('Не удалось сгенерировать идеи');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { generate, isLoading, error };
};

// Использование:
const MyComponent = () => {
  const { generate, isLoading, error } = useContentGenerator();
  
  const handleGenerate = async () => {
    const ideas = await generate('fitness', 'Тренер');
    console.log(ideas);
  };
  
  return (
    <div>
      <button onClick={handleGenerate} disabled={isLoading}>
        Генерировать
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
};
```

---

## 10. Продвинутые примеры

### Пайплайн генерации контента
```typescript
const generateContentPipeline = async (topic: string) => {
  // 1. Генерируем идеи
  const ideas = await generateContentIdeas(topic, niche, 'all');
  
  // 2. Создаём задачи из идей
  const tasks = ideas.map((idea, idx) => ({
    id: `task-${idx}`,
    ...idea,
    status: 'todo' as const,
    createdAt: new Date().toISOString()
  }));
  
  // 3. Генерируем сценарии для каждой
  const scriptsPromises = tasks.map(task => 
    generateContentScript(task)
  );
  const scripts = await Promise.all(scriptsPromises);
  
  // 4. Создаём финальные задачи с сценариями
  return tasks.map((task, idx) => ({
    ...task,
    script: scripts[idx]
  }));
};
```

### Система рекомендаций
```typescript
const recommendNextContent = async (completedTasks: Task[]) => {
  // Анализируем успешный контент
  const bestPerformers = completedTasks
    .filter(t => t.engagement > 1000)
    .slice(0, 3);
  
  // Генерируем похожие идеи
  const recommendations = await Promise.all(
    bestPerformers.map(task => 
      repurposeContent(task)
    )
  );
  
  return recommendations.flat();
};
```

---

## 🎯 Best Practices

1. **Всегда обрабатывайте ошибки**
2. **Используйте индикаторы загрузки**
3. **Кэшируйте результаты где возможно**
4. **Добавляйте задержки между массовыми запросами**
5. **Предоставляйте фоллбэки для пользователя**
6. **Логируйте ошибки для отладки**

---

## 📊 Мониторинг использования

```typescript
let requestCount = 0;
let totalTokens = 0;

const trackUsage = (tokens: number) => {
  requestCount++;
  totalTokens += tokens;
  
  console.log(`Запросов: ${requestCount}`);
  console.log(`Токенов использовано: ${totalTokens}`);
  console.log(`Примерная стоимость: $${(totalTokens / 1000000 * 3).toFixed(4)}`);
};
```

Готово! Теперь у вас есть полный набор примеров использования claudeService 🚀
