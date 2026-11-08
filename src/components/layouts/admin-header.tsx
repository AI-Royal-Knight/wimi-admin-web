"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Bell,
  Check,
  ChevronRight,
  Store,
  Bike,
  AlertCircle,
  Wallet,
  Shield,
  Radio,
  Clock,
  CheckCheck,
} from "lucide-react";
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  triggerAdminBadgeRefresh,
  AdminNotification,
} from "@/lib/api";

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetchAdminNotifications();
      if (res && res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
        setUnreadCount(
          typeof res.unreadCount === "number"
            ? res.unreadCount
            : res.data.filter((n) => !n.is_read).length
        );
      }
    } catch (err) {
      console.error("Failed to fetch admin notifications:", err);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const handleStatsUpdated = () => loadNotifications();
    window.addEventListener("admin_stats_updated", handleStatsUpdated);

    // Auto-poll notifications every 20 seconds
    const interval = setInterval(loadNotifications, 20000);

    return () => {
      window.removeEventListener("admin_stats_updated", handleStatsUpdated);
      clearInterval(interval);
    };
  }, [loadNotifications]);

  // Close notifications dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await markAllAdminNotificationsRead();
      triggerAdminBadgeRefresh();
    } catch {
      // Ignored
    }
  };

  const handleNotificationClick = async (n: AdminNotification) => {
    if (!n.is_read) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await markAdminNotificationRead(n.id);
        triggerAdminBadgeRefresh();
      } catch {
        // Ignored
      }
    }
    setShowNotifications(false);
    if (n.action_url) {
      router.push(n.action_url);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "merchant":
        return <Store className="w-3.5 h-3.5 text-orange-600" />;
      case "rider":
        return <Bike className="w-3.5 h-3.5 text-blue-600" />;
      case "dispute":
        return <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
      case "payout":
        return <Wallet className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  const getPageInfo = () => {
    if (pathname.includes("/customers")) {
      return {
        title: "Customers",
        subtitle: "Manage and monitor all registered customers",
      };
    }
    if (pathname.includes("/merchants")) {
      return {
        title: "Merchants",
        subtitle: "Manage and verify platform merchant stores",
      };
    }
    if (pathname.includes("/riders")) {
      return {
        title: "Riders",
        subtitle: "Manage delivery fleet and verification requests",
      };
    }
    if (pathname.includes("/orders")) {
      return {
        title: "Orders",
        subtitle: "Track live and historical platform orders",
      };
    }
    if (pathname.includes("/deliveries")) {
      return {
        title: "Deliveries & Tracking",
        subtitle: "Monitor active deliveries in real time",
      };
    }
    if (pathname.includes("/payouts")) {
      return {
        title: "Payments & Wallets",
        subtitle: "Manage MonCash transactions and payouts",
      };
    }
    if (pathname.includes("/commissions")) {
      return {
        title: "Commissions",
        subtitle: "Platform earnings and fee breakdown",
      };
    }
    if (pathname.includes("/disputes")) {
      return {
        title: "Disputes",
        subtitle: "Customer complaints and claims arbitration",
      };
    }
    if (pathname.includes("/notifications")) {
      return {
        title: "Notifications",
        subtitle: "Platform announcements and security notices",
      };
    }
    if (pathname.includes("/settings")) {
      return {
        title: "Settings",
        subtitle: "Configure platform and admin preferences",
      };
    }
    return {
      title: "Dashboard",
      subtitle: "Welcome back — here's what's happening on TiBoutik",
    };
  };

  const { title, subtitle } = getPageInfo();

  return (
    <header className="h-[76px] bg-white border-b border-zinc-200/80 px-8 flex items-center justify-between shrink-0 select-none relative z-30">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-[20px] font-bold text-[#1E1B4B] tracking-tight leading-tight">
          {title}
        </h1>
        <p className="text-[12.5px] text-zinc-500 font-normal mt-0.5">
          {subtitle}
        </p>
      </div>

      {/* Top Right: Search & Notifications */}
      <div className="flex items-center gap-3">
        {/* Global Search */}
        <div className="relative">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              window.dispatchEvent(
                new CustomEvent("admin_global_search", { detail: e.target.value })
              );
            }}
            placeholder="Search..."
            className="w-[200px] sm:w-[240px] pl-3.5 pr-8 py-1.5 bg-white border border-zinc-200 rounded-lg text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* ── Dynamic Notifications Popover ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className={`relative w-9 h-9 flex items-center justify-center rounded-lg border transition-all ${
              showNotifications
                ? "border-orange-500 bg-orange-50 text-[#FF5B00]"
                : "border-zinc-200 text-zinc-600 hover:text-black hover:bg-zinc-50"
            }`}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-[#FF5B00] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {showNotifications && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-[360px] sm:w-[400px] bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 bg-zinc-50/70">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-900 text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-[#FF5B00] text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-bold text-[#FF5B00] hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="divide-y divide-zinc-100 max-h-[380px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400">
                    <Bell className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-zinc-600">No notifications</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Platform is operating normally</p>
                  </div>
                ) : (
                  notifications.slice(0, 15).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                        !n.is_read ? "bg-orange-50/30 hover:bg-orange-50/60" : "hover:bg-zinc-50"
                      }`}
                    >
                      {/* Icon */}
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5 border border-zinc-200/60">
                        {getCategoryIcon(n.category)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                          <p className={`text-xs ${!n.is_read ? "font-bold text-zinc-900" : "font-semibold text-zinc-700"}`}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#FF5B00] shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11.5px] text-zinc-500 mt-0.5 leading-snug line-clamp-2">
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-400 font-medium">{n.time}</span>
                          {n.priority === "urgent" && (
                            <span className="text-[9.5px] uppercase font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                              Urgent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/70 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-medium">Real-time alerts</span>
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-bold text-[#FF5B00] hover:underline flex items-center gap-1"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

