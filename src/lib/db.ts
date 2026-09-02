import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { SavedJob, ApplicationEvent } from '@/types/job';
import { supabase, isSupabaseConfigured } from './supabase';

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
  username?: string;
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

function ensureLocalDb(): DatabaseSchema {
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
    console.error('Local database read error:', err);
    return { ...INITIAL_DB };
  }
}

function writeLocalDb(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local database file:', err);
  }
}

// ================= USER OPERATIONS ================= //

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const normalized = email.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', normalized)
        .maybeSingle();

      if (!error && data) {
        return data as UserRecord;
      }
    } catch (err) {
      console.warn('Supabase getUserByEmail error, falling back:', err);
    }
  }

  const db = ensureLocalDb();
  return db.users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return data as UserRecord;
      }
    } catch (err) {
      console.warn('Supabase getUserById error, falling back:', err);
    }
  }

  const db = ensureLocalDb();
  return db.users.find((u) => u.id === id) || null;
}

export async function createUser(userData: {
  name: string;
  email: string;
  password_hash: string;
  salt: string;
  initialCredits?: number;
}): Promise<UserRecord> {
  const now = new Date().toISOString();
  const initialCredits = userData.initialCredits ?? 25;
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

  const initialTx: TransactionRecord = {
    id: `tx_${crypto.randomUUID()}`,
    user_id: newUser.id,
    type: 'initial_bonus',
    credits_delta: initialCredits,
    balance_after: initialCredits,
    description: 'Welcome bonus on sign up',
    created_at: now,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('users').insert([newUser]);
      await supabase.from('transactions').insert([initialTx]);
    } catch (err) {
      console.error('Supabase createUser error:', err);
    }
  }

  const db = ensureLocalDb();
  db.users.push(newUser);
  db.transactions.push(initialTx);
  writeLocalDb(db);

  return newUser;
}

export async function updateUserProfile(
  userId: string,
  updates: { name?: string; username?: string }
): Promise<UserRecord | null> {
  const now = new Date().toISOString();
  const db = ensureLocalDb();
  const localIndex = db.users.findIndex((u) => u.id === userId);

  let updatedUser: UserRecord | null = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const payload: Record<string, unknown> = { updated_at: now };
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.username !== undefined) payload.username = updates.username.trim().toLowerCase();

      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      if (!error && data) {
        updatedUser = data as UserRecord;
      }
    } catch (err) {
      console.warn('Supabase updateUserProfile error:', err);
    }
  }

  if (localIndex >= 0) {
    if (updates.name !== undefined) db.users[localIndex].name = updates.name.trim();
    if (updates.username !== undefined) db.users[localIndex].username = updates.username.trim().toLowerCase();
    db.users[localIndex].updated_at = now;
    writeLocalDb(db);
    if (!updatedUser) updatedUser = db.users[localIndex];
  }

  return updatedUser;
}

export async function updateUserPassword(
  userId: string,
  password_hash: string,
  salt: string
): Promise<boolean> {
  const now = new Date().toISOString();
  let success = false;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ password_hash, salt, updated_at: now })
        .eq('id', userId);

      if (!error) success = true;
    } catch (err) {
      console.warn('Supabase updateUserPassword error:', err);
    }
  }

  const db = ensureLocalDb();
  const user = db.users.find((u) => u.id === userId);
  if (user) {
    user.password_hash = password_hash;
    user.salt = salt;
    user.updated_at = now;
    writeLocalDb(db);
    success = true;
  }

  return success;
}

export async function updateUserPasswordByEmail(
  email: string,
  password_hash: string,
  salt: string
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const now = new Date().toISOString();
  let success = false;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ password_hash, salt, updated_at: now })
        .ilike('email', normalized);

      if (!error) success = true;
    } catch (err) {
      console.warn('Supabase updateUserPasswordByEmail error:', err);
    }
  }

  const db = ensureLocalDb();
  const user = db.users.find((u) => u.email.toLowerCase() === normalized);
  if (user) {
    user.password_hash = password_hash;
    user.salt = salt;
    user.updated_at = now;
    writeLocalDb(db);
    success = true;
  }

  return success;
}

