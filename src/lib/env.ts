const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function hasSupabaseEnv() {
  return Boolean(publicSupabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseEnv() {
  if (!publicSupabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  return {
    url: publicSupabaseUrl,
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
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
  };
}

export function getPairTimezone() {
  return process.env.PAIR_TIMEZONE ?? "Asia/Ho_Chi_Minh";
}

export function getSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET;

  if (!secret) {
    throw new Error("Missing APP_SESSION_SECRET.");
  }

  return secret;
}

export function getPasswordMembers() {
  const memberOnePassword = process.env.PAIR_MEMBER_ONE_PASSWORD;
  const memberTwoPassword = process.env.PAIR_MEMBER_TWO_PASSWORD;

  if (!memberOnePassword || !memberTwoPassword) {
    throw new Error("Missing PAIR_MEMBER_ONE_PASSWORD or PAIR_MEMBER_TWO_PASSWORD.");
  }

  if (memberOnePassword === memberTwoPassword) {
    throw new Error("PAIR_MEMBER_ONE_PASSWORD and PAIR_MEMBER_TWO_PASSWORD must be different.");
  }

  return [
    {
      memberKey: "member_one" as const,
      password: memberOnePassword,
      placeholderEmail: "member.one@an-tam.local",
      fallbackName: "Nguoi 1",
    },
    {
      memberKey: "member_two" as const,
      password: memberTwoPassword,
      placeholderEmail: "member.two@an-tam.local",
      fallbackName: "Nguoi 2",
    },
  ];
}

export function getCronSecret() {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("Missing CRON_SECRET.");
  }

  return secret;
}
