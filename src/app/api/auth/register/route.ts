import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { RegisterSchema, parseOrBadRequest } from "@/lib/validator";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = parseOrBadRequest(RegisterSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }
  const { username, email, password } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) return NextResponse.json({ error: "Username or email already in use." }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { username, email, passwordHash } });

  return NextResponse.json({ message: "Account created.", user: { id: user.id, username: user.username } }, { status: 201 });
}