export async function updateUserCredits(
  userId: string,
  delta: number,
  type: TransactionRecord['type'],
  description: string,
  amountPaid?: number,
  currency?: string
): Promise<{ success: boolean; credits: number; error?: string }> {
  const user = await getUserById(userId);
  if (!user) {
    return { success: false, credits: 0, error: 'User not found' };
  }

  const newCredits = user.credits + delta;
  if (newCredits < 0) {
    return { success: false, credits: user.credits, error: 'Insufficient credits' };
  }

  const now = new Date().toISOString();
  const tx: TransactionRecord = {
    id: `tx_${crypto.randomUUID()}`,
    user_id: userId,
    type,
    amount: amountPaid,
    currency: currency || (amountPaid ? 'USD' : undefined),
    credits_delta: delta,
    balance_after: newCredits,
    description,
    created_at: now,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('users').update({ credits: newCredits, updated_at: now }).eq('id', userId);
      await supabase.from('transactions').insert([tx]);
    } catch (err) {
      console.error('Supabase updateUserCredits error:', err);
    }
  }

  const db = ensureLocalDb();
  const localUser = db.users.find((u) => u.id === userId);
  if (localUser) {
    localUser.credits = newCredits;
    localUser.updated_at = now;
  }
  db.transactions.push(tx);
  writeLocalDb(db);

  return { success: true, credits: newCredits };
}

// ================= SESSION OPERATIONS ================= //

export async function createSession(userId: string, durationDays = 30): Promise<SessionRecord> {
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

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('sessions').insert([session]);
    } catch (err) {
      console.error('Supabase createSession error:', err);
    }
  }

  const db = ensureLocalDb();
  db.sessions.push(session);
  writeLocalDb(db);

  return session;
}

export async function getSessionByToken(token: string): Promise<{ session: SessionRecord; user: UserRecord } | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: sessionData, error: sessionErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (!sessionErr && sessionData) {
        const session = sessionData as SessionRecord;
        if (new Date(session.expires_at).getTime() >= Date.now()) {
          const user = await getUserById(session.user_id);
          if (user) {
            return { session, user };
          }
        }
      }
    } catch (err) {
      console.warn('Supabase getSessionByToken error, falling back:', err);
    }
  }

  const db = ensureLocalDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    return null;
  }

  const user = db.users.find((u) => u.id === session.user_id);
  if (!user) return null;

  return { session, user };
}

export async function deleteSession(token: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('sessions').delete().eq('token', token);
    } catch (err) {
      console.error('Supabase deleteSession error:', err);
    }
  }

  const db = ensureLocalDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  writeLocalDb(db);
}

// ================= CHAT HISTORY OPERATIONS ================= //

export async function getUserChats(userId: string): Promise<ChatSessionRecord[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return data as ChatSessionRecord[];
      }
    } catch (err) {
      console.warn('Supabase getUserChats error:', err);
    }
  }

  const db = ensureLocalDb();
  return db.chats
    .filter((c) => c.user_id === userId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function getChatById(chatId: string, userId: string): Promise<ChatSessionRecord | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return data as ChatSessionRecord;
      }
    } catch (err) {
      console.warn('Supabase getChatById error:', err);
    }
  }

  const db = ensureLocalDb();
  return db.chats.find((c) => c.id === chatId && c.user_id === userId) || null;
}

export async function saveChatSession(
  userId: string,
  chatData: {
    id?: string;
    title?: string;
    messages: ChatSessionRecord['messages'];
  }
): Promise<ChatSessionRecord> {
  const now = new Date().toISOString();
  const firstUserMsg = chatData.messages.find((m) => m.role === 'user')?.content || 'Job Search';
  const title = chatData.title || (firstUserMsg.length > 36 ? `${firstUserMsg.slice(0, 36)}...` : firstUserMsg);
  const chatId = chatData.id || `chat_${crypto.randomUUID()}`;

  const record: ChatSessionRecord = {
    id: chatId,
    user_id: userId,
    title,
    messages: chatData.messages,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('chats').upsert([record]);
    } catch (err) {
      console.error('Supabase saveChatSession error:', err);
    }
  }

  const db = ensureLocalDb();
  const existingIdx = db.chats.findIndex((c) => c.id === chatId && c.user_id === userId);
  if (existingIdx >= 0) {
    db.chats[existingIdx] = record;
  } else {
    db.chats.push(record);
  }
  writeLocalDb(db);

  return record;
}

