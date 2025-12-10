
import { Task, Column, User, Competitor, DEFAULT_COLUMNS, TeamMember, Project } from '../types';
import { auth, db, FirebaseConfig } from './firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut as firebaseSignOut, 
    onAuthStateChanged
} from 'firebase/auth';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    setDoc,
    where,
    writeBatch
} from 'firebase/firestore';

const KEYS = {
    USER: 'psycho_user',
    PROJECTS: 'psycho_projects',
    TASKS: 'psycho_tasks',
    COLUMNS: 'psycho_columns',
    COMPETITORS: 'psycho_competitors',
    TEAM: 'psycho_team',
    ACTIVE_PROJECT_ID: 'psycho_active_project_id'
};

// Helper to safely log errors without circular structure issues
const safeError = (context: string, err: any) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${context}]`, msg);
};

class DataService {
    private currentUser: User | null = null;
    private isOfflineMode = false;
    private activeProjectId: string | null = null;
    private cachedProjects: Project[] = []; 
    
    private projectListeners: ((projects: Project[]) => void)[] = [];
    private activeProjectListeners: ((projectId: string | null) => void)[] = [];
    private taskListeners: ((tasks: Task[]) => void)[] = [];
    private columnListeners: ((cols: Column[]) => void)[] = [];
    private competitorListeners: ((comps: Competitor[]) => void)[] = [];
    private teamListeners: ((members: TeamMember[]) => void)[] = [];
    private connectionListeners: ((isOnline: boolean) => void)[] = [];
    
    private firebaseUnsubscribes: Record<string, () => void> = {};

    constructor() {
        const storedUser = localStorage.getItem(KEYS.USER);
        if (storedUser) {
            try { this.currentUser = JSON.parse(storedUser); } catch(e) {}
        }

        const storedProjects = localStorage.getItem(KEYS.PROJECTS);
        if (storedProjects) {
            try {
                this.cachedProjects = JSON.parse(storedProjects);
            } catch(e) { this.cachedProjects = []; }
        }

        this.activeProjectId = localStorage.getItem(KEYS.ACTIVE_PROJECT_ID);

        // Fail-safe: Ensure at least one project exists
        if (this.cachedProjects.length === 0) {
            const defId = 'default_local';
            const defProject: Project = { 
                id: defId, 
                name: 'Мой Проект', 
                ownerId: this.currentUser?.id || 'guest', 
                createdAt: new Date().toISOString() 
            };
            this.cachedProjects = [defProject];
            localStorage.setItem(KEYS.PROJECTS, JSON.stringify(this.cachedProjects));
            
            const cols = DEFAULT_COLUMNS.map(c => ({ ...c, projectId: defId }));
            const existingCols = JSON.parse(localStorage.getItem(KEYS.COLUMNS) || '[]');
            localStorage.setItem(KEYS.COLUMNS, JSON.stringify([...existingCols, ...cols]));
        }

        if (!this.activeProjectId || !this.cachedProjects.find(p => p.id === this.activeProjectId)) {
            if (this.cachedProjects.length > 0) {
                this.activeProjectId = this.cachedProjects[0].id;
                localStorage.setItem(KEYS.ACTIVE_PROJECT_ID, this.activeProjectId);
            }
        }

        try {
            onAuthStateChanged(auth, async (user) => {
                if (!this.isOfflineMode && user) {
                    this.currentUser = {
                        id: user.uid,
                        name: user.displayName || user.email?.split('@')[0] || 'User',
                        email: user.email || '',
                        avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.uid}`
                    };
                    localStorage.setItem(KEYS.USER, JSON.stringify(this.currentUser));
                }
            }, (error) => {
                safeError('AuthObserver', error);
                this.enableOfflineMode();
            });
        } catch (e) {
            this.enableOfflineMode();
        }
    }

    isOnline() { return !this.isOfflineMode; }

    getActiveProjectId() { return this.activeProjectId; }

    setActiveProject(projectId: string) {
        if (!projectId) return;
        this.activeProjectId = projectId;
        localStorage.setItem(KEYS.ACTIVE_PROJECT_ID, projectId);
        this.activeProjectListeners.forEach(cb => cb(projectId));
    }

    subscribeToActiveProject(callback: (projectId: string | null) => void): () => void {
        this.activeProjectListeners.push(callback);
        callback(this.activeProjectId);
        return () => {
            this.activeProjectListeners = this.activeProjectListeners.filter(cb => cb !== callback);
        };
    }

    subscribeToConnectionStatus(callback: (isOnline: boolean) => void): () => void {
        this.connectionListeners.push(callback);
        callback(this.isOnline());
        return () => {
            this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
        };
    }
    
    enableOfflineMode() {
        if (this.isOfflineMode) return;
        console.warn("Switching to Offline Mode");
        this.isOfflineMode = true;
        this.connectionListeners.forEach(cb => cb(false));
    }
    
    connectFirebase(config: FirebaseConfig): boolean {
        try {
            localStorage.setItem('firebase_config', JSON.stringify(config));
            this.isOfflineMode = false;
            this.connectionListeners.forEach(cb => cb(true));
            return true;
        } catch (e) {
            return false;
        }
    }
    
    resetState() {
        this.currentUser = null;
        this.activeProjectId = null;
        localStorage.removeItem(KEYS.USER);
        localStorage.removeItem(KEYS.ACTIVE_PROJECT_ID);
    }

    // --- Helper for Robust Writes ---
    // If online write fails, automatically switch to offline and write locally
    private async safeWrite(
        onlineAction: () => Promise<void>,
        offlineAction: () => void,
        context: string
    ) {
        if (this.isOnline()) {
            try {
                await onlineAction();
                console.log(`✅ [${context}] Firebase запись успешна`);
                // В online режиме Firebase listeners сами обновят UI
                // Но для мгновенного отклика также вызываем offlineAction
                offlineAction();
            } catch (error) {
                console.warn(`[${context}] Operation failed, switching to offline:`, error);
                this.enableOfflineMode();
                offlineAction();
            }
        } else {
            console.log(`📴 [${context}] Offline режим, локальная запись`);
            offlineAction();
        }
    }

    async login(email: string, passOrName: string, isRegister: boolean = false): Promise<User> {
        if (this.isOfflineMode) {
            return this.mockLogin(email, passOrName);
        }

        try {
            let userCred;
            if (isRegister) {
                userCred = await createUserWithEmailAndPassword(auth, email, passOrName);
            } else {
                userCred = await signInWithEmailAndPassword(auth, email, passOrName);
            }

            const fbUser = userCred.user;
            const user: User = {
                id: fbUser.uid,
                name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
                email: fbUser.email || '',
                avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${fbUser.uid}`
            };
            this.currentUser = user;
            localStorage.setItem(KEYS.USER, JSON.stringify(user));
            return user;
        } catch (error: any) {
            const errorCode = error.code || '';
            const errorMessage = error.message || '';
            
            if (errorCode === 'auth/api-key-not-valid' || errorMessage.includes('api-key')) {
                this.enableOfflineMode();
                return this.mockLogin(email, passOrName);
            }
            throw error;
        }
    }

    async logout() {
        if (!this.isOfflineMode) {
            try { await firebaseSignOut(auth); } catch(e) {}
        }
        this.resetState();
    }
    
    private async mockLogin(email: string, pass: string): Promise<User> {
        const storedCreds = localStorage.getItem(`auth_${email}`);
        if (storedCreds) {
            if (storedCreds !== pass) throw new Error("Неверный пароль (Офлайн-режим)");
        } else {
            localStorage.setItem(`auth_${email}`, pass);
        }

        const user: User = {
            id: `offline_${email}`,
            name: email.split('@')[0],
            email: email,
            avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${email}`
        };
        this.currentUser = user;
        localStorage.setItem(KEYS.USER, JSON.stringify(user));
        return user;
    }

    getCurrentUser() { return this.currentUser; }

    async createProject(name: string): Promise<Project> {
        if (!this.currentUser) throw new Error("Not logged in");
        
        const baseProject = {
            name: name || 'New Project',
            ownerId: this.currentUser.id,
            createdAt: new Date().toISOString()
        };

        const createOffline = () => {
            const newProject: Project = { ...baseProject, id: `proj_${Date.now()}` };
            const projects = this.getLocalProjects();
            projects.push(newProject);
            this.notifyProjects(projects);
            this.setActiveProject(newProject.id);
            this.saveColumns(DEFAULT_COLUMNS.map(c => ({ ...c, projectId: newProject.id })));
            return newProject;
        };

        if (this.isOfflineMode) {
            return createOffline();
        } else {
             try {
                const docRef = await addDoc(collection(db, 'projects'), baseProject);
                const projectWithId: Project = { ...baseProject, id: docRef.id };
                
                for (const col of DEFAULT_COLUMNS) {
                    await addDoc(collection(db, 'columns'), { ...col, projectId: docRef.id });
                }
                
                this.setActiveProject(docRef.id);
                return projectWithId;
             } catch (e: any) {
                 console.warn("Create Project failed, switching to offline", e);
                 this.enableOfflineMode();
                 return createOffline();
             }
        }
    }

    async deleteProject(projectId: string) {
        if (!projectId) return;

        // Switch active project logic
        const remainingProjects = this.cachedProjects.filter(p => p.id !== projectId);
        let nextProjectId = null;

        if (remainingProjects.length > 0) {
            nextProjectId = remainingProjects[0].id;
        } else {
            const defId = `proj_def_${Date.now()}`;
            const defProj: Project = { id: defId, name: 'Мой Проект', ownerId: this.currentUser?.id || 'guest', createdAt: new Date().toISOString() };
            this.cachedProjects = [defProj];
            nextProjectId = defId;
        }

        if (this.activeProjectId === projectId) {
            this.setActiveProject(nextProjectId);
        }

        this.cachedProjects = remainingProjects.length > 0 ? remainingProjects : this.cachedProjects;
        this.notifyProjects(this.cachedProjects);

        await this.safeWrite(
            async () => { await deleteDoc(doc(db, 'projects', projectId)); },
            () => {
                localStorage.setItem(KEYS.PROJECTS, JSON.stringify(this.cachedProjects));
                const tasks = this.getLocalTasks().filter(t => t.projectId !== projectId);
                const cols = this.getLocalColumns().filter(c => c.projectId !== projectId);
                localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
                localStorage.setItem(KEYS.COLUMNS, JSON.stringify(cols));
            },
            'DeleteProject'
        );
    }
    
    async renameProject(projectId: string, newName: string) {
        await this.safeWrite(
            async () => {
                const docRef = doc(db, 'projects', projectId);
                await updateDoc(docRef, { name: newName });
            },
            () => {
                const projects = this.getLocalProjects();
                const p = projects.find(p => p.id === projectId);
                if (p) {
                    p.name = newName;
                    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
                    this.notifyProjects(projects);
                }
            },
            'RenameProject'
        );
    }

    async joinProject(projectId: string) {
        if (this.isOnline()) {
            this.setActiveProject(projectId);
            if (this.currentUser) await this.addTeamMember(this.currentUser.email);
        }
    }

    getLocalProjects(): Project[] {
        return this.cachedProjects;
    }

    subscribeToProjects(callback: (projects: Project[]) => void): () => void {
        this.projectListeners.push(callback);
        callback(this.cachedProjects);

        if (!this.isOfflineMode) {
            if (!this.currentUser) return () => {};
            
            const q = query(collection(db, 'projects'));
            const unsub = onSnapshot(q, (snapshot) => {
                const projects = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id 
                } as Project));
                projects.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
                this.cachedProjects = projects;
                localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
                callback(projects);

                if (this.activeProjectId && !projects.find(p => p.id === this.activeProjectId)) {
                    if (projects.length > 0) this.setActiveProject(projects[0].id);
                }
            }, (error) => {
                if (error.code === 'permission-denied' || error.code === 'unavailable') {
                    this.enableOfflineMode();
                }
            });
            this.firebaseUnsubscribes['projects'] = unsub;
        }

        return () => {
            this.projectListeners = this.projectListeners.filter(cb => cb !== callback);
            if (this.projectListeners.length === 0 && this.firebaseUnsubscribes['projects']) {
                this.firebaseUnsubscribes['projects']();
            }
        };
    }

    private notifyProjects(projects: Project[]) {
        this.cachedProjects = projects;
        localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
        this.projectListeners.forEach(cb => cb(projects));
    }

    getLocalColumns(): Column[] {
        return JSON.parse(localStorage.getItem(KEYS.COLUMNS) || '[]');
    }

    subscribeToColumns(callback: (columns: Column[]) => void): () => void {
        this.columnListeners.push(callback);
        const projectId = this.activeProjectId;
        const local = this.getLocalColumns().filter(c => c.projectId === projectId);
        if (local.length > 0) callback(local);

        if (!this.isOfflineMode && projectId) {
            const q = query(collection(db, 'columns'), where('projectId', '==', projectId));
            const unsub = onSnapshot(q, (snapshot) => {
                const cols = snapshot.docs.map(doc => {
                    const data = doc.data() as any;
                    return { ...data, id: doc.id, systemId: data.id } as Column;
                });
                callback(cols);
            });
            this.firebaseUnsubscribes['columns'] = unsub;
        }
        return () => { this.columnListeners = this.columnListeners.filter(cb => cb !== callback); };
    }
    
    async saveColumns(columns: Column[]) {
        // Simple offline implementation for bulk save, can be expanded for online if needed
        const projectId = columns[0]?.projectId;
        if (!projectId) return;
        let all = this.getLocalColumns().filter(c => c.projectId !== projectId);
        all = [...all, ...columns];
        localStorage.setItem(KEYS.COLUMNS, JSON.stringify(all));
        this.notifyColumns(all.filter(c => c.projectId === projectId));
    }
    
    private notifyColumns(cols: Column[]) { this.columnListeners.forEach(cb => cb(cols)); }

    getLocalTasks(): Task[] { return JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]'); }

    subscribeToTasks(callback: (tasks: Task[]) => void): () => void {
        this.taskListeners.push(callback);
        const projectId = this.activeProjectId;
        
        const local = this.getLocalTasks().filter(t => t.projectId === projectId);
        if (local.length > 0) callback(local);

        if (!this.isOfflineMode && projectId) {
            const q = query(collection(db, 'tasks'), where('projectId', '==', projectId));
            const unsub = onSnapshot(q, (snapshot) => {
                const tasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
                callback(tasks);
            });
            this.firebaseUnsubscribes['tasks'] = unsub;
        }
        return () => { this.taskListeners = this.taskListeners.filter(cb => cb !== callback); };
    }

    async addTask(task: Task) {
        await this.safeWrite(
            async () => { await setDoc(doc(db, 'tasks', task.id), task); },
            () => {
                const tasks = this.getLocalTasks();
                tasks.push(task);
                localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
                this.notifyTasks(tasks.filter(t => t.projectId === task.projectId));
            },
            'AddTask'
        );
    }

    async updateTask(taskId: string, updates: Partial<Task>) {
        await this.safeWrite(
            async () => { await updateDoc(doc(db, 'tasks', taskId), updates); },
            () => {
                const tasks = this.getLocalTasks();
                const index = tasks.findIndex(t => t.id === taskId);
                if (index !== -1) {
                    tasks[index] = { ...tasks[index], ...updates };
                    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
                    this.notifyTasks(tasks.filter(t => t.projectId === tasks[index].projectId));
                }
            },
            'UpdateTask'
        );
    }

    async deleteTask(taskId: string) {
        await this.safeWrite(
            async () => { await deleteDoc(doc(db, 'tasks', taskId)); },
            () => {
                let tasks = this.getLocalTasks();
                const task = tasks.find(t => t.id === taskId);
                tasks = tasks.filter(t => t.id !== taskId);
                localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
                if (task) this.notifyTasks(tasks.filter(t => t.projectId === task.projectId));
            },
            'DeleteTask'
        );
    }

    private notifyTasks(tasks: Task[]) { this.taskListeners.forEach(cb => cb(tasks)); }
    
    getLocalCompetitors(): Competitor[] { return JSON.parse(localStorage.getItem(KEYS.COMPETITORS) || '[]'); }

    subscribeToCompetitors(callback: (comps: Competitor[]) => void): () => void {
        this.competitorListeners.push(callback);
        const projectId = this.activeProjectId;
        const local = this.getLocalCompetitors().filter(c => c.projectId === projectId);
        if (local.length > 0) callback(local);

        if (!this.isOfflineMode && projectId) {
             const q = query(collection(db, 'competitors'), where('projectId', '==', projectId));
             const unsub = onSnapshot(q, (snapshot) => {
                const comps = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Competitor));
                callback(comps);
             });
             this.firebaseUnsubscribes['competitors'] = unsub;
        }
        return () => { this.competitorListeners = this.competitorListeners.filter(cb => cb !== callback); };
    }
    
    async addCompetitor(competitor: Competitor) {
        await this.safeWrite(
            async () => { await setDoc(doc(db, 'competitors', competitor.id), competitor); },
            () => {
                const comps = this.getLocalCompetitors();
                comps.push(competitor);
                localStorage.setItem(KEYS.COMPETITORS, JSON.stringify(comps));
                this.notifyCompetitors(comps.filter(c => c.projectId === competitor.projectId));
            },
            'AddCompetitor'
        );
    }
    
    private notifyCompetitors(comps: Competitor[]) { this.competitorListeners.forEach(cb => cb(comps)); }
    
    subscribeToTeam(callback: (members: TeamMember[]) => void): () => void {
        this.teamListeners.push(callback);
        const projectId = this.activeProjectId;
        
        if (this.isOfflineMode) {
             const team = this.getLocalTeam().filter(m => m.projectId === projectId);
             callback(team);
        } else {
             if (!projectId) return () => {};
             const q = query(collection(db, 'team'), where('projectId', '==', projectId));
             const unsub = onSnapshot(q, (snapshot) => {
                 const members = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TeamMember));
                 callback(members);
             });
             this.firebaseUnsubscribes['team'] = unsub;
        }
        return () => { this.teamListeners = this.teamListeners.filter(cb => cb !== callback); };
    }

    async addTeamMember(email: string) {
        const projectId = this.activeProjectId;
        if (!projectId) return;

        const newMember: TeamMember = {
            id: `tm_${Date.now()}`,
            projectId,
            email,
            name: email.split('@')[0],
            avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${email}`,
            role: 'editor',
            addedAt: new Date().toISOString()
        };

        await this.safeWrite(
            async () => { await setDoc(doc(db, 'team', newMember.id), newMember); },
            () => {
                const team = this.getLocalTeam();
                team.push(newMember);
                localStorage.setItem(KEYS.TEAM, JSON.stringify(team));
                this.notifyTeam(team.filter(m => m.projectId === projectId));
            },
            'AddTeamMember'
        );
    }

    async removeTeamMember(id: string) {
        await this.safeWrite(
            async () => { await deleteDoc(doc(db, 'team', id)); },
            () => {
                let team = this.getLocalTeam();
                team = team.filter(m => m.id !== id);
                localStorage.setItem(KEYS.TEAM, JSON.stringify(team));
                this.notifyTeam(team.filter(m => m.projectId === this.activeProjectId));
            },
            'RemoveTeamMember'
        );
    }

    getLocalTeam(): TeamMember[] { return JSON.parse(localStorage.getItem(KEYS.TEAM) || '[]'); }
    private notifyTeam(members: TeamMember[]) { this.teamListeners.forEach(cb => cb(members)); }
}

export const storageService = new DataService();
