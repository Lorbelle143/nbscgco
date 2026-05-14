/**
 * In-memory cache for Supabase data
 * When Supabase is exhausted/unhealthy, app serves from this cache
 * Cache is populated on every successful Supabase load
 */

const CACHE_KEY_PROFILES = 'nbsc_cache_profiles';
const CACHE_KEY_SUBMISSIONS = 'nbsc_cache_submissions';
const CACHE_KEY_TS = 'nbsc_cache_timestamp';
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

interface CacheStore {
  profiles: any[];
  submissions: any[];
  mentalHealthAssessments: any[];
  studentSubmissions: Record<string, any[]>;
  studentAssessments: Record<string, any[]>;
  lastUpdated: number | null;
}

const memCache: CacheStore = {
  profiles: [],
  submissions: [],
  mentalHealthAssessments: [],
  studentSubmissions: {},
  studentAssessments: {},
  lastUpdated: null,
};

// ─── localStorage helpers ─────────────────────────────────────────
function saveToLocal(key: string, data: any) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* storage full */ }
}

function loadFromLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function isLocalCacheValid(): boolean {
  const ts = loadFromLocal<number>(CACHE_KEY_TS);
  if (!ts) return false;
  return Date.now() - ts < CACHE_MAX_AGE;
}

export function isCacheValid(): boolean {
  if (memCache.lastUpdated) return Date.now() - memCache.lastUpdated < CACHE_MAX_AGE;
  return isLocalCacheValid();
}

export function isCacheEmpty(): boolean {
  return memCache.profiles.length === 0 && memCache.submissions.length === 0;
}

// ─── Setters ──────────────────────────────────────────────────────

export function cacheProfiles(data: any[]) {
  if (data.length > 0) {
    memCache.profiles = data;
    memCache.lastUpdated = Date.now();
    saveToLocal(CACHE_KEY_PROFILES, data);
    saveToLocal(CACHE_KEY_TS, Date.now());
  }
}

export function cacheSubmissions(data: any[]) {
  if (data.length > 0) {
    memCache.submissions = data;
    memCache.lastUpdated = Date.now();
    saveToLocal(CACHE_KEY_SUBMISSIONS, data);
    saveToLocal(CACHE_KEY_TS, Date.now());
  }
}

export function cacheMentalHealth(data: any[]) {
  if (data.length > 0) {
    memCache.mentalHealthAssessments = data;
    memCache.lastUpdated = Date.now();
  }
}

export function cacheStudentSubmissions(userId: string, data: any[]) {
  memCache.studentSubmissions[userId] = data;
}

export function cacheStudentAssessments(userId: string, data: any[]) {
  memCache.studentAssessments[userId] = data;
}

// ─── Getters ──────────────────────────────────────────────────────

export function getCachedProfiles(): any[] {
  if (memCache.profiles.length > 0) return memCache.profiles;
  // Try localStorage
  const local = loadFromLocal<any[]>(CACHE_KEY_PROFILES);
  if (local && local.length > 0) { memCache.profiles = local; return local; }
  return [];
}

export function getCachedSubmissions(): any[] {
  if (memCache.submissions.length > 0) return memCache.submissions;
  const local = loadFromLocal<any[]>(CACHE_KEY_SUBMISSIONS);
  if (local && local.length > 0) { memCache.submissions = local; return local; }
  return [];
}

export function getCachedMentalHealth(): any[] {
  return memCache.mentalHealthAssessments;
}

export function getCachedStudentSubmissions(userId: string): any[] {
  return memCache.studentSubmissions[userId] || [];
}

export function getCachedStudentAssessments(userId: string): any[] {
  return memCache.studentAssessments[userId] || [];
}

export function getCacheAge(): string {
  const ts = memCache.lastUpdated || loadFromLocal<number>(CACHE_KEY_TS);
  if (!ts) return 'never';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
}

export function clearCache() {
  memCache.profiles = [];
  memCache.submissions = [];
  memCache.mentalHealthAssessments = [];
  memCache.studentSubmissions = {};
  memCache.studentAssessments = {};
  memCache.lastUpdated = null;
  localStorage.removeItem(CACHE_KEY_PROFILES);
  localStorage.removeItem(CACHE_KEY_SUBMISSIONS);
  localStorage.removeItem(CACHE_KEY_TS);
}
