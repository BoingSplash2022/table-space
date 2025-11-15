import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
    take: 50,
  });
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  try {
    const { content } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Post content is required." }, { status: 400 });
    }

    // TEMP until real sessions: use first user
    const firstUser = await prisma.user.findFirst({ orderBy: { id: "asc" } });
    if (!firstUser) {
      return NextResponse.json({ error: "No users yet. Register first." }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: { content: content.trim(), userId: firstUser.id },
      include: { user: true },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    console.error("POST /api/posts error", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
