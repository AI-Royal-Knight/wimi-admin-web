"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Send,
  CheckCheck,
  AlertCircle,
  Store,
  Bike,
  Wallet,
  Shield,
  X,
  Check,
  Radio,
  Clock,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  fetchAdminNotifications,
  sendAdminBroadcast,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  triggerAdminBadgeRefresh,
  AdminNotification,
} from "@/lib/api";

export default function NotificationsAdminPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Broadcast Modal
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastPriority, setBroadcastPriority] = useState<"urgent" | "normal">("normal");
  const [isSending, setIsSending] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
        if (typeof res.unreadCount === "number") setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.warn("Using default notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markAdminNotificationRead(id);
    triggerAdminBadgeRefresh();
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await markAllAdminNotificationsRead();
    triggerAdminBadgeRefresh();
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;

    setIsSending(true);
    try {
      const res = await sendAdminBroadcast({
        title: broadcastTitle,
        message: broadcastMessage,
        category: broadcastTarget === "merchants" ? "merchant" : broadcastTarget === "riders" ? "rider" : "system",
        priority: broadcastPriority,
      });

      if (res.success) {
        setBroadcastSuccess("Broadcast published across network.");
        await loadNotifications();
        triggerAdminBadgeRefresh();
        setTimeout(() => {
          setIsBroadcastOpen(false);
          setBroadcastSuccess(null);
          setBroadcastTitle("");
          setBroadcastMessage("");
        }, 1200);
      } else {
        alert(res.message || "Failed to publish broadcast.");
      }
    } catch {
      alert("Network error publishing broadcast.");
    } finally {
      setIsSending(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "unread") return !n.is_read;
    return n.category === categoryFilter;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "dispute":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "merchant":
        return <Store className="w-4 h-4 text-blue-500" />;
      case "rider":
        return <Bike className="w-4 h-4 text-emerald-500" />;
      case "payout":
        return <Wallet className="w-4 h-4 text-purple-500" />;
      default:
        return <Shield className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 select-none">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[19px] font-bold text-[#1E1B4B]">
                Administrative Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF5B00] text-white text-[11px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-zinc-500 mt-0.5">
              Platform dispatch warnings, fleet alerts, KYC submissions, and broadcast manager.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-semibold text-[12.5px] transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-zinc-500" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            onClick={() => setIsBroadcastOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5B00] hover:bg-[#e05000] text-white text-[12.5px] font-bold transition-all shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Broadcast</span>
          </button>
        </div>
      </div>

      {/* Filter Categories */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-4 flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: "All Alerts" },
          { id: "unread", label: `Unread (${unreadCount})` },
          { id: "dispute", label: "Disputes" },
          { id: "merchant", label: "Merchants" },
          { id: "rider", label: "Riders" },
          { id: "payout", label: "Payouts" },
          { id: "system", label: "System & Ops" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold transition-all cursor-pointer ${
              categoryFilter === tab.id
                ? "bg-[#1E1B4B] text-white shadow-xs"
                : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-12 text-center text-zinc-400">
            <Bell className="w-8 h-8 mx-auto text-zinc-300 stroke-[1.5] mb-2" />
            <p className="text-[13.5px]">No notifications in this category.</p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl border p-5 transition-all flex items-start justify-between gap-4 ${
                !n.is_read
                  ? "border-orange-200/80 bg-orange-50/15 shadow-xs"
                  : "border-zinc-200/80 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    !n.is_read ? "bg-orange-100/70" : "bg-zinc-100"
                  }`}
                >
                  {getCategoryIcon(n.category)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-bold text-[#1E1B4B]">
                      {n.title}
                    </h3>
                    {n.priority === "urgent" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700">
                        URGENT
                      </span>
                    )}
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#FF5B00]"></span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-zinc-600 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>{n.time}</span>
                    <span>•</span>
                    <span className="capitalize">{n.category} Alert</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {n.action_url && (
                  <Link
                    href={n.action_url}
                    onClick={() => {
                      if (!n.is_read) handleMarkAsRead(n.id);
                    }}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-[#FF5B00] bg-orange-50 hover:bg-orange-100 transition-colors inline-flex items-center gap-1"
                  >
                    Take Action <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Send Broadcast Modal */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF5B00] flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <h3 className="text-[16px] font-bold text-[#1E1B4B]">
                  Send Platform Broadcast
                </h3>
              </div>
              <button
                onClick={() => setIsBroadcastOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {broadcastSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-[12.5px] font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{broadcastSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="mt-4 space-y-4">
              <div>
                <label className="block text-[12.5px] font-bold text-zinc-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-[13px] focus:outline-hidden focus:border-[#FF5B00] transition-all bg-white font-medium"
                >
                  <option value="all">All Platform Users (Merchants & Riders)</option>
                  <option value="merchants">Registered Merchants Only</option>
                  <option value="riders">Active Delivery Fleet Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-zinc-700 mb-1">
                  Broadcast Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Network Maintenance Notice"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-[13px] focus:outline-hidden focus:border-[#FF5B00] transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-zinc-700 mb-1">
                  Notification Message
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the update, advisory, or instructions clearly..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-[12.5px] focus:outline-hidden focus:border-[#FF5B00] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-zinc-700 mb-1.5">
                  Priority Level
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-[12.5px] font-medium text-zinc-700 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={broadcastPriority === "normal"}
                      onChange={() => setBroadcastPriority("normal")}
                      className="text-[#FF5B00] focus:ring-[#FF5B00]"
                    />
                    <span>Normal Alert</span>
                  </label>
                  <label className="flex items-center gap-2 text-[12.5px] font-medium text-red-600 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={broadcastPriority === "urgent"}
                      onChange={() => setBroadcastPriority("urgent")}
                      className="text-red-600 focus:ring-red-600"
                    />
                    <span>Urgent / Critical</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBroadcastOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 font-semibold text-[13px] hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 rounded-xl bg-[#FF5B00] hover:bg-[#e05000] text-white font-bold text-[13px] transition-all shadow-xs disabled:opacity-50"
                >
                  {isSending ? "Publishing..." : "Send Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
