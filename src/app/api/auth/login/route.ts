import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { LoginSchema, parseOrBadRequest } from "@/lib/validator";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = parseOrBadRequest(LoginSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.message }, { status: 400 });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  return NextResponse.json({ message: "Logged in." });
}

