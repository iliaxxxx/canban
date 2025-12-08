
export type ColumnId = string; // Changed from literal union to string to allow custom columns

export type SocialPlatform = 'instagram_reels' | 'instagram_post' | 'telegram' | 'tiktok' | 'youtube' | 'threads' | 'custom';

export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string; // Optional custom avatar
    role?: 'admin' | 'editor' | 'viewer';
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    createdAt: string;
}

export interface TeamMember {
    id: string;
    projectId: string; // Link to specific project
    email: string;
    name: string;
    avatarUrl: string;
    role: 'admin' | 'editor' | 'viewer';
    addedAt: string;
}

export interface Slide {
    id: string;
    title: string;
    content: string;
}

export interface Task {
  id: string;
  projectId: string; // Link to specific project
  title: string;
  description?: string;
  columnId: ColumnId;
  platform: SocialPlatform; 
  date?: string; 
  carouselSlides?: Slide[];
  authorId?: string; // Who created this task
}

export interface Column {
  id: ColumnId;
  systemId?: string; // Original logical ID (ideas, scripting) for UI logic
  projectId: string; // Link to specific project
  title: string;
  color?: string; // For custom styling
}

export interface CompetitorPost {
    id: string;
    url: string;
    caption: string;
    type: 'Image' | 'Video' | 'Sidecar'; 
    likesCount: number;
    commentsCount: number;
    videoViewCount?: number;
    timestamp: string;
    isViral?: boolean; 
}

export interface Competitor {
  id: string;
  projectId: string; // Link to specific project
  name: string;
  platform: SocialPlatform;
  url?: string;
  followers?: string;
  notes: string;
  strengths: string[];
  weaknesses: string[];
  lastScraped?: string; 
  posts?: CompetitorPost[];
}

export interface InstagramAnalysisResult {
    type: 'profile' | 'reel';
    data: any; 
    aiAnalysis?: {
        hook: string;
        coreMessage: string;
        structure: string;
        tone: string;
    };
}

export interface AutomationRule {
    id: string;
    projectId: string;
    title: string;
    isActive: boolean;
    trigger: {
        type: string;
        keywords: string[];
    };
    action: {
        type: string;
        text: string;
    };
    stats: {
        fired: number;
    };
}

export const DEFAULT_COLUMNS: Omit<Column, 'projectId'>[] = [
  { id: 'ideas', title: '💡 Идеи', color: 'bg-yellow-500/10' },
  { id: 'scripting', title: '✍️ Сценарий', color: 'bg-blue-500/10' },
  { id: 'filming', title: '🎥 В работе', color: 'bg-red-500/10' },
  { id: 'done', title: '✅ Опубликовано', color: 'bg-green-500/10' },
];
