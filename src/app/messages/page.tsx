import { Suspense } from "react";
import { MessagesClient } from "@/app/messages/MessagesClient";

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesClient />
    </Suspense>
  );
}
