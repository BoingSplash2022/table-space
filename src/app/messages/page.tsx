// app/messages/page.tsx
import { Suspense } from "react";
import MessagesClient from "./MessagesClient";

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="feed">
          <div className="feed-header">
            <h1>Messages</h1>
            <p>Loading your messages…</p>
          </div>
        </div>
      }
    >
      <MessagesClient />
    </Suspense>
  );
}