export async function deleteChatSession(chatId: string, userId: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('chats').delete().eq('id', chatId).eq('user_id', userId);
    } catch (err) {
      console.error('Supabase deleteChatSession error:', err);
    }
  }

  const db = ensureLocalDb();
  const initialCount = db.chats.length;
  db.chats = db.chats.filter((c) => !(c.id === chatId && c.user_id === userId));
  const changed = db.chats.length !== initialCount;
  if (changed) writeLocalDb(db);
  return changed;
}

// ================= CV & RESUME HISTORY OPERATIONS ================= //

export async function getUserResumes(userId: string): Promise<CVRecord[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as CVRecord[];
      }
    } catch (err) {
      console.warn('Supabase getUserResumes error:', err);
    }
  }

  const db = ensureLocalDb();
  return db.resumes
    .filter((r) => r.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function saveUserResume(
  userId: string,
  data: {
    title: string;
    text: string;
    score?: number;
    review?: Record<string, unknown>;
  }
): Promise<CVRecord> {
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

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('resumes').insert([record]);
    } catch (err) {
      console.error('Supabase saveUserResume error:', err);
    }
  }

  const db = ensureLocalDb();
  db.resumes.push(record);
  writeLocalDb(db);
  return record;
}

// ================= TRANSACTION HISTORY ================= //

export async function getUserTransactions(userId: string): Promise<TransactionRecord[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as TransactionRecord[];
      }
    } catch (err) {
      console.warn('Supabase getUserTransactions error:', err);
    }
  }

  const db = ensureLocalDb();
  return db.transactions
    .filter((t) => t.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ================= APPLICATIONS OPERATIONS ================= //

export async function getUserApplications(userId: string): Promise<ApplicationRecord[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return data as ApplicationRecord[];
      }
    } catch (err) {
      console.warn('Supabase getUserApplications error:', err);
    }
  }

  const db = ensureLocalDb();
  return db.applications
    .filter((a) => a.user_id === userId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function getApplicationById(appId: string, userId: string): Promise<ApplicationRecord | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', appId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return data as ApplicationRecord;
      }
    } catch (err) {
      console.warn('Supabase getApplicationById error:', err);
    }
  }

  const db = ensureLocalDb();
  return db.applications.find((a) => a.id === appId && a.user_id === userId) || null;
}

export async function saveUserApplication(
  userId: string,
  data: {
    job: SavedJob;
    status?: string;
    notes?: string;
    contact_name?: string;
    contact_email?: string;
    contact_linkedin?: string;
  }
): Promise<ApplicationRecord> {
  const now = new Date().toISOString();
  const status = (data.status as SavedJob['status']) || 'saved';

  const timelineEvent: ApplicationEvent = {
    id: `event_${crypto.randomUUID()}`,
    type: status === 'applied' ? 'applied' : 'note',
    date: now,
    note: `Initial status: ${status}`,
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
    applied_at: status === 'applied' ? now : undefined,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('applications').insert([record]);
    } catch (err) {
      console.error('Supabase saveUserApplication error:', err);
    }
  }

  const db = ensureLocalDb();
  db.applications.push(record);
  writeLocalDb(db);
  return record;
}

export async function updateApplication(
  appId: string,
  userId: string,
  updates: Partial<Pick<ApplicationRecord, 'status' | 'follow_up_at' | 'follow_up_count' | 'contact_name' | 'contact_email' | 'contact_linkedin' | 'notes' | 'applied_at'>>
): Promise<ApplicationRecord | null> {
  const app = await getApplicationById(appId, userId);
  if (!app) return null;

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
      note: `Status updated to ${updates.status}`,
    });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('applications').update(app).eq('id', appId).eq('user_id', userId);
    } catch (err) {
      console.error('Supabase updateApplication error:', err);
    }
  }

  const db = ensureLocalDb();
  const index = db.applications.findIndex((a) => a.id === appId && a.user_id === userId);
  if (index >= 0) {
    db.applications[index] = app;
    writeLocalDb(db);
  }

  return app;
}

