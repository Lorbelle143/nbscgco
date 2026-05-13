/**
 * In-memory cache for Supabase data
 * When Supabase is exhausted/unhealthy, app serves from this cache
 * Cache is populated on every successful Supabase load
 */

interface CacheStore {
  profiles: any[];
  submissions: any[];
  mentalHealthAssessments: any[];
  studentSubmissions: Record<string, any[]>;
  studentAssessments: Record<string, any[]>;
  lastUpdated: number | null;
}

const cache: CacheStore = {
  profiles: [],
  submissions: [],
  mentalHealthAssessments: [],
  studentSubmissions: {},
  studentAssessments: {},
  lastUpdated: null,
};

const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export function isCacheValid(): boolean {
  if (!cache.lastUpdated) return false;
  return Date.now() - cache.lastUpdated < CACHE_MAX_AGE;
}

export function isCacheEmpty(): boolean {
  return cache.profiles.length === 0 && cache.submissions.length === 0;
}

// ─── Setters (called on every successful Supabase load) ──────────

export function cacheProfiles(data: any[]) {
  if (data.length > 0) {
    cache.profiles = data;
    cache.lastUpdated = Date.now();
  }
}

export function cacheSubmissions(data: any[]) {
  if (data.length > 0) {
    cache.submissions = data;
    cache.lastUpdated = Date.now();
  }
}

export function cacheMentalHealth(data: any[]) {
  if (data.length > 0) {
    cache.mentalHealthAssessments = data;
    cache.lastUpdated = Date.now();
  }
}

export function cacheStudentSubmissions(userId: string, data: any[]) {
  cache.studentSubmissions[userId] = data;
  cache.lastUpdated = Date.now();
}

export function cacheStudentAssessments(userId: string, data: any[]) {
  cache.studentAssessments[userId] = data;
  cache.lastUpdated = Date.now();
}

// ─── Getters (used as fallback) ───────────────────────────────────

export function getCachedProfiles(): any[] {
  return cache.profiles;
}

export function getCachedSubmissions(): any[] {
  return cache.submissions;
}

export function getCachedMentalHealth(): any[] {
  return cache.mentalHealthAssessments;
}

export function getCachedStudentSubmissions(userId: string): any[] {
  return cache.studentSubmissions[userId] || [];
}

export function getCachedStudentAssessments(userId: string): any[] {
  return cache.studentAssessments[userId] || [];
}

export function getCacheAge(): string {
  if (!cache.lastUpdated) return 'never';
  const mins = Math.round((Date.now() - cache.lastUpdated) / 60000);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
}
