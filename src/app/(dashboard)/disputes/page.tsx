"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  ChevronRight,
  X,
  Check,
  ShieldAlert,
  ArrowRight,
  Store,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";
import {
  fetchAdminDisputes,
  resolveAdminDispute,
  AdminDispute,
} from "@/lib/api";

export default function DisputesAdminPage() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [stats, setStats] = useState({
    totalDisputes: 5,
    openClaims: 5,
    resolvedRefunded: 0,
    disputeRate: "0.4%",
  });
  const [activeTab, setActiveTab] = useState<"All" | "Open" | "Resolved">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Resolution Modal State
  const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(null);
  const [resolutionAction, setResolutionAction] = useState<"refund" | "uphold_merchant" | "dismiss">("refund");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadDisputes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminDisputes({
        status: activeTab !== "All" ? activeTab : undefined,
        search: searchQuery || undefined,
      });
      if (res.success && res.data) {
        setDisputes(res.data);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.warn("Using default disputes data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const handleOpenReview = (dispute: AdminDispute) => {
    setSelectedDispute(dispute);
    setResolutionNotes("");
    setResolutionAction("refund");
  };

  const handleConfirmResolution = async () => {
    if (!selectedDispute) return;
    setIsSubmitting(true);
    try {
      const res = await resolveAdminDispute(
        selectedDispute.id,
        resolutionAction,
        resolutionNotes
      );

      if (res.success && res.data) {
        setSuccessToast(res.message || "Dispute updated successfully.");
        // Update local list
        setDisputes((prev) =>
          prev.map((d) => (d.id === selectedDispute.id ? res.data! : d))
        );
        setTimeout(() => {
          setSelectedDispute(null);
          setSuccessToast(null);
        }, 1200);
      } else {
        alert(res.message || "Failed to resolve dispute.");
      }
    } catch {
      alert("Network error resolving dispute.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-50 text-red-700 border-red-200/50";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200/50";
      case "Low":
        return "bg-blue-50 text-blue-700 border-blue-200/50";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "Open") {
      return "bg-amber-50 text-amber-700";
    }
    if (status.includes("Refunded")) {
      return "bg-emerald-50 text-emerald-700";
    }
    if (status.includes("Upheld")) {
      return "bg-blue-50 text-blue-700";
    }
    return "bg-zinc-100 text-zinc-600";
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 select-none">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-[#FF5B00] flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div>
            <h1 className="text-[19px] font-bold text-[#1E1B4B]">
              Order Claims & Dispute Resolution
            </h1>
            <p className="text-[12.5px] text-zinc-500 mt-0.5">
              Investigate customer order discrepancies, damaged shipments, and issue MonCash refunds.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 text-[#FF5B00] font-bold text-[12.5px] self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#FF5B00] animate-pulse"></span>
          <span>{stats.openClaims} Claims Awaiting Mediation</span>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs">
          <div className="text-[12.5px] font-semibold text-zinc-600">Total Disputes Filed</div>
          <div className="text-[26px] font-bold text-[#1E1B4B] mt-2">
            {stats.totalDisputes}
          </div>
          <div className="text-[11.5px] font-medium text-zinc-400 mt-1">Platform lifetime claims</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs">
          <div className="text-[12.5px] font-semibold text-zinc-600">Open In-Queue</div>
          <div className="text-[26px] font-bold text-[#FF5B00] mt-2">
            {stats.openClaims}
          </div>
          <div className="text-[11.5px] font-medium text-orange-600 mt-1">Requires admin verdict</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs">
          <div className="text-[12.5px] font-semibold text-zinc-600">Resolved & Refunded</div>
          <div className="text-[26px] font-bold text-emerald-600 mt-2">
            {stats.resolvedRefunded}
          </div>
          <div className="text-[11.5px] font-medium text-emerald-600 mt-1">MonCash credits issued</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs">
          <div className="text-[12.5px] font-semibold text-zinc-600">Dispute Incident Rate</div>
          <div className="text-[26px] font-bold text-blue-600 mt-2">
            {stats.disputeRate}
          </div>
          <div className="text-[11.5px] font-medium text-zinc-400 mt-1">Under 1% platform threshold</div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 rounded-xl">
            {(["All", "Open", "Resolved"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-[12.5px] font-bold transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-[#FF5B00] text-white shadow-xs"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search claim, order, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-zinc-200 text-[12.5px] focus:outline-hidden focus:border-[#FF5B00] transition-all bg-zinc-50/50"
            />
          </div>
        </div>

        {/* Disputes Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 text-[12px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50/50">
                <th className="py-3.5 px-6">Dispute ID</th>
                <th className="py-3.5 px-6">Order</th>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Merchant</th>
                <th className="py-3.5 px-6">Reason / Claim</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Priority</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[13px]">
              {disputes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-zinc-400">
                    No dispute claims found.
                  </td>
                </tr>
              ) : (
                disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-[#1E1B4B]">
                      {d.id}
                    </td>
                    <td className="py-4 px-6 font-semibold text-[#FF5B00]">
                      {d.orderNumber}
                    </td>
                    <td className="py-4 px-6 text-zinc-800 font-medium">
                      {d.customerName}
                    </td>
                    <td className="py-4 px-6 text-zinc-600 font-medium">
                      {d.merchantName}
                    </td>
                    <td className="py-4 px-6 text-zinc-700 max-w-xs truncate">
                      {d.reason}
                    </td>
                    <td className="py-4 px-6 font-bold text-[#1E1B4B]">
                      {d.claimAmount}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getPriorityBadge(
                          d.priority
                        )}`}
                      >
                        {d.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-bold ${getStatusBadge(
                          d.status
                        )}`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleOpenReview(d)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1E1B4B] hover:bg-[#FF5B00] text-white text-[12px] font-semibold transition-all cursor-pointer"
                      >
                        {d.status === "Open" ? "Mediate" : "View Details"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Mediation Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF5B00] flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#1E1B4B]">
                    Mediate Claim — {selectedDispute.id}
                  </h3>
                  <span className="text-[11.5px] text-[#FF5B00] font-semibold">
                    Order {selectedDispute.orderNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {successToast && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-[12.5px] font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{successToast}</span>
              </div>
            )}

            <div className="mt-4 space-y-4 text-[13px]">
              {/* Customer vs Store Overview */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100">
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Customer
                  </span>
                  <div className="font-bold text-[#1E1B4B] mt-0.5">
                    {selectedDispute.customerName}
                  </div>
                  <div className="text-[11.5px] text-zinc-500">
                    {selectedDispute.customerPhone}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Store
                  </span>
                  <div className="font-bold text-[#1E1B4B] mt-0.5">
                    {selectedDispute.merchantName}
                  </div>
                  <div className="text-[11.5px] font-semibold text-emerald-600">
                    Claim: {selectedDispute.claimAmount}
                  </div>
                </div>
              </div>

              {/* Statement from Customer */}
              <div>
                <span className="text-[11.5px] font-bold text-zinc-500 uppercase tracking-wider">
                  Customer Grievance:
                </span>
                <p className="mt-1 p-3 rounded-xl bg-red-50/50 border border-red-100 text-zinc-700 text-[12.5px] leading-relaxed">
                  &ldquo;{selectedDispute.customerNote}&rdquo;
                </p>
              </div>

              {/* Statement from Merchant */}
              <div>
                <span className="text-[11.5px] font-bold text-zinc-500 uppercase tracking-wider">
                  Merchant Statement:
                </span>
                <p className="mt-1 p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-zinc-700 text-[12.5px] leading-relaxed">
                  &ldquo;{selectedDispute.merchantResponse}&rdquo;
                </p>
              </div>

              {/* Resolution Action Picker */}
              <div>
                <label className="block text-[12px] font-bold text-zinc-700 mb-1.5">
                  Platform Verdict / Decision
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionAction("refund")}
                    className={`py-2 px-3 rounded-xl text-[12px] font-bold border transition-all cursor-pointer ${
                      resolutionAction === "refund"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    Full Refund
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionAction("uphold_merchant")}
                    className={`py-2 px-3 rounded-xl text-[12px] font-bold border transition-all cursor-pointer ${
                      resolutionAction === "uphold_merchant"
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    Uphold Store
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionAction("dismiss")}
                    className={`py-2 px-3 rounded-xl text-[12px] font-bold border transition-all cursor-pointer ${
                      resolutionAction === "dismiss"
                        ? "bg-zinc-100 border-zinc-400 text-zinc-800 shadow-xs"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    Dismiss Claim
                  </button>
                </div>
              </div>

              {/* Optional Administrative Note */}
              <div>
                <label className="block text-[12px] font-bold text-zinc-700 mb-1">
                  Resolution Note (Sent to Both Parties)
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional resolution explanation or refund reference..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-[12.5px] focus:outline-hidden focus:border-[#FF5B00] transition-all resize-none"
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 font-semibold text-[13px] hover:bg-zinc-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmResolution}
                  className="px-5 py-2 rounded-xl bg-[#FF5B00] hover:bg-[#e05000] text-white font-bold text-[13px] transition-all shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Executing..." : "Apply Verdict"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
