"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_NAVIGATION, ADMIN_MORE_NAVIGATION } from "@/constants/navigation";
import { LogOut, ShoppingBag } from "lucide-react";
import { clearAdminSession, getStoredAdminUser, AdminUser, fetchPlatformStats, fetchAdminNotifications } from "@/lib/api";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() =>
    getStoredAdminUser()
  );
  const [badges, setBadges] = useState<Record<string, number>>({});

  const loadBadges = useCallback(async () => {
    try {
      const statsRes = await fetchPlatformStats();
      const updatedBadges: Record<string, number> = {};

      if (statsRes.success && statsRes.data) {
        const d = statsRes.data;
        if (typeof d.merchantsPendingVerification === "number" && d.merchantsPendingVerification > 0) {
          updatedBadges["/merchants"] = d.merchantsPendingVerification;
        }
        if (typeof d.ridersPendingVerification === "number" && d.ridersPendingVerification > 0) {
          updatedBadges["/riders"] = d.ridersPendingVerification;
        }
        if (typeof d.pendingOrdersCount === "number" && d.pendingOrdersCount > 0) {
          updatedBadges["/orders"] = d.pendingOrdersCount;
        }
        if (typeof d.activeDeliveriesCount === "number" && d.activeDeliveriesCount > 0) {
          updatedBadges["/deliveries"] = d.activeDeliveriesCount;
        }
        if (typeof d.pendingPayoutCount === "number" && d.pendingPayoutCount > 0) {
          updatedBadges["/payouts"] = d.pendingPayoutCount;
        }
        if (typeof d.disputesPendingCount === "number" && d.disputesPendingCount > 0) {
          updatedBadges["/disputes"] = d.disputesPendingCount;
        }
      }

      const notifRes = await fetchAdminNotifications();
      if (notifRes.success && typeof notifRes.unreadCount === "number" && notifRes.unreadCount > 0) {
        updatedBadges["/notifications"] = notifRes.unreadCount;
      }

      setBadges(updatedBadges);
    } catch (err) {
      console.error("Failed to load dynamic sidebar badges:", err);
    }
  }, []);

  useEffect(() => {
    const handleAuth = () => setAdminUser(getStoredAdminUser());
    const handleStatsUpdated = () => loadBadges();

    window.addEventListener("admin_auth_changed", handleAuth);
    window.addEventListener("admin_stats_updated", handleStatsUpdated);

    loadBadges();

    // Auto-refresh dynamic counts every 20 seconds
    const interval = setInterval(loadBadges, 20000);

    return () => {
      window.removeEventListener("admin_auth_changed", handleAuth);
      window.removeEventListener("admin_stats_updated", handleStatsUpdated);
      clearInterval(interval);
    };
  }, [loadBadges]);

  useEffect(() => {
    loadBadges();
  }, [pathname, loadBadges]);

  const handleLogout = () => {
    clearAdminSession();
    router.push("/login");
  };

  const displayName = adminUser?.full_name || "Admin User";
  const displayRole = adminUser?.role === "admin" ? "Super Admin" : "Administrator";

  return (
    <aside className="w-[240px] bg-[#0F1014] text-zinc-300 flex flex-col h-full overflow-y-auto shrink-0 select-none border-r border-zinc-800/60">
      {/* Brand Header */}
      <div className="h-[76px] flex items-center px-5 border-b border-zinc-800/70 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#FF5B00] flex items-center justify-center text-white shadow-sm shadow-orange-500/20">
            <ShoppingBag className="w-4 h-4 stroke-[2.4]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[15px] leading-tight text-white tracking-tight">
              TiBoutik
            </span>
            <span className="text-[11px] text-zinc-400 font-normal">
              Admin Panel
            </span>
          </div>
        </Link>
      </div>

      {/* Main Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {ADMIN_NAVIGATION.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (pathname === "/" && item.href === "/dashboard");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 text-[13.5px] ${
                isActive
                  ? "bg-[#FF5B00] text-white font-semibold shadow-sm shadow-orange-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 font-medium"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-white" : "text-zinc-400"
                  }`}
                  strokeWidth={isActive ? 2.3 : 2}
                />
                <span>{item.title}</span>
              </div>

              {(() => {
                const badgeVal = badges[item.href] ?? item.badge;
                if (!badgeVal || badgeVal <= 0) return null;
                return (
                  <span
                    className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-white text-[#FF5B00]"
                        : "bg-[#FF5B00] text-white"
                    }`}
                  >
                    {badgeVal > 99 ? "99+" : badgeVal}
                  </span>
                );
              })()}
            </Link>
          );
        })}

        {/* Operations Navigation */}
        <div className="pt-2 mt-2 border-t border-zinc-800/40">
          <div className="px-3.5 py-1 text-[10.5px] uppercase tracking-wider text-zinc-500 font-semibold">
            Operations
          </div>
          {ADMIN_MORE_NAVIGATION.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2 rounded-xl transition-all duration-150 text-[13px] ${
                  isActive
                    ? "bg-[#FF5B00] text-white font-semibold shadow-sm shadow-orange-600/30"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-zinc-400"
                    }`}
                    strokeWidth={isActive ? 2.3 : 2}
                  />
                  <span>{item.title}</span>
                </div>

                {(() => {
                  const badgeVal = badges[item.href] ?? item.badge;
                  if (!badgeVal || badgeVal <= 0) return null;
                  return (
                    <span
                      className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-white text-[#FF5B00]"
                          : "bg-[#FF5B00] text-white"
                      }`}
                    >
                      {badgeVal > 99 ? "99+" : badgeVal}
                    </span>
                  );
                })()}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-zinc-800/70 shrink-0 space-y-2">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-[#FF5B00] text-white font-bold text-[11px] flex items-center justify-center shadow-xs">
            AD
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold text-white truncate leading-tight">
              {displayName}
            </span>
            <span className="text-[11px] text-zinc-400 truncate">
              {displayRole}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors text-[13px] font-medium text-left"
        >
          <LogOut className="w-4 h-4 text-zinc-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
