"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelInvite } from "@/app/(coach)/roster/actions";

/** People invited who haven't logged in yet. */
export function PendingInvites({ invites }: { invites: { phone: string; full_name: string; role: string; created_at: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!invites.length) return null;
  return (
    <div className="rounded-sm bg-charcoal p-4">
      <p className="label mb-2">Invited, not in yet · {invites.length}</p>
      <ul className="flex flex-col">
        {invites.map((i) => (
          <li key={i.phone} className="flex min-h-12 items-center justify-between gap-3 border-t border-charcoal-2 py-2 first:border-0">
            <span className="min-w-0 truncate">
              <span className="font-semibold">{i.full_name}</span>{" "}
              <span className="text-sm text-muted">
                · {i.phone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")}
                {i.role !== "rep" ? ` · ${i.role}` : ""}
              </span>
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await cancelInvite(i.phone);
                  router.refresh();
                })
              }
              className="min-h-12 shrink-0 px-2 text-sm text-muted"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
