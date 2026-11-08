"use client";

export default function AnalyticsAdminPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Platform Analytics & Growth</h1>
        <p className="text-[14px] text-zinc-500 mt-0.5">
          Macro-economic metrics across merchandise volume, store onboarding, and order fulfillment rates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-zinc-200">
          <div className="text-[13px] text-zinc-500 font-medium">Monthly Active Consumers</div>
          <div className="text-3xl font-extrabold text-zinc-900 mt-2">1,240</div>
          <div className="text-[12px] font-semibold text-emerald-600 mt-1">+14.2% from last month</div>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-zinc-200">
          <div className="text-[13px] text-zinc-500 font-medium">Average Order Value (AOV)</div>
          <div className="text-3xl font-extrabold text-zinc-900 mt-2">$42.80</div>
          <div className="text-[12px] font-semibold text-emerald-600 mt-1">+5.1% efficiency</div>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-zinc-200">
          <div className="text-[13px] text-zinc-500 font-medium">Avg Delivery Duration</div>
          <div className="text-3xl font-extrabold text-zinc-900 mt-2">28 min</div>
          <div className="text-[12px] font-semibold text-emerald-600 mt-1">4.2 min faster than SLA</div>
        </div>
      </div>
    </div>
  );
}
