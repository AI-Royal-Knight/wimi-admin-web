"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  Percent,
  Truck,
  DollarSign,
  Sliders,
  X,
  Check,
  Search,
  Building2,
  Calendar,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  fetchAdminCommissions,
  updateAdminCommissionSettings,
  CommissionMerchant,
  MonthlyCommissionBreakdown,
} from "@/lib/api";

export default function CommissionsAdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    takeRatePct: 10.0,
    deliveryPlatformCut: "25 HTG",
    totalCommissionEarned: "0 HTG",
    totalGrossVolume: "0 HTG",
    merchantsEnrolled: 0,
    settlementCycle: "Weekly MonCash Settlement",
  });
  const [settings, setSettings] = useState({
    take_rate_pct: 10.0,
    delivery_platform_cut: 25.0,
    payout_processing_fee: 15.0,
  });
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthlyCommissionBreakdown[]>([]);
  const [merchantCommissions, setMerchantCommissions] = useState<CommissionMerchant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editTakeRate, setEditTakeRate] = useState("10.0");
  const [editDeliveryCut, setEditDeliveryCut] = useState("25.0");
  const [editProcessingFee, setEditProcessingFee] = useState("15.0");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const loadCommissions = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const res = await fetchAdminCommissions();
      if (res.success && res.data) {
        setStats(res.data.stats);
        setSettings(res.data.settings);
        setEditTakeRate(String(res.data.settings.take_rate_pct));
        setEditDeliveryCut(String(res.data.settings.delivery_platform_cut));
        setEditProcessingFee(String(res.data.settings.payout_processing_fee));
        setMonthlyBreakdown(res.data.monthlyBreakdown || []);
        setMerchantCommissions(res.data.merchantCommissions || []);
      }
    } catch (err) {
      console.warn("Could not load backend commissions:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  // Global search event listener
  useEffect(() => {
    const handleSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (typeof customEvent.detail === "string") {
        setSearchQuery(customEvent.detail);
      }
    };
    window.addEventListener("admin_global_search", handleSearch);
    return () => window.removeEventListener("admin_global_search", handleSearch);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveErrorMsg(null);

    try {
      const res = await updateAdminCommissionSettings({
        take_rate_pct: parseFloat(editTakeRate),
        delivery_platform_cut: parseFloat(editDeliveryCut),
        payout_processing_fee: parseFloat(editProcessingFee),
      });

      if (res.success) {
        setSaveSuccessMsg("Commission rates successfully updated.");
        await loadCommissions(true);
        setTimeout(() => {
          setIsSettingsOpen(false);
          setSaveSuccessMsg(null);
        }, 1200);
      } else {
        setSaveErrorMsg(res.message || "Failed to update commission settings.");
      }
    } catch {
      setSaveErrorMsg("Network error updating commission settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMerchants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return merchantCommissions.filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [merchantCommissions, searchQuery]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 select-none">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div>
            <h1 className="text-[19px] font-bold text-[#1E1B4B]">
              Marketplace Commissions & Revenue
            </h1>
            <p className="text-[12.5px] text-zinc-500 mt-0.5">
              Live transaction take-rates, fleet delivery cuts, and merchant revenue share ledger.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadCommissions(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-[13px] font-semibold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Refresh commission calculations"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing ? "animate-spin text-[#FF5B00]" : "text-zinc-500"
              }`}
            />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            onClick={() => {
              setIsSettingsOpen(true);
              setSaveErrorMsg(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E1B4B] hover:bg-[#2B2766] text-white text-[13px] font-semibold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Configure Rates</span>
          </button>
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Platform Commissions */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[12.5px] font-semibold text-zinc-600">Platform Earned</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[26px] font-bold text-[#1E1B4B] leading-tight">
              {isLoading ? "..." : stats.totalCommissionEarned}
            </div>
            <div className="text-[11.5px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Net marketplace revenue</span>
            </div>
          </div>
        </div>

        {/* Card 2: Take-Rate */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[12.5px] font-semibold text-zinc-600">Default Take-Rate</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF5B00] flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[26px] font-bold text-[#FF5B00] leading-tight">
              {isLoading ? "..." : `${stats.takeRatePct}%`}
            </div>
            <div className="text-[11.5px] font-medium text-zinc-500 mt-1">
              On merchant basket subtotal
            </div>
          </div>
        </div>

        {/* Card 3: Platform Delivery Cut */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[12.5px] font-semibold text-zinc-600">Delivery Cut</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[26px] font-bold text-[#1E1B4B] leading-tight">
              {isLoading ? "..." : stats.deliveryPlatformCut}
            </div>
            <div className="text-[11.5px] font-medium text-blue-600 mt-1">
              Per completed delivery
            </div>
          </div>
        </div>

        {/* Card 4: Total Gross Volume */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[12.5px] font-semibold text-zinc-600">Gross Volume (GMV)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[26px] font-bold text-[#1E1B4B] leading-tight">
              {isLoading ? "..." : stats.totalGrossVolume}
            </div>
            <div className="text-[11.5px] font-medium text-zinc-500 mt-1">
              {isLoading ? "..." : `${stats.merchantsEnrolled} active merchant partners`}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown History */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4.5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-[#1E1B4B]">
              Monthly Commission Trajectory
            </h2>
            <p className="text-[12px] text-zinc-400 mt-0.5">
              Aggregated monthly platform volume and collected commissions.
            </p>
          </div>
          <span className="text-[12px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
            {stats.settlementCycle}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 text-[12px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50/50">
                <th className="py-3.5 px-6">Month</th>
                <th className="py-3.5 px-6">Delivered Orders</th>
                <th className="py-3.5 px-6">Gross Merchandise Value</th>
                <th className="py-3.5 px-6">Platform Commission</th>
                <th className="py-3.5 px-6 text-right">Settlement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[13px]">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-24"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-20"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-28"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-24"></div></td>
                    <td className="py-4 px-6 text-right"><div className="h-5 bg-zinc-100 rounded-full w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : monthlyBreakdown.length > 0 ? (
                monthlyBreakdown.map((row) => (
                  <tr key={row.month} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-4 px-6 font-semibold text-[#1E1B4B] flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{row.month}</span>
                    </td>
                    <td className="py-4 px-6 text-zinc-600 font-medium">
                      {row.orders} orders
                    </td>
                    <td className="py-4 px-6 font-semibold text-zinc-800">
                      {row.gross}
                    </td>
                    <td className="py-4 px-6 font-bold text-emerald-600">
                      +{row.commission}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-bold ${
                          row.status === "Settled"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 text-[13px]">
                    No historical monthly volume recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Merchant Commission Breakdown */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4.5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#1E1B4B]">
              Store Commission Roster
            </h2>
            <p className="text-[12px] text-zinc-400 mt-0.5">
              Net commission generated per enrolled merchant store.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by store or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-zinc-200 text-[12.5px] focus:outline-hidden focus:border-[#FF5B00] transition-all bg-zinc-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 text-[12px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50/50">
                <th className="py-3.5 px-6">Store Name</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6">Completed Orders</th>
                <th className="py-3.5 px-6">Gross Volume</th>
                <th className="py-3.5 px-6">Take-Rate</th>
                <th className="py-3.5 px-6">Net Platform Commission</th>
                <th className="py-3.5 px-6 text-right">Store Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[13px]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-36"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-20"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-16"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-24"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-12"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-20"></div></td>
                    <td className="py-4 px-6 text-right"><div className="h-5 bg-zinc-100 rounded-full w-14 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredMerchants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400 text-[13px]">
                    No stores matching your search query.
                  </td>
                </tr>
              ) : (
                filteredMerchants.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-[#1E1B4B]">
                      {m.name}
                    </td>
                    <td className="py-4 px-6 text-zinc-600 font-medium">
                      {m.category}
                    </td>
                    <td className="py-4 px-6 text-zinc-800 font-medium">
                      {m.ordersCount}
                    </td>
                    <td className="py-4 px-6 font-semibold text-zinc-800">
                      {m.grossVolume}
                    </td>
                    <td className="py-4 px-6 font-semibold text-[#FF5B00]">
                      {m.rate}
                    </td>
                    <td className="py-4 px-6 font-bold text-emerald-600">
                      {m.commissionGenerated}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                        {m.status || "Active"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configure Rates Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF5B00] flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="text-[16px] font-bold text-[#1E1B4B]">
                  Platform Commission Rates
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-[12.5px] font-semibold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {saveErrorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-[12.5px] font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{saveErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="mt-4 space-y-4">
              <div>
                <label className="block text-[12.5px] font-bold text-zinc-700 mb-1">
                  Default Marketplace Take-Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    required
                    value={editTakeRate}
                    onChange={(e) => setEditTakeRate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-hidden focus:border-[#FF5B00] transition-all font-semibold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-[13px]">
                    %
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Automatically deducted from merchant subtotal on order completion.
                </span>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-zinc-700 mb-1">
                  Delivery Platform Fee (HTG)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    min="0"
                    max="500"
                    required
                    value={editDeliveryCut}
                    onChange={(e) => setEditDeliveryCut(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-hidden focus:border-[#FF5B00] transition-all font-semibold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-[12px]">
                    HTG
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Platform operational fee per customer delivery.
                </span>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-zinc-700 mb-1">
                  MonCash Payout Processing Fee (HTG)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    required
                    value={editProcessingFee}
                    onChange={(e) => setEditProcessingFee(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-hidden focus:border-[#FF5B00] transition-all font-semibold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-[12px]">
                    HTG
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 font-semibold text-[13px] hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#FF5B00] hover:bg-[#e05000] text-white font-bold text-[13px] transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Settings</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
