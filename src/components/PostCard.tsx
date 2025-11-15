import type { Post, User } from "@prisma/client";
type PostWithUser = Post & { user: User };

export function PostCard({ post }: { post: PostWithUser }) {
  const when = new Date(post.createdAt).toLocaleString();
  return (
    <article className="bg-white border border-gray-300 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-gray-300" />
        <div className="leading-tight">
          <div className="text-sm font-semibold">{post.user.username}</div>
          <div className="text-xs text-gray-500">{when}</div>
        </div>
      </div>
      <p className="text-sm">{post.content}</p>
      <div className="flex gap-4 pt-2 text-xs text-gray-600">
        <button className="hover:text-purple-700">Like</button>
        <button className="hover:text-purple-700">Comment</button>
        <button className="hover:text-purple-700">Share</button>
      </div>
    </article>
  );
}
