const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function hasSupabaseEnv() {
  return Boolean(publicSupabaseUrl && publicSupabaseKey);
}

export function getSupabaseEnv() {
  if (!publicSupabaseUrl || !publicSupabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  return {
    url: publicSupabaseUrl,
    publishableKey: publicSupabaseKey,
  };
}

export function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return key;
}

export function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
  };
}

export function getPairTimezone() {
  return process.env.PAIR_TIMEZONE ?? "Asia/Ho_Chi_Minh";
}

export function getPairEmailAllowlist() {
  const raw = process.env.PAIR_MEMBER_EMAILS;

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getCronSecret() {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("Missing CRON_SECRET.");
  }

  return secret;
}
