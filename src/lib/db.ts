import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { SavedJob, ApplicationEvent } from '@/types/job';

export interface ApplicationRecord {
  id: string;
  user_id: string;
  job: SavedJob;
  status: SavedJob['status'];
  applied_at?: string;
  follow_up_at?: string;
  follow_up_count: number;
  contact_name?: string;
  contact_email?: string;
  contact_linkedin?: string;
  timeline: ApplicationEvent[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  salt: string;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface ChatSessionRecord {
  id: string;
  user_id: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    jobs?: unknown[];
    suggested_queries?: string[];
    extracted_filters?: Record<string, unknown>;
  }>;
  created_at: string;
  updated_at: string;
}

export interface CVRecord {
  id: string;
  user_id: string;
  title: string;
  text: string;
  score?: number;
  review?: Record<string, unknown>;
  created_at: string;
}

export interface TransactionRecord {
  id: string;
  user_id: string;
  type: 'initial_bonus' | 'purchase' | 'usage';
  amount?: number;
  currency?: string;
  credits_delta: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  sessions: SessionRecord[];
  chats: ChatSessionRecord[];
  resumes: CVRecord[];
  transactions: TransactionRecord[];
  applications: ApplicationRecord[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL_DB: DatabaseSchema = {
  users: [],
  sessions: [],
  chats: [],
  resumes: [],
  transactions: [],
  applications: [],
};

function ensureDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
      return { ...INITIAL_DB };
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    return {
      users: parsed.users || [],
      sessions: parsed.sessions || [],
      chats: parsed.chats || [],
      resumes: parsed.resumes || [],
      transactions: parsed.transactions || [],
      applications: parsed.applications || [],
    };
  } catch (err) {
    console.error('Database initialization error:', err);
    return { ...INITIAL_DB };
  }
}

function writeDb(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

// ================= USER OPERATIONS ================= //

export function getUserByEmail(email: string): UserRecord | null {
  const db = ensureDb();
  const normalized = email.trim().toLowerCase();
  return db.users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export function getUserById(id: string): UserRecord | null {
  const db = ensureDb();
  return db.users.find((u) => u.id === id) || null;
}

export function createUser(userData: {
  name: string;
  email: string;
  password_hash: string;
  salt: string;
  initialCredits?: number;
}): UserRecord {
  const db = ensureDb();
  const now = new Date().toISOString();
  const initialCredits = userData.initialCredits ?? 25; // 25 free credits on sign up
  const newUser: UserRecord = {
    id: `user_${crypto.randomUUID()}`,
    name: userData.name.trim(),
    email: userData.email.trim().toLowerCase(),
    password_hash: userData.password_hash,
    salt: userData.salt,
    credits: initialCredits,
    created_at: now,
    updated_at: now,
  };

  db.users.push(newUser);

  // Record initial welcome bonus transaction
  const initialTx: TransactionRecord = {
    id: `tx_${crypto.randomUUID()}`,
    user_id: newUser.id,
    type: 'initial_bonus',
    credits_delta: initialCredits,
    balance_after: initialCredits,
    description: 'Welcome bonus on sign up',
    created_at: now,
  };
  db.transactions.push(initialTx);

  writeDb(db);
  return newUser;
}

export function updateUserCredits(
  userId: string,
  delta: number,
  type: TransactionRecord['type'],
  description: string,
  amountPaid?: number,
  currency?: string
): { success: boolean; credits: number; error?: string } {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return { success: false, credits: 0, error: 'User not found' };
  }

  const newCredits = user.credits + delta;
  if (newCredits < 0) {
    return { success: false, credits: user.credits, error: 'Insufficient credits' };
  }

  user.credits = newCredits;
  user.updated_at = new Date().toISOString();

  const tx: TransactionRecord = {
    id: `tx_${crypto.randomUUID()}`,
    user_id: userId,
    type,
    amount: amountPaid,
    currency: currency || (amountPaid ? 'USD' : undefined),
    credits_delta: delta,
    balance_after: newCredits,
    description,
    created_at: new Date().toISOString(),
  };
  db.transactions.push(tx);

  writeDb(db);
  return { success: true, credits: newCredits };
}

// ================= SESSION OPERATIONS ================= //

export function createSession(userId: string, durationDays = 30): SessionRecord {
  const db = ensureDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const token = crypto.randomBytes(32).toString('hex');

  const session: SessionRecord = {
    id: `sess_${crypto.randomUUID()}`,
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
  };

  db.sessions.push(session);
  writeDb(db);
  return session;
}

export function getSessionByToken(token: string): { session: SessionRecord; user: UserRecord } | null {
  const db = ensureDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    // Session expired
    return null;
  }

  const user = db.users.find((u) => u.id === session.user_id);
  if (!user) return null;

  return { session, user };
}

export function deleteSession(token: string): void {
  const db = ensureDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  writeDb(db);
}

// ================= CHAT HISTORY OPERATIONS ================= //

export function getUserChats(userId: string): ChatSessionRecord[] {
  const db = ensureDb();
  return db.chats
    .filter((c) => c.user_id === userId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function getChatById(chatId: string, userId: string): ChatSessionRecord | null {
  const db = ensureDb();
  return db.chats.find((c) => c.id === chatId && c.user_id === userId) || null;
}

export function saveChatSession(
  userId: string,
  chatData: {
    id?: string;
    title?: string;
    messages: ChatSessionRecord['messages'];
  }
): ChatSessionRecord {
  const db = ensureDb();
  const now = new Date().toISOString();
  let chat = chatData.id ? db.chats.find((c) => c.id === chatData.id && c.user_id === userId) : null;

  if (chat) {
    chat.messages = chatData.messages;
    if (chatData.title) chat.title = chatData.title;
    chat.updated_at = now;
  } else {
    // Generate an automatic title from first user message if not provided
    const firstUserMsg = chatData.messages.find((m) => m.role === 'user')?.content || 'Job Search';
    const title = chatData.title || (firstUserMsg.length > 36 ? `${firstUserMsg.slice(0, 36)}...` : firstUserMsg);

    chat = {
      id: chatData.id || `chat_${crypto.randomUUID()}`,
      user_id: userId,
      title,
      messages: chatData.messages,
      created_at: now,
      updated_at: now,
    };
    db.chats.push(chat);
  }

  writeDb(db);
  return chat;
}

export function deleteChatSession(chatId: string, userId: string): boolean {
  const db = ensureDb();
  const initialCount = db.chats.length;
  db.chats = db.chats.filter((c) => !(c.id === chatId && c.user_id === userId));
  const changed = db.chats.length !== initialCount;
  if (changed) writeDb(db);
  return changed;
}

// ================= CV & RESUME HISTORY OPERATIONS ================= //

export function getUserResumes(userId: string): CVRecord[] {
  const db = ensureDb();
  return db.resumes
    .filter((r) => r.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function saveUserResume(
  userId: string,
  data: {
    title: string;
    text: string;
    score?: number;
    review?: Record<string, unknown>;
  }
): CVRecord {
  const db = ensureDb();
  const now = new Date().toISOString();
  const record: CVRecord = {
    id: `cv_${crypto.randomUUID()}`,
    user_id: userId,
    title: data.title,
    text: data.text,
    score: data.score,
    review: data.review,
    created_at: now,
  };
  db.resumes.push(record);
  writeDb(db);
  return record;
}

// ================= TRANSACTION HISTORY ================= //

export function getUserTransactions(userId: string): TransactionRecord[] {
  const db = ensureDb();
  return db.transactions
    .filter((t) => t.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ================= APPLICATIONS OPERATIONS ================= //

export function getUserApplications(userId: string): ApplicationRecord[] {
  const db = ensureDb();
  return db.applications
    .filter((a) => a.user_id === userId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function getApplicationById(appId: string, userId: string): ApplicationRecord | null {
  const db = ensureDb();
  return db.applications.find((a) => a.id === appId && a.user_id === userId) || null;
}

export function saveUserApplication(
  userId: string,
  data: {
    job: SavedJob;
    status?: string;
    notes?: string;
    contact_name?: string;
    contact_email?: string;
    contact_linkedin?: string;
  }
): ApplicationRecord {
  const db = ensureDb();
  const now = new Date().toISOString();
  
  const status = (data.status as SavedJob['status']) || 'saved';
  
  const timelineEvent: ApplicationEvent = {
    id: `event_${crypto.randomUUID()}`,
    type: status === 'applied' ? 'applied' : 'note',
    date: now,
    note: `Initial status: ${status}`
  };
  
  const record: ApplicationRecord = {
    id: `app_${crypto.randomUUID()}`,
    user_id: userId,
    job: data.job,
    status,
    notes: data.notes,
    contact_name: data.contact_name,
    contact_email: data.contact_email,
    contact_linkedin: data.contact_linkedin,
    follow_up_count: 0,
    timeline: [timelineEvent],
    created_at: now,
    updated_at: now,
    applied_at: status === 'applied' ? now : undefined
  };
  
  db.applications.push(record);
  writeDb(db);
  return record;
}

export function updateApplication(
  appId: string,
  userId: string,
  updates: Partial<Pick<ApplicationRecord, 'status' | 'follow_up_at' | 'follow_up_count' | 'contact_name' | 'contact_email' | 'contact_linkedin' | 'notes' | 'applied_at'>>
): ApplicationRecord | null {
  const db = ensureDb();
  const index = db.applications.findIndex(a => a.id === appId && a.user_id === userId);
  if (index === -1) return null;
  
  const app = db.applications[index];
  const now = new Date().toISOString();
  
  const oldStatus = app.status;
  
  Object.assign(app, updates);
  app.updated_at = now;
  
  if (updates.status && updates.status !== oldStatus) {
    let eventType: ApplicationEvent['type'] = 'note';
    if (updates.status === 'applied') eventType = 'applied';
    else if (updates.status === 'followed_up') eventType = 'followed_up';
    else if (updates.status === 'interviewing') eventType = 'interview_scheduled';
    else if (updates.status === 'offer') eventType = 'offer_received';
    else if (updates.status === 'rejected') eventType = 'rejected';
    else if (updates.status === 'accepted') eventType = 'accepted';
    
    app.timeline.push({
      id: `event_${crypto.randomUUID()}`,
      type: eventType,
      date: now,
      note: `Status updated to ${updates.status}`
    });
  }
  
  writeDb(db);
  return app;
}

export function addApplicationEvent(
  appId: string,
  userId: string,
  event: Omit<ApplicationEvent, 'id'>
): ApplicationRecord | null {
  const db = ensureDb();
  const index = db.applications.findIndex(a => a.id === appId && a.user_id === userId);
  if (index === -1) return null;
  
  const app = db.applications[index];
  const now = new Date().toISOString();
  
  app.timeline.push({
    ...event,
    id: `event_${crypto.randomUUID()}`
  });
  app.updated_at = now;
  
  writeDb(db);
  return app;
}

export function deleteApplication(appId: string, userId: string): boolean {
  const db = ensureDb();
  const initialCount = db.applications.length;
  db.applications = db.applications.filter(a => !(a.id === appId && a.user_id === userId));
  const changed = db.applications.length !== initialCount;
  if (changed) writeDb(db);
  return changed;
}

export function getApplicationsDueForFollowUp(userId: string): ApplicationRecord[] {
  const db = ensureDb();
  const now = new Date().toISOString();
  return db.applications.filter(a => 
    a.user_id === userId && 
    a.follow_up_at && a.follow_up_at <= now && 
    (a.status === 'applied' || a.status === 'followed_up')
  );
}
