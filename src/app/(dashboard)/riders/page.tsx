"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  MoreVertical,
  Eye,
  Pause,
  X,
  Check,
  AlertTriangle,
  Download,
  FileText,
  Bike,
  Smile,
  ShieldCheck,
  IdCard,
  AlertCircle,
  Ban,
  Search,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  fetchAdminRiders,
  fetchRiderDetail,
  verifyRiderKYC,
  rejectRiderKYC,
  toggleSuspendRider,
  ApiRider,
} from "@/lib/api";

export default function RidersAdminPage() {
  const [riders, setRiders] = useState<ApiRider[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<
    "All" | "Pending Verification" | "Suspended"
  >("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Action Menu state
  const [activeMenuRider, setActiveMenuRider] = useState<ApiRider | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);

  // Modals state
  const [profileRider, setProfileRider] = useState<ApiRider | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const [kycReviewRider, setKycReviewRider] = useState<ApiRider | null>(null);
  const [isApprovedComplete, setIsApprovedComplete] = useState(false);
  const [kycSubmitting, setKycSubmitting] = useState(false);

  const [rejectionTarget, setRejectionTarget] = useState<ApiRider | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [rejectionSubmitting, setRejectionSubmitting] = useState(false);

  const [suspendTarget, setSuspendTarget] = useState<ApiRider | null>(null);
  const [suspendReasonInput, setSuspendReasonInput] = useState("");
  const [suspendSubmitting, setSuspendSubmitting] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Load riders from backend API
  const loadRiders = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const tabSlug =
        activeTab === "Pending Verification"
          ? "pending"
          : activeTab === "Suspended"
          ? "suspended"
          : "all";

      const res = await fetchAdminRiders(tabSlug, searchQuery);
      if (res.success && Array.isArray(res.data)) {
        setRiders(res.data);
        setTotalCount(res.count);
      }
    } catch (err) {
      console.error("Failed to load riders:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRiders();
  }, [activeTab, searchQuery]);

  // Global search listener
  useEffect(() => {
    const handleSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (typeof customEvent.detail === "string") {
        setSearchQuery(customEvent.detail.trim());
      }
    };
    window.addEventListener("admin_global_search", handleSearch);

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuRider(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("admin_global_search", handleSearch);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const openActionMenu = (rider: ApiRider, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMenuRider?.id === rider.id) {
      setActiveMenuRider(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY + 6,
      right: window.innerWidth - rect.right,
    });
    setActiveMenuRider(rider);
  };

  // Profile Modal Flow
  const handleOpenProfile = async (rider: ApiRider) => {
    setProfileRider(rider);
    setActiveMenuRider(null);
    setProfileLoading(true);

    try {
      const res = await fetchRiderDetail(rider.id);
      if (res.success && res.data) {
        setProfileRider(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch full rider profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  // KYC Flow Handlers
  const handleStartKYC = async (rider: ApiRider) => {
    setActiveMenuRider(null);
    setProfileRider(null);
    setKycReviewRider(rider);
    setIsApprovedComplete(false);

    try {
      const res = await fetchRiderDetail(rider.id);
      if (res.success && res.data) {
        setKycReviewRider(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch rider KYC data:", err);
    }
  };

  const handleApproveKYC = async (riderId: string) => {
    setKycSubmitting(true);
    try {
      const res = await verifyRiderKYC(riderId);
      if (res.success) {
        setRiders((prev) =>
          prev.map((r) => (r.id === riderId ? { ...r, status: "Active" } : r))
        );
        setIsApprovedComplete(true);
        loadRiders();
      }
    } catch (err) {
      console.error("Failed to approve rider KYC:", err);
    } finally {
      setKycSubmitting(false);
    }
  };

  const handleFinishKYC = () => {
    setKycReviewRider(null);
    setIsApprovedComplete(false);
    loadRiders();
  };

  // Rejection Flow Handlers
  const handleOpenRejection = (rider: ApiRider) => {
    setActiveMenuRider(null);
    setKycReviewRider(null);
    setRejectionTarget(rider);
    setRejectionReasonInput("");
  };

  const handleConfirmRejection = async () => {
    if (!rejectionTarget) return;
    const reason =
      rejectionReasonInput.trim() ||
      "Driver license or vehicle documentation verification requirements not satisfied.";

    setRejectionSubmitting(true);
    const targetId = rejectionTarget.id;

    try {
      const res = await rejectRiderKYC(targetId, reason);
      if (res.success) {
        setRiders((prev) =>
          prev.map((r) =>
            r.id === targetId
              ? { ...r, status: "Suspended", rejectionReason: reason }
              : r
          )
        );
        setRejectionTarget(null);
        setRejectionReasonInput("");
        loadRiders();
      }
    } catch (err) {
      console.error("Failed to reject rider KYC:", err);
    } finally {
      setRejectionSubmitting(false);
    }
  };

  // Suspension Flow Handlers
  const handleOpenSuspend = (rider: ApiRider) => {
    setActiveMenuRider(null);
    setProfileRider(null);
    setSuspendTarget(rider);
    setSuspendReasonInput("");
  };

  const handleConfirmSuspend = async () => {
    if (!suspendTarget) return;
    const reason =
      suspendReasonInput.trim() ||
      "Rider temporarily suspended pending dispatch compliance review.";

    setSuspendSubmitting(true);
    const targetId = suspendTarget.id;

    try {
      const res = await toggleSuspendRider(targetId, "suspend", reason);
      if (res.success) {
        setRiders((prev) =>
          prev.map((r) =>
            r.id === targetId
              ? { ...r, status: "Suspended", suspensionReason: reason }
              : r
          )
        );
        setSuspendTarget(null);
        setSuspendReasonInput("");
        loadRiders();
      }
    } catch (err) {
      console.error("Failed to suspend rider:", err);
    } finally {
      setSuspendSubmitting(false);
    }
  };

  const handleUnsuspend = async (rider: ApiRider) => {
    setActiveMenuRider(null);
    try {
      const res = await toggleSuspendRider(rider.id, "unsuspend");
      if (res.success) {
        setRiders((prev) =>
          prev.map((r) =>
            r.id === rider.id
              ? { ...r, status: "Active", suspensionReason: undefined }
              : r
          )
        );
        if (profileRider?.id === rider.id) {
          setProfileRider((prev) =>
            prev ? { ...prev, status: "Active", suspensionReason: undefined } : null
          );
        }
        loadRiders();
      }
    } catch (err) {
      console.error("Failed to unsuspend rider:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
      case "On Delivery":
        return "bg-purple-50 text-purple-700 border border-purple-200/50";
      case "Offline":
        return "bg-zinc-100 text-zinc-600 border border-zinc-200/50";
      case "Pending Verification":
        return "bg-amber-50 text-amber-700 border border-amber-200/50";
      case "Suspended":
        return "bg-red-50 text-red-600 border border-red-200/50";
      default:
        return "bg-zinc-100 text-zinc-700 border border-zinc-200/50";
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 select-none">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E1B4B]">Riders</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Fleet partner directory, vehicle verifications, and dispatch status
          </p>
        </div>
        <button
          onClick={() => loadRiders(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors shadow-2xs disabled:opacity-60 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-zinc-500 ${
              isRefreshing ? "animate-spin text-[#FF5B00]" : ""
            }`}
          />
          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        {/* Top Controls: Tabs & Search */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100">
          {/* Tabs: All / Pending Verification / Suspended */}
          <div className="flex items-center gap-2">
            {(["All", "Pending Verification", "Suspended"] as const).map(
              (tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#FF5B00] text-white shadow-2xs"
                        : "bg-zinc-100 text-zinc-600 hover:text-black hover:bg-zinc-200"
                    }`}
                  >
                    {tab === "All" ? "All Riders" : tab}
                  </button>
                );
              }
            )}
          </div>

          {/* Search Box & Count */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search rider, phone, zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[12.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#FF5B00] focus:border-[#FF5B00] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-[12.5px] font-medium text-zinc-500 whitespace-nowrap">
              {isLoading ? "..." : `${riders.length} rider${riders.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>

        {/* Riders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-white text-zinc-400 text-[11.5px] font-medium border-b border-zinc-100">
              <tr>
                <th className="py-3 px-6 font-normal">Rider ID</th>
                <th className="py-3 px-6 font-normal">Name</th>
                <th className="py-3 px-6 font-normal">Phone</th>
                <th className="py-3 px-6 font-normal">Zone</th>
                <th className="py-3 px-6 font-normal">Vehicle</th>
                <th className="py-3 px-6 font-normal">Status</th>
                <th className="py-3 px-6 font-normal">Deliveries</th>
                <th className="py-3 px-6 font-normal">Earnings</th>
                <th className="py-3 px-6 font-normal">Joined</th>
                <th className="py-3 px-6 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-24"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-36"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-28"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-32"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-20"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-5 bg-zinc-100 rounded-full w-20"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-12"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-20"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-20"></div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="h-7 w-7 bg-zinc-100 rounded-lg ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : riders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-14 text-zinc-400 text-[13px]">
                    {searchQuery
                      ? `No riders found matching "${searchQuery}".`
                      : `No riders found in "${activeTab}" category.`}
                  </td>
                </tr>
              ) : (
                riders.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-zinc-50/70 transition-colors group"
                  >
                    <td className="py-4 px-6 font-bold text-[#1E1B4B]">
                      {r.id}
                    </td>
                    <td className="py-4 px-6 font-bold text-zinc-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#1E1B4B]/10 text-[#1E1B4B] font-bold text-xs flex items-center justify-center shrink-0">
                          {r.name ? r.name.charAt(0).toUpperCase() : "R"}
                        </div>
                        <span>{r.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-zinc-600 font-mono text-[12.5px]">
                      {r.phone || "—"}
                    </td>
                    <td className="py-4 px-6 text-zinc-600">{r.zone || "Port-au-Prince"}</td>
                    <td className="py-4 px-6 text-zinc-600">
                      <div className="flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{r.vehicle}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(
                          r.status
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-zinc-900">
                      {r.deliveries}
                    </td>
                    <td className="py-4 px-6 font-bold text-zinc-900">
                      {r.earnings}
                    </td>
                    <td className="py-4 px-6 text-zinc-600 font-mono text-[12px]">
                      {r.joined}
                    </td>
                    <td className="py-4 px-6 text-right relative">
                      <button
                        onClick={(e) => openActionMenu(r, e)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors focus:outline-none cursor-pointer"
                        aria-label="Actions"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Menu Popover */}
      {activeMenuRider && menuPosition && (
        <div
          ref={menuRef}
          className="fixed z-50 w-48 bg-white rounded-xl shadow-xl border border-zinc-200/90 py-1.5 animate-in fade-in duration-100"
          style={{
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
          }}
        >
          {activeMenuRider.status === "Pending Verification" && (
            <button
              onClick={() => handleStartKYC(activeMenuRider)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-semibold text-[#FF5B00] hover:bg-orange-50 transition-colors text-left cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#FF5B00]" />
              <span>Review KYC</span>
            </button>
          )}

          <button
            onClick={() => handleOpenProfile(activeMenuRider)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-zinc-700 hover:text-black hover:bg-zinc-50 transition-colors text-left cursor-pointer"
          >
            <Eye className="w-4 h-4 text-zinc-400" />
            <span>View Profile</span>
          </button>

          {activeMenuRider.status !== "Suspended" &&
            activeMenuRider.status !== "Pending Verification" && (
              <button
                onClick={() => handleOpenSuspend(activeMenuRider)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-amber-600 hover:bg-amber-50 transition-colors text-left cursor-pointer"
              >
                <Pause className="w-4 h-4 text-amber-500" />
                <span>Suspend Rider</span>
              </button>
            )}

          {activeMenuRider.status === "Suspended" && (
            <button
              onClick={() => handleUnsuspend(activeMenuRider)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-emerald-600 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Unsuspend Rider</span>
            </button>
          )}

          {activeMenuRider.status === "Pending Verification" && (
            <button
              onClick={() => handleOpenRejection(activeMenuRider)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
            >
              <Ban className="w-4 h-4 text-red-500" />
              <span>Reject Application</span>
            </button>
          )}
        </div>
      )}

      {/* Modal 1: Rider Profile Modal */}
      {profileRider && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-[500px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 my-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h3 className="text-[17px] font-bold text-[#1E1B4B]">
                Rider Profile
              </h3>
              <button
                onClick={() => setProfileRider(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Banner with Circular Avatar */}
            <div className="mt-5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FF5B00] text-white flex items-center justify-center font-bold text-[18px] shrink-0 shadow-xs">
                {profileRider.name ? profileRider.name.charAt(0).toUpperCase() : "R"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-[15.5px] font-bold text-[#1E1B4B] truncate">
                    {profileRider.name}
                  </h4>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${getStatusBadge(
                      profileRider.status
                    )}`}
                  >
                    {profileRider.status}
                  </span>
                </div>
                <div className="text-[12px] text-zinc-500 truncate mt-0.5">
                  {profileRider.vehicle} · {profileRider.zone || "Port-au-Prince"}
                </div>
              </div>
            </div>

            {/* Live Status Strip */}
            <div className="mt-3 py-2 px-3.5 bg-zinc-100/70 rounded-xl text-[12px] font-medium text-zinc-600 flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  profileRider.status === "Active" || profileRider.status === "On Delivery"
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-zinc-400"
                }`}
              ></span>
              <span>Live Status: {profileRider.status}</span>
            </div>

            {/* If Suspended: Show Alert Banner */}
            {profileRider.status === "Suspended" && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200/60 flex items-start gap-2.5 text-red-700 text-[12px]">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <span className="font-bold">Account Suspended: </span>
                  <span>
                    {profileRider.suspensionReason ||
                      "Account temporarily suspended pending compliance review."}
                  </span>
                </div>
              </div>
            )}

            {/* 8 Information Tiles */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  RIDER ID
                </span>
                <div className="text-[13px] font-bold text-[#1E1B4B] mt-1 font-mono">
                  {profileRider.id}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  PHONE
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1 font-mono">
                  {profileRider.phone}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  ZONE / AREA
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1 truncate">
                  {profileRider.zone || "Port-au-Prince"}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  VEHICLE TYPE
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1">
                  {profileRider.vehicle}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  TOTAL DELIVERIES
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1">
                  {profileRider.deliveries}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  TOTAL EARNINGS
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1">
                  {profileRider.earnings}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  WALLET BALANCE
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1">
                  {profileRider.walletBalance}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  JOINED DATE
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1 font-mono">
                  {profileRider.joined}
                </div>
              </div>
            </div>

            {/* Recent Deliveries List */}
            <div className="mt-5 pt-4 border-t border-zinc-100">
              <h5 className="text-[13px] font-bold text-[#1E1B4B] mb-2.5">
                Recent Deliveries
              </h5>
              {profileRider.recentDeliveries &&
              profileRider.recentDeliveries.length > 0 ? (
                <div className="space-y-1.5 text-[12.5px] text-zinc-700 max-h-36 overflow-y-auto">
                  {profileRider.recentDeliveries.map((rd, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0"
                    >
                      <span className="font-medium text-zinc-800 truncate mr-2">
                        {rd.id} — {rd.route}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          rd.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : rd.status === "In Transit"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {rd.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-zinc-400 italic">
                  No delivery transactions assigned yet.
                </div>
              )}
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
              {profileRider.status === "Pending Verification" && (
                <button
                  onClick={() => handleStartKYC(profileRider)}
                  className="px-4 py-2 rounded-xl bg-[#FF5B00] hover:bg-orange-600 text-white text-[12.5px] font-semibold shadow-xs cursor-pointer"
                >
                  Review KYC Application
                </button>
              )}

              {profileRider.status !== "Suspended" &&
                profileRider.status !== "Pending Verification" && (
                  <button
                    onClick={() => {
                      handleOpenSuspend(profileRider);
                      setProfileRider(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-[12.5px] font-semibold cursor-pointer"
                  >
                    Suspend Rider
                  </button>
                )}

              {profileRider.status === "Suspended" && (
                <button
                  onClick={() => handleUnsuspend(profileRider)}
                  className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[12.5px] font-semibold cursor-pointer"
                >
                  Unsuspend Rider
                </button>
              )}

              <button
                onClick={() => setProfileRider(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[12.5px] font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Admin KYC Review */}
      {kycReviewRider && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          {!isApprovedComplete ? (
            <div className="w-full max-w-[540px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 my-6">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5B00] flex items-center justify-center shrink-0">
                    <IdCard className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-[#1E1B4B]">
                      Admin KYC Review
                    </h3>
                    <p className="text-[12px] text-zinc-400 mt-0.5">
                      Rider Onboarding Verification Request
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setKycReviewRider(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Rider Header Strip */}
              <div className="mt-4 p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between text-[12.5px]">
                <div>
                  <div className="font-bold text-[#1E1B4B] text-[13.5px]">
                    {kycReviewRider.name}
                  </div>
                  <div className="text-[11px] font-mono text-[#FF5B00] mt-0.5">
                    RIDER ID: {kycReviewRider.id}
                  </div>
                </div>
                <div className="text-right text-[11px] text-zinc-400">
                  <div>Date Submitted</div>
                  <div className="font-medium text-zinc-600 mt-0.5">
                    {kycReviewRider.kyc?.submissionDate || kycReviewRider.joined}
                  </div>
                </div>
              </div>

              {/* Section 1: Submitted NID Card */}
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-[#1E1B4B]">
                    <IdCard className="w-4 h-4 text-[#FF5B00]" />
                    <span>Submitted National ID Card (NID)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Document Attached
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/50 flex items-center justify-between hover:bg-zinc-100/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#FF5B00]" />
                      <span className="text-[12px] font-medium text-zinc-700">
                        Front Side
                      </span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                  </div>

                  <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/50 flex items-center justify-between hover:bg-zinc-100/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#FF5B00]" />
                      <span className="text-[12px] font-medium text-zinc-700">
                        Back Side
                      </span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                </div>
              </div>

              {/* Section 2: Driving License */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[#1E1B4B]">
                  <FileText className="w-4 h-4 text-[#FF5B00]" />
                  <span>Driving License / Permits</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/50 flex items-center justify-between hover:bg-zinc-100/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#FF5B00]" />
                      <span className="text-[12px] font-medium text-zinc-700">
                        License Front
                      </span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                  </div>

                  <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/50 flex items-center justify-between hover:bg-zinc-100/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#FF5B00]" />
                      <span className="text-[12px] font-medium text-zinc-700">
                        License Back
                      </span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                </div>
              </div>

              {/* Section 3: Vehicle Information */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[#1E1B4B]">
                  <Bike className="w-4 h-4 text-[#FF5B00]" />
                  <span>Vehicle Registration</span>
                </div>

                <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30 grid grid-cols-2 gap-4 text-[12.5px]">
                  <div>
                    <span className="block text-[10.5px] uppercase font-bold text-zinc-400">
                      Vehicle Type
                    </span>
                    <span className="font-semibold text-zinc-800 mt-0.5 block">
                      {kycReviewRider.vehicle}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10.5px] uppercase font-bold text-zinc-400">
                      Number Plate
                    </span>
                    <span className="font-semibold text-zinc-800 font-mono mt-0.5 block">
                      {kycReviewRider.kyc?.numberPlate || "HT-2024-RDR"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Face Verification */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[#1E1B4B]">
                  <Smile className="w-4 h-4 text-[#FF5B00]" />
                  <span>Biometric Face Verification</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center">
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-zinc-200 shadow-2xs bg-zinc-100">
                      <Image
                        src={
                          kycReviewRider.kyc?.frontFacePhoto ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
                        }
                        alt="Front Face"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-[9.5px] font-bold uppercase text-zinc-400 tracking-wider mt-1.5">
                      FRONT FACE
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-zinc-200 shadow-2xs bg-zinc-100">
                      <Image
                        src={
                          kycReviewRider.kyc?.leftFacePhoto ||
                          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80"
                        }
                        alt="Left Side Face"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-[9.5px] font-bold uppercase text-zinc-400 tracking-wider mt-1.5">
                      LEFT SIDE FACE
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-zinc-200 shadow-2xs bg-zinc-100">
                      <Image
                        src={
                          kycReviewRider.kyc?.rightFacePhoto ||
                          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80"
                        }
                        alt="Right Side Face"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-[9.5px] font-bold uppercase text-zinc-400 tracking-wider mt-1.5">
                      RIGHT SIDE FACE
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Reject Application & Approve Verification */}
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-zinc-100">
                <button
                  onClick={() => handleOpenRejection(kycReviewRider)}
                  disabled={kycSubmitting}
                  className="flex-1 py-3 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-semibold text-[13px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Ban className="w-4 h-4" />
                  <span>Reject Application</span>
                </button>

                <button
                  onClick={() => handleApproveKYC(kycReviewRider.id)}
                  disabled={kycSubmitting}
                  className="flex-1 py-3 rounded-xl bg-[#FF5B00] hover:bg-orange-600 text-white font-semibold text-[13px] shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{kycSubmitting ? "Approving..." : "Approve Verification"}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Complete Approval Confirmation Modal */
            <div className="w-full max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 py-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <h4 className="text-[19px] font-bold text-emerald-700">
                  Rider Approved!
                </h4>
                <p className="text-[13px] text-zinc-500 mt-1 max-w-xs">
                  {kycReviewRider.name} is now an Active fleet partner and eligible for live dispatch assignments.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleFinishKYC}
                  className="px-8 py-2.5 rounded-xl bg-[#1E1B4B] hover:bg-[#151336] text-white font-semibold text-[13px] shadow-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal 3: Rejection Details Dialog */}
      {rejectionTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center mt-3 mb-5">
              <h4 className="text-[18px] font-bold text-zinc-900">
                Reject Rider Candidate
              </h4>
              <p className="text-[12.5px] text-zinc-500 mt-1">
                Please provide the reason for declining{" "}
                <strong className="text-zinc-900">{rejectionTarget.name}</strong>.
              </p>
            </div>

            <div className="space-y-3.5 text-left text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                  Rider Name
                </label>
                <input
                  type="text"
                  value={rejectionTarget.name}
                  readOnly
                  className="w-full px-3.5 py-2.5 bg-zinc-100/80 border border-zinc-200 rounded-xl text-zinc-800 text-[13px] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={rejectionTarget.phone}
                  readOnly
                  className="w-full px-3.5 py-2.5 bg-zinc-100/80 border border-zinc-200 rounded-xl text-zinc-800 text-[13px] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                  Reason for Rejection
                </label>
                <textarea
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="State the compliance reason for declining..."
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 text-[13px] focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 placeholder:text-zinc-400"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setRejectionTarget(null)}
                disabled={rejectionSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-[13px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                disabled={rejectionSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-[13px] shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {rejectionSubmitting ? "Sending..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Suspend Rider Modal */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center mt-3 mb-5">
              <h4 className="text-[18px] font-bold text-zinc-900">
                Suspend Delivery Rider
              </h4>
              <p className="text-[12.5px] text-zinc-500 mt-1">
                Are you sure you want to suspend{" "}
                <strong className="text-zinc-900">{suspendTarget.name}</strong>?
                They will be removed from live fleet order assignments.
              </p>
            </div>

            <div className="space-y-3.5 text-left text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                  Reason for Suspension
                </label>
                <textarea
                  rows={3}
                  value={suspendReasonInput}
                  onChange={(e) => setSuspendReasonInput(e.target.value)}
                  placeholder="Explain why this rider is being suspended..."
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 text-[13px] focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 placeholder:text-zinc-400"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setSuspendTarget(null)}
                disabled={suspendSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-[13px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSuspend}
                disabled={suspendSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[13px] shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {suspendSubmitting ? "Suspending..." : "Suspend Rider"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}