import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const message =
    url.searchParams.get("error_description")?.replaceAll("+", " ") ||
    "Link cũ không còn dùng nữa. App đã chuyển sang đăng nhập bằng mật khẩu cố định.";

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("legacy_message", message);

  return NextResponse.redirect(loginUrl);
}
