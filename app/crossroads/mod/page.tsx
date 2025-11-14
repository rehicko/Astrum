// app/crossroads/mod/page.tsx
import ModQueue from "@/components/ModQueue";

export const dynamic = "force-dynamic";

export default function ModPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Mod Queue</h1>
      <p className="opacity-70 mb-6">
        Approve, reject, or escalate pending messages.
      </p>
      <ModQueue />
    </div>
  );
}
