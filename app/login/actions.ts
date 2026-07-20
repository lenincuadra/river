"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const password = process.env.RIVER_PASSWORD;
  if (!password) redirect("/");

  const attempt = String(formData.get("password") ?? "");
  if (attempt !== password) redirect("/login?error=1");

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, await expectedToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  redirect("/");
}