export async function addApplicationEvent(
  appId: string,
  userId: string,
  event: Omit<ApplicationEvent, 'id'>
): Promise<ApplicationRecord | null> {
  const app = await getApplicationById(appId, userId);
  if (!app) return null;

  const now = new Date().toISOString();
  app.timeline.push({
    ...event,
    id: `event_${crypto.randomUUID()}`,
  });
  app.updated_at = now;

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('applications').update(app).eq('id', appId).eq('user_id', userId);
    } catch (err) {
      console.error('Supabase addApplicationEvent error:', err);
    }
  }

  const db = ensureLocalDb();
  const index = db.applications.findIndex((a) => a.id === appId && a.user_id === userId);
  if (index >= 0) {
    db.applications[index] = app;
    writeLocalDb(db);
  }

  return app;
}

export async function deleteApplication(appId: string, userId: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('applications').delete().eq('id', appId).eq('user_id', userId);
    } catch (err) {
      console.error('Supabase deleteApplication error:', err);
    }
  }

  const db = ensureLocalDb();
  const initialCount = db.applications.length;
  db.applications = db.applications.filter((a) => !(a.id === appId && a.user_id === userId));
  const changed = db.applications.length !== initialCount;
  if (changed) writeLocalDb(db);
  return changed;
}

export async function getApplicationsDueForFollowUp(userId: string): Promise<ApplicationRecord[]> {
  const now = new Date().toISOString();
  const apps = await getUserApplications(userId);
  return apps.filter(
    (a) =>
      a.follow_up_at &&
      a.follow_up_at <= now &&
      (a.status === 'applied' || a.status === 'followed_up')
  );
}

// ================= FREE CREDIT CLAIM (7-DAY CYCLE) ================= //

export async function claimFreeCredits(userId: string): Promise<{
  success: boolean;
  credits?: number;
  nextClaimAt?: string;
  hoursRemaining?: number;
  error?: string;
}> {
  const user = await getUserById(userId);
  if (!user) return { success: false, error: 'User not found' };

  const FREE_CREDITS = 5;
  const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

  const txs = await getUserTransactions(userId);
  const lastClaim = txs.find((t) => t.description === 'Free weekly credit refill');

  const now = Date.now();
  if (lastClaim) {
    const elapsed = now - new Date(lastClaim.created_at).getTime();
    if (elapsed < COOLDOWN_MS) {
      const msRemaining = COOLDOWN_MS - elapsed;
      const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
      const nextClaimAt = new Date(new Date(lastClaim.created_at).getTime() + COOLDOWN_MS).toISOString();
      return { success: false, hoursRemaining, nextClaimAt, error: `Next free claim available in ${hoursRemaining} hours.` };
    }
  }

  const res = await updateUserCredits(userId, FREE_CREDITS, 'initial_bonus', 'Free weekly credit refill');
  return { success: res.success, credits: res.credits };
}

export async function getNextFreeClaimInfo(userId: string): Promise<{ canClaim: boolean; hoursRemaining: number; nextClaimAt: string | null }> {
  const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  const txs = await getUserTransactions(userId);
  const lastClaim = txs.find((t) => t.description === 'Free weekly credit refill');
  const lastBonus = txs.find((t) => t.type === 'initial_bonus');

  const reference = lastClaim || lastBonus;
  if (!reference) return { canClaim: true, hoursRemaining: 0, nextClaimAt: null };

  const elapsed = Date.now() - new Date(reference.created_at).getTime();
  if (elapsed >= COOLDOWN_MS) return { canClaim: true, hoursRemaining: 0, nextClaimAt: null };

  const msRemaining = COOLDOWN_MS - elapsed;
  const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
  const nextClaimAt = new Date(new Date(reference.created_at).getTime() + COOLDOWN_MS).toISOString();
  return { canClaim: false, hoursRemaining, nextClaimAt };
}
