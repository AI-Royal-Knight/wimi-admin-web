"use client";

import { ShieldCheck } from "lucide-react";

export default function SecurityAdminPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Security & RBAC Enforcement</h1>
        <p className="text-[14px] text-zinc-500 mt-0.5">
          Audit authentication records, review active admin sessions, and manage cryptographic tokens.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4">
        <h2 className="text-[16px] font-bold text-[#1E1B4B] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#FF5B00]" />
          Active Administrative Roles
        </h2>
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-zinc-50 flex items-center justify-between border border-zinc-100">
            <div>
              <div className="font-semibold text-zinc-900">admin@tiboutik.ht</div>
              <div className="text-[12px] text-zinc-500">Super Administrator • Full Access</div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[12px]">
              Active Session
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
