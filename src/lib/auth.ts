import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPasswordMembers, getSessionSecret } from "@/lib/env";

const SESSION_COOKIE_NAME = "an_tam_session";

export type AuthMemberKey = "member_one" | "member_two";

export type AuthUser = {
  id: string;
  memberKey: AuthMemberKey;
  email: string;
  fallbackName: string;
};

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!raw) {
    return null;
  }

  const [memberKey, signature] = raw.split(".");

  if (!memberKey || !signature) {
    return null;
  }

  const expectedSignature = sign(memberKey);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  const member = getPasswordMembers().find((item) => item.memberKey === memberKey);

  if (!member) {
    return null;
  }

  return {
    id: deriveStableUuid(member.memberKey),
    memberKey: member.memberKey,
    email: member.placeholderEmail,
    fallbackName: member.fallbackName,
  };
}

export async function createSessionForPassword(password: string) {
  const member = resolveMemberFromPassword(password);

  if (!member) {
    return false;
  }

  const cookieStore = await cookies();
  const payload = `${member.memberKey}.${sign(member.memberKey)}`;

  cookieStore.set(SESSION_COOKIE_NAME, payload, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return true;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

function resolveMemberFromPassword(password: string) {
  const normalized = password.trim();

  if (!normalized) {
    return null;
  }

  return getPasswordMembers().find((member) => safeEqual(hashPassword(normalized), hashPassword(member.password))) ?? null;
}

function hashPassword(password: string) {
  return createHash("sha256")
    .update(`${getSessionSecret()}:${password}`)
    .digest("hex");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function deriveStableUuid(memberKey: AuthMemberKey) {
  const hex = createHash("sha256")
    .update(`an-tam:${memberKey}`)
    .digest("hex")
    .slice(0, 32);

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
