"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet,
  Clock,
  DollarSign,
  ChevronRight,
  X,
  Check,
  RefreshCw,
  Search,
  ArrowUpRight,
  Receipt,
  Building2,
  Bike,
} from "lucide-react";
import { fetchAdminPayouts, approveAdminPayout } from "@/lib/api";

export interface Transaction {
  id: string;
  type: "Order Payment" | "Merchant Payout" | "Rider Payout" | string;
  user: string;
  amount: string;
  moncashRef: string;
  date: string;
  status: "Split" | "Released" | "Held" | "Failed" | "Success" | string;
}

export interface PayoutQueueItem {
  id: string;
  name: string;
  walletBalance: string;
  lastPayout: string;
  method: string;
  accountPhone: string;
  type: "Merchant" | "Rider";
}

export default function PaymentsAndWalletsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [merchantQueue, setMerchantQueue] = useState<PayoutQueueItem[]>([]);
  const [riderQueue, setRiderQueue] = useState<PayoutQueueItem[]>([]);
  const [queueTab, setQueueTab] = useState<"Merchant" | "Rider">("Merchant");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const [stats, setStats] = useState({
    platformWalletTotal: "0 HTG",
    merchantPendingPayouts: "0 HTG",
    riderPendingPayouts: "0 HTG",
    merchantWaitingCount: 0,
    riderWaitingCount: 0,
  });

  // Search & Filter for transactions
  const [txnSearchQuery, setTxnSearchQuery] = useState("");
  const [txnStatusFilter, setTxnStatusFilter] = useState("All");

  // Release Payout Modal
  const [selectedPayout, setSelectedPayout] = useState<PayoutQueueItem | null>(null);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);

  // Transaction Receipt Modal
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const loadPayouts = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const res = await fetchAdminPayouts();
      if (res.success) {
        if (res.stats) {
          setStats({
            platformWalletTotal: res.stats.platformWalletTotal || "0 HTG",
            merchantPendingPayouts: res.stats.merchantPendingPayouts || "0 HTG",
            riderPendingPayouts: res.stats.riderPendingPayouts || "0 HTG",
            merchantWaitingCount: res.stats.merchantWaitingCount ?? 0,
            riderWaitingCount: res.stats.riderWaitingCount ?? 0,
          });
        }
        if (Array.isArray(res.transactions)) {
          setTransactions(
            res.transactions.map((t) => ({
              id: t.id,
              type: t.type,
              user: t.user,
              amount: t.amount,
              moncashRef: t.moncashRef || t.monCashRef || "—",
              date: t.date,
              status: t.status,
            }))
          );
        }
        if (Array.isArray(res.merchantQueue)) {
          setMerchantQueue(
            res.merchantQueue.map((m) => ({
              id: m.id,
              name: m.name,
              walletBalance: m.walletBalance,
              lastPayout: m.lastPayout,
              method: m.method || "MonCash",
              accountPhone: m.accountPhone || "+509 4800-1122",
              type: "Merchant",
            }))
          );
        }
        if (Array.isArray(res.riderQueue)) {
          setRiderQueue(
            res.riderQueue.map((r) => ({
              id: r.id,
              name: r.name,
              walletBalance: r.walletBalance,
              lastPayout: r.lastPayout,
              method: r.method || "MonCash",
              accountPhone: r.accountPhone || "+509 4801-2233",
              type: "Rider",
            }))
          );
        }
      }
    } catch (err) {
      console.warn("Could not load backend payouts:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  // Global search event listener
  useEffect(() => {
    const handleSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (typeof customEvent.detail === "string") {
        setTxnSearchQuery(customEvent.detail);
      }
    };
    window.addEventListener("admin_global_search", handleSearch);
    return () => window.removeEventListener("admin_global_search", handleSearch);
  }, []);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const q = txnSearchQuery.toLowerCase().trim();
    return transactions.filter((t) => {
      const matchesStatus =
        txnStatusFilter === "All" ||
        t.status.toLowerCase() === txnStatusFilter.toLowerCase();

      const matchesSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.user.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.moncashRef.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [transactions, txnSearchQuery, txnStatusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Split":
        return "bg-blue-50 text-blue-700";
      case "Released":
      case "Success":
        return "bg-emerald-50 text-emerald-700";
      case "Held":
        return "bg-amber-50 text-amber-700";
      case "Failed":
        return "bg-red-50 text-red-600";
      default:
        return "bg-zinc-100 text-zinc-700";
    }
  };

  const handleConfirmPayout = async () => {
    if (!selectedPayout) return;
    setIsSubmittingPayout(true);

    try {
      const res = await approveAdminPayout({
        recipient: selectedPayout.name,
        amount: selectedPayout.walletBalance,
        id: selectedPayout.id,
        type: selectedPayout.type,
      });

      if (res.success) {
        // Record immediate local transaction
        const newTxn: Transaction = {
          id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
          type: selectedPayout.type === "Merchant" ? "Merchant Payout" : "Rider Payout",
          user: selectedPayout.name,
          amount: selectedPayout.walletBalance,
          moncashRef: `MON-261101-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
          date: new Date().toISOString().split("T")[0],
          status: "Released",
        };

        setTransactions((prev) => [newTxn, ...prev]);

        // Reset balance in local state
        if (selectedPayout.type === "Merchant") {
          setMerchantQueue((prev) =>
            prev.map((item) =>
              item.id === selectedPayout.id
                ? { ...item, walletBalance: "0 HTG", lastPayout: "Just now" }
                : item
            )
          );
        } else {
          setRiderQueue((prev) =>
            prev.map((item) =>
              item.id === selectedPayout.id
                ? { ...item, walletBalance: "0 HTG", lastPayout: "Just now" }
                : item
            )
          );
        }

        setPayoutSuccessMsg(
          res.message ||
            `MonCash Payout of ${selectedPayout.walletBalance} to ${selectedPayout.name} successfully executed!`
        );

        setTimeout(() => {
          setSelectedPayout(null);
          setPayoutSuccessMsg(null);
          loadPayouts(true);
        }, 1200);
      }
    } catch (err) {
      console.error("Payout approval error:", err);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const currentQueue = queueTab === "Merchant" ? merchantQueue : riderQueue;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 select-none">
      {/* Top Header with Live Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E1B4B]">Payments & Wallets</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Real-time platform ledger, partner balances, and MonCash disbursal queue
          </p>
        </div>
        <button
          onClick={() => loadPayouts(true)}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-zinc-500 ${
              isRefreshing ? "animate-spin text-[#FF5B00]" : ""
            }`}
          />
          <span>{isRefreshing ? "Refreshing..." : "Refresh Ledger"}</span>
        </button>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Platform Wallet Total (Navy Blue) */}
        <div className="bg-[#1E1B4B] rounded-2xl p-6 text-white shadow-xs flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center gap-2.5 text-zinc-300 text-[13px] font-medium">
            <Wallet className="w-4 h-4 text-indigo-300" />
            <span>Platform Wallet Total</span>
          </div>
          <div className="mt-3">
            <div className="text-[28px] font-bold tracking-tight text-white">
              {isLoading ? "..." : stats.platformWalletTotal}
            </div>
            <div className="text-[12px] text-indigo-200 mt-1">
              All held orders & escrow funds
            </div>
          </div>
        </div>

        {/* Card 2: Merchant Pending Payouts (Amber / Orange) */}
        <div className="bg-[#E07010] rounded-2xl p-6 text-white shadow-xs flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center gap-2.5 text-orange-100 text-[13px] font-medium">
            <Clock className="w-4 h-4 text-orange-200" />
            <span>Merchant Pending Payouts</span>
          </div>
          <div className="mt-3">
            <div className="text-[28px] font-bold tracking-tight text-white">
              {isLoading ? "..." : stats.merchantPendingPayouts}
            </div>
            <div className="text-[12px] text-orange-100 mt-1">
              {stats.merchantWaitingCount} merchant{stats.merchantWaitingCount === 1 ? "" : "s"} waiting
            </div>
          </div>
        </div>

        {/* Card 3: Rider Pending Payouts (Vibrant Orange) */}
        <div className="bg-[#FF5B00] rounded-2xl p-6 text-white shadow-xs flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center gap-2.5 text-orange-100 text-[13px] font-medium">
            <DollarSign className="w-4 h-4 text-white" />
            <span>Rider Pending Payouts</span>
          </div>
          <div className="mt-3">
            <div className="text-[28px] font-bold tracking-tight text-white">
              {isLoading ? "..." : stats.riderPendingPayouts}
            </div>
            <div className="text-[12px] text-orange-100 mt-1">
              {stats.riderWaitingCount} rider{stats.riderWaitingCount === 1 ? "" : "s"} waiting
            </div>
          </div>
        </div>
      </div>

      {/* Payment Flow Stepper Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-5 space-y-3">
        <h3 className="text-[13.5px] font-bold text-[#1E1B4B]">
          Payment Flow
        </h3>

        <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium">
          <div className="px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold">
            Customer pays via MonCash
          </div>

          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />

          <div className="px-3.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-semibold">
            Funds held in Platform Wallet
          </div>

          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />

          <div className="px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold">
            Rider completes delivery
          </div>

          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />

          <div className="px-3.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-semibold">
            OTP confirmed by Customer
          </div>

          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />

          <div className="px-3.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 font-semibold">
            System auto-splits funds
          </div>

          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />

          <div className="px-3.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 font-semibold">
            Admin releases payout
          </div>
        </div>
      </div>

      {/* Transactions Table Card with Search & Status Filter */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-[15.5px] font-bold text-[#1E1B4B]">
              Transactions
            </h3>
            <span className="text-[12px] text-zinc-400 font-medium">
              MonCash Gateway & Platform Ledger Logs
            </span>
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={txnSearchQuery}
                onChange={(e) => setTxnSearchQuery(e.target.value)}
                placeholder="Search transaction, user, ref..."
                className="w-64 pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[12.5px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <select
              value={txnStatusFilter}
              onChange={(e) => setTxnStatusFilter(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-[12.5px] font-medium text-zinc-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Split">Split</option>
              <option value="Released">Released</option>
              <option value="Held">Held</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-white text-zinc-400 text-[11.5px] font-medium border-b border-zinc-100">
              <tr>
                <th className="py-3 px-6 font-normal">Transaction ID</th>
                <th className="py-3 px-6 font-normal">Type</th>
                <th className="py-3 px-6 font-normal">User</th>
                <th className="py-3 px-6 font-normal">Amount</th>
                <th className="py-3 px-6 font-normal">MonCash Ref</th>
                <th className="py-3 px-6 font-normal">Date</th>
                <th className="py-3 px-6 font-normal text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-20"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-24"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-28"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-16"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-24"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-20"></div></td>
                    <td className="py-4 px-6 text-right"><div className="h-5 bg-zinc-100 rounded-full w-14 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTxn(t)}
                    className="hover:bg-zinc-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 font-bold text-[#1E1B4B]">
                      {t.id}
                    </td>
                    <td className="py-4 px-6 text-zinc-700">{t.type}</td>
                    <td className="py-4 px-6 text-zinc-900 font-medium">
                      {t.user}
                    </td>
                    <td className="py-4 px-6 font-bold text-zinc-900">
                      {t.amount}
                    </td>
                    <td className="py-4 px-6 font-mono text-[12px] text-zinc-500">
                      {t.moncashRef}
                    </td>
                    <td className="py-4 px-6 font-mono text-[12px] text-zinc-600">
                      {t.date}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-zinc-400 text-[13px]">
                    No transactions match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Queue Card with Merchant / Rider Tabs */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        {/* Header with Title and Tabs */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-[15.5px] font-bold text-[#1E1B4B]">
              Payout Queue
            </h3>
            {/* Tabs: Merchant / Rider */}
            <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl">
              <button
                onClick={() => setQueueTab("Merchant")}
                className={`px-3.5 py-1 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  queueTab === "Merchant"
                    ? "bg-[#1E1B4B] text-white shadow-xs"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Merchant</span>
              </button>
              <button
                onClick={() => setQueueTab("Rider")}
                className={`px-3.5 py-1 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  queueTab === "Rider"
                    ? "bg-[#1E1B4B] text-white shadow-xs"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Rider</span>
              </button>
            </div>
          </div>

          <span className="text-[12px] text-zinc-400 font-medium">
            Pending MonCash Disbursals ({currentQueue.filter((q) => q.walletBalance !== "0 HTG").length} ready)
          </span>
        </div>

        {/* Payout Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-white text-zinc-400 text-[11.5px] font-medium border-b border-zinc-100">
              <tr>
                <th className="py-3 px-6 font-normal">Name</th>
                <th className="py-3 px-6 font-normal">Wallet Balance</th>
                <th className="py-3 px-6 font-normal">Last Payout</th>
                <th className="py-3 px-6 font-normal">Method</th>
                <th className="py-3 px-6 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-32"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-20"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-24"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-zinc-100 rounded w-28"></div></td>
                    <td className="py-4 px-6 text-right"><div className="h-7 bg-zinc-100 rounded-lg w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : currentQueue.length > 0 ? (
                currentQueue.map((item) => {
                  const hasZeroBalance = item.walletBalance === "0 HTG" || item.walletBalance === "0.00 HTG";
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50/70 transition-colors"
                    >
                      <td className="py-4 px-6 font-bold text-zinc-900">
                        {item.name}
                      </td>
                      <td className="py-4 px-6 font-bold text-emerald-600">
                        {item.walletBalance}
                      </td>
                      <td className="py-4 px-6 font-mono text-[12px] text-zinc-600">
                        {item.lastPayout}
                      </td>
                      <td className="py-4 px-6 text-zinc-600">
                        <span className="font-semibold text-zinc-800">
                          {item.method}
                        </span>
                        <span className="text-zinc-400 text-[11.5px] ml-1.5 font-mono">
                          ({item.accountPhone})
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedPayout(item)}
                          disabled={hasZeroBalance}
                          className="px-4 py-1.5 rounded-lg bg-[#FF5B00] hover:bg-orange-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-semibold text-[12px] shadow-xs transition-colors cursor-pointer"
                        >
                          Release Payout
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-400 text-[13px]">
                    No partner payout accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Release MonCash Payout Confirmation Dialog */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h3 className="text-[17px] font-bold text-[#1E1B4B]">
                Release MonCash Payout
              </h3>
              <button
                onClick={() => setSelectedPayout(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {payoutSuccessMsg ? (
              <div className="py-8 flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>
                <div className="text-[16px] font-bold text-emerald-700">
                  Payout Disbursed!
                </div>
                <p className="text-[12.5px] text-zinc-500">
                  {payoutSuccessMsg}
                </p>
              </div>
            ) : (
              <div className="space-y-4 my-4 text-[13px]">
                <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-100 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#FF5B00]">
                    Recipient
                  </div>
                  <div className="font-bold text-zinc-900 text-[15px]">
                    {selectedPayout.name} ({selectedPayout.type})
                  </div>
                  <div className="text-[12px] font-mono text-zinc-600">
                    MonCash: {selectedPayout.accountPhone}
                  </div>
                </div>

                <div className="space-y-2 text-zinc-600">
                  <div className="flex items-center justify-between">
                    <span>Withdrawal Balance</span>
                    <span className="font-bold text-zinc-900">
                      {selectedPayout.walletBalance}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Transfer Method</span>
                    <span className="font-semibold text-zinc-800">
                      MonCash Instant Disbursal
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Processing Fee</span>
                    <span className="font-semibold text-emerald-600">
                      0 HTG (Covered)
                    </span>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between font-bold text-[14px] text-[#1E1B4B]">
                    <span>Total Disbursed</span>
                    <span className="text-[#FF5B00] text-[16px]">
                      {selectedPayout.walletBalance}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-zinc-100">
                  <button
                    onClick={() => setSelectedPayout(null)}
                    disabled={isSubmittingPayout}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-[13px] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPayout}
                    disabled={isSubmittingPayout}
                    className="flex-1 py-2.5 rounded-xl bg-[#FF5B00] hover:bg-orange-600 disabled:bg-zinc-300 text-white font-semibold text-[13px] shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmittingPayout ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Confirm Payout</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: MonCash Transaction Receipt Details */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div>
                <h3 className="text-[17px] font-bold text-[#1E1B4B]">
                  Transaction Receipt
                </h3>
                <p className="text-[11.5px] font-mono text-zinc-400 mt-0.5">
                  {selectedTxn.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 space-y-3 text-[13px]">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Transaction Type</span>
                  <span className="font-semibold text-zinc-800">
                    {selectedTxn.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Party</span>
                  <span className="font-bold text-zinc-900">
                    {selectedTxn.user}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">MonCash Reference</span>
                  <span className="font-mono text-zinc-700 font-semibold">
                    {selectedTxn.moncashRef}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Date Logged</span>
                  <span className="font-mono text-zinc-600">
                    {selectedTxn.date}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Gateway Status</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(
                      selectedTxn.status
                    )}`}
                  >
                    {selectedTxn.status}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-100 bg-white shadow-2xs flex items-center justify-between">
                <span className="font-bold text-[#1E1B4B]">Total Amount</span>
                <span className="font-bold text-[#FF5B00] text-[17px]">
                  {selectedTxn.amount}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-[13px] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
