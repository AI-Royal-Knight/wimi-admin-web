"use client";

import { useState, useEffect, useRef } from "react";
import {
  MoreVertical,
  Eye,
  Pause,
  X,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  ShieldCheck,
  Check,
  AlertCircle,
  Search,
  Store,
  ShieldAlert,
} from "lucide-react";
import {
  fetchAdminMerchants,
  fetchMerchantDetail,
  verifyMerchantKYC,
  rejectMerchantKYC,
  toggleSuspendMerchant,
  ApiMerchant,
} from "@/lib/api";

export default function MerchantsAdminPage() {
  const [merchants, setMerchants] = useState<ApiMerchant[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<
    "All" | "Pending Verification" | "Suspended" | "Rejected"
  >("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Action Menu state
  const [activeMenuMerchant, setActiveMenuMerchant] = useState<ApiMerchant | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);

  // Modals state
  const [profileMerchant, setProfileMerchant] = useState<ApiMerchant | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const [kycMerchant, setKycMerchant] = useState<ApiMerchant | null>(null);
  const [kycStep, setKycStep] = useState<1 | 2 | 3>(1);
  const [kycSubmitting, setKycSubmitting] = useState<boolean>(false);

  const [rejectionTarget, setRejectionTarget] = useState<ApiMerchant | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [rejectionSubmitting, setRejectionSubmitting] = useState<boolean>(false);

  const [suspendTarget, setSuspendTarget] = useState<ApiMerchant | null>(null);
  const [suspendReasonInput, setSuspendReasonInput] = useState("");
  const [suspendSubmitting, setSuspendSubmitting] = useState<boolean>(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Load merchants from backend
  const loadMerchants = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const tabSlug =
        activeTab === "Pending Verification"
          ? "pending"
          : activeTab === "Suspended"
          ? "suspended"
          : activeTab === "Rejected"
          ? "rejected"
          : "all";

      const res = await fetchAdminMerchants(tabSlug, searchQuery);
      if (res.success && Array.isArray(res.data)) {
        setMerchants(res.data);
        setTotalCount(res.count);
      }
    } catch (err) {
      console.error("Failed to load merchants:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMerchants();
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
        setActiveMenuMerchant(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("admin_global_search", handleSearch);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const openActionMenu = (m: ApiMerchant, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMenuMerchant?.id === m.id) {
      setActiveMenuMerchant(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY + 6,
      right: window.innerWidth - rect.right,
    });
    setActiveMenuMerchant(m);
  };

  // Open profile modal and fetch fresh details
  const handleOpenProfile = async (merchant: ApiMerchant) => {
    setProfileMerchant(merchant);
    setActiveMenuMerchant(null);
    setProfileLoading(true);

    try {
      const res = await fetchMerchantDetail(merchant.id);
      if (res.success && res.data) {
        setProfileMerchant(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch full merchant detail:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  // KYC Flow Handlers
  const handleStartKYC = async (merchant: ApiMerchant) => {
    setActiveMenuMerchant(null);
    setProfileMerchant(null);
    setKycMerchant(merchant);
    setKycStep(1);

    // Fetch freshest KYC info
    try {
      const res = await fetchMerchantDetail(merchant.id);
      if (res.success && res.data) {
        setKycMerchant(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch merchant KYC info:", err);
    }
  };

  const handleApproveKYC = async (merchantId: string) => {
    setKycSubmitting(true);
    try {
      const res = await verifyMerchantKYC(merchantId);
      if (res.success) {
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === merchantId ? { ...m, status: "Active" } : m
          )
        );
        setKycStep(3);
        loadMerchants();
      }
    } catch (err) {
      console.error("Failed to verify merchant KYC:", err);
    } finally {
      setKycSubmitting(false);
    }
  };

  const handleFinishKYC = () => {
    setKycMerchant(null);
    setKycStep(1);
    loadMerchants();
  };

  // Rejection Flow Handlers
  const handleOpenRejection = (merchant: ApiMerchant) => {
    setActiveMenuMerchant(null);
    setKycMerchant(null);
    setRejectionTarget(merchant);
    setRejectionReasonInput("");
  };

  const handleConfirmRejection = async () => {
    if (!rejectionTarget) return;
    const reason =
      rejectionReasonInput.trim() ||
      "Declined after administrative KYC compliance review.";

    setRejectionSubmitting(true);
    const targetId = rejectionTarget.id;

    try {
      const res = await rejectMerchantKYC(targetId, reason);
      if (res.success) {
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === targetId
              ? { ...m, status: "Rejected", rejectionReason: reason }
              : m
          )
        );
        setRejectionTarget(null);
        setRejectionReasonInput("");
        loadMerchants();
      }
    } catch (err) {
      console.error("Failed to reject merchant KYC:", err);
    } finally {
      setRejectionSubmitting(false);
    }
  };

  // Suspension Flow Handlers
  const handleOpenSuspend = (merchant: ApiMerchant) => {
    setActiveMenuMerchant(null);
    setSuspendTarget(merchant);
    setSuspendReasonInput("");
  };

  const handleConfirmSuspend = async () => {
    if (!suspendTarget) return;
    const reason =
      suspendReasonInput.trim() ||
      "Store temporarily suspended pending policy inquiry.";

    setSuspendSubmitting(true);
    const targetId = suspendTarget.id;

    try {
      const res = await toggleSuspendMerchant(targetId, "suspend", reason);
      if (res.success) {
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === targetId
              ? { ...m, status: "Suspended", suspensionReason: reason }
              : m
          )
        );
        setSuspendTarget(null);
        setSuspendReasonInput("");
        loadMerchants();
      }
    } catch (err) {
      console.error("Failed to suspend merchant:", err);
    } finally {
      setSuspendSubmitting(false);
    }
  };

  const handleUnsuspend = async (merchant: ApiMerchant) => {
    setActiveMenuMerchant(null);
    try {
      const res = await toggleSuspendMerchant(merchant.id, "unsuspend");
      if (res.success) {
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === merchant.id
              ? { ...m, status: "Active", suspensionReason: undefined }
              : m
          )
        );
        if (profileMerchant?.id === merchant.id) {
          setProfileMerchant((prev) =>
            prev ? { ...prev, status: "Active", suspensionReason: undefined } : null
          );
        }
        loadMerchants();
      }
    } catch (err) {
      console.error("Failed to unsuspend merchant:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
      case "Pending Verification":
        return "bg-amber-50 text-amber-700 border border-amber-200/50";
      case "Suspended":
        return "bg-red-50 text-red-600 border border-red-200/50";
      case "Rejected":
        return "bg-zinc-100 text-zinc-700 border border-zinc-200/50";
      default:
        return "bg-zinc-100 text-zinc-600 border border-zinc-200/50";
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 select-none">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E1B4B]">Merchants</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Manage partner stores, business KYC verifications, and merchant standing
          </p>
        </div>
        <button
          onClick={() => loadMerchants(true)}
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
          {/* Tabs: All / Pending Verification / Suspended / Rejected */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              ["All", "Pending Verification", "Suspended", "Rejected"] as const
            ).map((tab) => {
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
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Search Box & Count */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search shop, owner, ID..."
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
              {isLoading ? "..." : `${merchants.length} merchant${merchants.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>

        {/* Merchants Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-white text-zinc-400 text-[11.5px] font-medium border-b border-zinc-100">
              <tr>
                <th className="py-3 px-6 font-normal">Merchant ID</th>
                <th className="py-3 px-6 font-normal">Shop Name</th>
                <th className="py-3 px-6 font-normal">Owner</th>
                <th className="py-3 px-6 font-normal">
                  {activeTab === "Pending Verification" ? "Phone" : "Email"}
                </th>
                <th className="py-3 px-6 font-normal">Category</th>
                <th className="py-3 px-6 font-normal">Status</th>
                <th className="py-3 px-6 font-normal">Products</th>
                <th className="py-3 px-6 font-normal">Total Sales</th>
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
              ) : merchants.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-14 text-zinc-400 text-[13px]">
                    {searchQuery
                      ? `No merchants found matching "${searchQuery}".`
                      : `No merchants found in "${activeTab}" tab.`}
                  </td>
                </tr>
              ) : (
                merchants.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-zinc-50/70 transition-colors group"
                  >
                    <td className="py-4 px-6 font-bold text-[#1E1B4B]">
                      {m.id}
                    </td>
                    <td className="py-4 px-6 font-bold text-zinc-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#FF5B00] font-bold text-xs flex items-center justify-center shrink-0">
                          {m.shopName ? m.shopName.charAt(0).toUpperCase() : "M"}
                        </div>
                        <span>{m.shopName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-zinc-600">{m.owner}</td>
                    <td className="py-4 px-6 text-zinc-600">
                      {activeTab === "Pending Verification" ? (
                        <span className="font-mono text-[12.5px]">
                          {m.phone || "—"}
                        </span>
                      ) : (
                        m.email || "—"
                      )}
                    </td>
                    <td className="py-4 px-6 text-zinc-600">{m.category}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(
                          m.status
                        )}`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-zinc-800">
                      {m.products}
                    </td>
                    <td className="py-4 px-6 font-bold text-zinc-900">
                      {m.totalSales}
                    </td>
                    <td className="py-4 px-6 text-zinc-600 font-mono text-[12px]">
                      {m.joined}
                    </td>
                    <td className="py-4 px-6 text-right relative">
                      <button
                        onClick={(e) => openActionMenu(m, e)}
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

      {/* Action Popover Menu */}
      {activeMenuMerchant && menuPosition && (
        <div
          ref={menuRef}
          className="fixed z-50 w-48 bg-white rounded-xl shadow-xl border border-zinc-200/90 py-1.5 animate-in fade-in duration-100"
          style={{
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
          }}
        >
          {/* If Pending Verification: Highlight KYC Verification */}
          {activeMenuMerchant.status === "Pending Verification" && (
            <button
              onClick={() => handleStartKYC(activeMenuMerchant)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-semibold text-[#FF5B00] hover:bg-orange-50 transition-colors text-left cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#FF5B00]" />
              <span>Verify KYC</span>
            </button>
          )}

          <button
            onClick={() => handleOpenProfile(activeMenuMerchant)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-zinc-700 hover:text-black hover:bg-zinc-50 transition-colors text-left cursor-pointer"
          >
            <Eye className="w-4 h-4 text-zinc-400" />
            <span>View Profile</span>
          </button>

          {/* Suspend / Unsuspend */}
          {activeMenuMerchant.status === "Active" && (
            <button
              onClick={() => handleOpenSuspend(activeMenuMerchant)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-amber-600 hover:bg-amber-50 transition-colors text-left cursor-pointer"
            >
              <Pause className="w-4 h-4 text-amber-500" />
              <span>Suspend</span>
            </button>
          )}

          {activeMenuMerchant.status === "Suspended" && (
            <button
              onClick={() => handleUnsuspend(activeMenuMerchant)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-emerald-600 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Unsuspend Store</span>
            </button>
          )}

          {/* Reject */}
          {activeMenuMerchant.status !== "Rejected" && (
            <button
              onClick={() => handleOpenRejection(activeMenuMerchant)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
            >
              <X className="w-4 h-4 text-red-500" />
              <span>Reject</span>
            </button>
          )}

          {activeMenuMerchant.status === "Rejected" && (
            <button
              onClick={() => handleStartKYC(activeMenuMerchant)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-[#FF5B00] hover:bg-orange-50 transition-colors text-left cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-[#FF5B00]" />
              <span>Re-evaluate KYC</span>
            </button>
          )}
        </div>
      )}

      {/* Modal 1: Merchant Profile Modal */}
      {profileMerchant && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-[500px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 my-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h3 className="text-[17px] font-bold text-[#1E1B4B]">
                Merchant Profile
              </h3>
              <button
                onClick={() => setProfileMerchant(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Banner with Shop Initial, Category, Owner, Status */}
            <div className="mt-5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FF5B00] text-white flex items-center justify-center font-bold text-[18px] shrink-0 shadow-xs">
                {profileMerchant.shopName ? profileMerchant.shopName.charAt(0).toUpperCase() : "M"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-[15.5px] font-bold text-[#1E1B4B] truncate">
                    {profileMerchant.shopName}
                  </h4>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${getStatusBadge(
                      profileMerchant.status
                    )}`}
                  >
                    {profileMerchant.status}
                  </span>
                </div>
                <div className="text-[12px] text-zinc-500 truncate mt-0.5">
                  {profileMerchant.category} · {profileMerchant.owner}
                </div>
              </div>
            </div>

            {/* If Suspended: Show Alert Banner */}
            {profileMerchant.status === "Suspended" && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200/60 flex items-start gap-2.5 text-red-700 text-[12px]">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <span className="font-bold">Store Suspended: </span>
                  <span>
                    {profileMerchant.suspensionReason ||
                      "Store temporarily suspended pending policy inquiry."}
                  </span>
                </div>
              </div>
            )}

            {/* If Rejected: Show Alert Banner */}
            {profileMerchant.status === "Rejected" && (
              <div className="mt-3 p-3 rounded-xl bg-zinc-100 border border-zinc-200 flex items-start gap-2.5 text-zinc-700 text-[12px]">
                <AlertCircle className="w-4 h-4 shrink-0 text-zinc-500 mt-0.5" />
                <div>
                  <span className="font-bold">Application Rejected: </span>
                  <span>
                    {profileMerchant.rejectionReason ||
                      "Declined after administrative compliance review."}
                  </span>
                </div>
              </div>
            )}

            {/* 8 Information Tiles */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  MERCHANT ID
                </span>
                <div className="text-[13px] font-bold text-[#1E1B4B] mt-1 font-mono">
                  {profileMerchant.id}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  OWNER NAME
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1 truncate">
                  {profileMerchant.owner}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  PHONE
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1 font-mono">
                  {profileMerchant.phone || "—"}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  CATEGORY
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1">
                  {profileMerchant.category}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  ACTIVE PRODUCTS
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1">
                  {profileMerchant.products}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  TOTAL SALES
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1">
                  {profileMerchant.totalSales}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  JOINED DATE
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1 font-mono">
                  {profileMerchant.joined}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  WALLET BALANCE
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1">
                  {profileMerchant.walletBalance}
                </div>
              </div>
            </div>

            {/* Recent Orders List */}
            <div className="mt-5 pt-4 border-t border-zinc-100">
              <h5 className="text-[13px] font-bold text-[#1E1B4B] mb-2.5">
                Recent Orders
              </h5>
              {profileMerchant.recentOrders &&
              profileMerchant.recentOrders.length > 0 ? (
                <div className="space-y-1.5 text-[12.5px] text-zinc-700 max-h-36 overflow-y-auto">
                  {profileMerchant.recentOrders.map((ro, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0"
                    >
                      <span className="font-semibold text-zinc-900">
                        {ro.id} — {ro.amount}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          ro.status.toLowerCase().includes("delivered")
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {ro.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-zinc-400 italic">
                  No orders processed yet.
                </div>
              )}
            </div>

            {/* Payout History List */}
            <div className="mt-4 pt-3 border-t border-zinc-100">
              <h5 className="text-[13px] font-bold text-[#1E1B4B] mb-2.5">
                Payout History
              </h5>
              {profileMerchant.payoutHistory &&
              profileMerchant.payoutHistory.length > 0 ? (
                <div className="space-y-1.5 text-[12.5px] text-zinc-700">
                  {profileMerchant.payoutHistory.map((ph, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1 border-b border-zinc-50 last:border-0"
                    >
                      <span className="font-medium text-zinc-700">
                        {ph.date} — {ph.amount}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        {ph.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-zinc-400 italic">
                  No payout withdrawals recorded.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
              {profileMerchant.status === "Pending Verification" && (
                <button
                  onClick={() => {
                    handleStartKYC(profileMerchant);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#FF5B00] hover:bg-orange-600 text-white text-[12.5px] font-semibold shadow-xs cursor-pointer"
                >
                  Verify KYC
                </button>
              )}

              {profileMerchant.status === "Active" && (
                <button
                  onClick={() => {
                    handleOpenSuspend(profileMerchant);
                    setProfileMerchant(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-[12.5px] font-semibold cursor-pointer"
                >
                  Suspend Store
                </button>
              )}

              {profileMerchant.status === "Suspended" && (
                <button
                  onClick={() => handleUnsuspend(profileMerchant)}
                  className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[12.5px] font-semibold cursor-pointer"
                >
                  Unsuspend Store
                </button>
              )}

              <button
                onClick={() => setProfileMerchant(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[12.5px] font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Multi-Step KYC Verification */}
      {kycMerchant && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[500px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5B00] flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-[#1E1B4B]">
                    KYC Verification
                  </h3>
                  <p className="text-[12px] text-zinc-400 mt-0.5">
                    {kycStep === 1
                      ? "Step 1 of 2 — Business Details"
                      : kycStep === 2
                      ? "Step 2 of 2 — Owner / Representative"
                      : "Verification Completed"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setKycMerchant(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Tabs Bar */}
            {kycStep !== 3 && (
              <div className="grid grid-cols-2 gap-4 mt-5 mb-6 text-[13px] font-semibold">
                <div
                  className={`pb-2 border-b-2 transition-all ${
                    kycStep === 1
                      ? "border-[#FF5B00] text-[#FF5B00]"
                      : "border-zinc-200 text-zinc-400"
                  }`}
                >
                  1. Business Info
                </div>
                <div
                  className={`pb-2 border-b-2 transition-all ${
                    kycStep === 2
                      ? "border-[#FF5B00] text-[#FF5B00]"
                      : "border-zinc-200 text-zinc-400"
                  }`}
                >
                  2. Owner Info
                </div>
              </div>
            )}

            {/* STEP 1: Business Information */}
            {kycStep === 1 && (
              <div className="space-y-5">
                <div className="space-y-4 text-[13px]">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Registered Business Name
                    </label>
                    <div className="font-bold text-zinc-900 text-[14px]">
                      {kycMerchant.kyc?.businessName || kycMerchant.shopName}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Business Type
                      </label>
                      <div className="font-semibold text-zinc-800">
                        {kycMerchant.kyc?.businessType || "Retail Store"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Patent / Registration
                      </label>
                      <div className="font-semibold text-zinc-800 font-mono">
                        {kycMerchant.kyc?.regNumber || `HT-PAT-${kycMerchant.id}`}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Business Address
                    </label>
                    <div className="font-semibold text-zinc-800">
                      {kycMerchant.kyc?.address || "Delmas, Port-au-Prince"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        City
                      </label>
                      <div className="font-semibold text-zinc-800">
                        {kycMerchant.kyc?.city || "Port-au-Prince"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        ZIP / Postal Code
                      </label>
                      <div className="font-semibold text-zinc-800 font-mono">
                        {kycMerchant.kyc?.zip || "HT-6110"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Continue Button */}
                <div className="pt-4">
                  <button
                    onClick={() => setKycStep(2)}
                    className="w-full py-3 bg-[#FF5B00] hover:bg-orange-600 text-white font-semibold text-[13.5px] rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Continue to Owner Info →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Owner / Representative Information */}
            {kycStep === 2 && (
              <div className="space-y-5">
                <div className="space-y-4 text-[13px]">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Owner Full Name
                    </label>
                    <div className="font-bold text-zinc-900 text-[14px]">
                      {kycMerchant.kyc?.ownerName || kycMerchant.owner}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Residential Address
                    </label>
                    <div className="font-semibold text-zinc-800">
                      {kycMerchant.kyc?.ownerAddress ||
                        kycMerchant.kyc?.address ||
                        "Port-au-Prince, Haiti"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Phone / MonCash
                      </label>
                      <div className="font-semibold text-zinc-800 font-mono">
                        {kycMerchant.kyc?.ownerPhone || kycMerchant.phone}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <div className="font-semibold text-zinc-800 truncate">
                        {kycMerchant.kyc?.ownerEmail || kycMerchant.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 Bottom Buttons: Reject & Accept */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={() => handleOpenRejection(kycMerchant)}
                    disabled={kycSubmitting}
                    className="flex-1 py-3 border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-red-600 font-semibold text-[13.5px] rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Reject Application
                  </button>
                  <button
                    onClick={() => handleApproveKYC(kycMerchant.id)}
                    disabled={kycSubmitting}
                    className="flex-1 py-3 bg-[#FF5B00] hover:bg-orange-600 text-white font-semibold text-[13.5px] rounded-xl shadow-xs transition-colors cursor-pointer text-center disabled:opacity-60"
                  >
                    {kycSubmitting ? "Approving..." : "Accept & Activate"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: KYC Verification Complete */}
            {kycStep === 3 && (
              <div className="py-6 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>

                <div>
                  <h4 className="text-[19px] font-bold text-emerald-700">
                    Merchant Approved!
                  </h4>
                  <p className="text-[13px] text-zinc-500 mt-1 max-w-xs">
                    Store is now Active and listed for ordering.
                  </p>
                </div>

                <div className="pt-2 w-full flex justify-center">
                  <button
                    onClick={handleFinishKYC}
                    className="px-8 py-2.5 rounded-xl bg-[#1E1B4B] hover:bg-[#151336] text-white font-semibold text-[13.5px] shadow-xs transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Rejection Details Modal */}
      {rejectionTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Top Red Alert Icon */}
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 stroke-[2.2]" />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mt-3 mb-5">
              <h4 className="text-[18px] font-bold text-zinc-900">
                Reject Partner Application
              </h4>
              <p className="text-[12.5px] text-zinc-500 mt-1">
                Please provide the reason for declining{" "}
                <strong className="text-zinc-900">
                  {rejectionTarget.shopName}
                </strong>
                .
              </p>
            </div>

            {/* Fields */}
            <div className="space-y-3.5 text-left text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                  Owner / Representative
                </label>
                <input
                  type="text"
                  value={rejectionTarget.owner}
                  readOnly
                  className="w-full px-3.5 py-2.5 bg-zinc-100/80 border border-zinc-200 rounded-xl text-zinc-800 text-[13px] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={rejectionTarget.email}
                  readOnly
                  className="w-full px-3.5 py-2.5 bg-zinc-100/80 border border-zinc-200 rounded-xl text-zinc-800 text-[13px] focus:outline-none"
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
                  placeholder="e.g. Expired business patent, non-compliant hygiene certificate..."
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 text-[13px] focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 placeholder:text-zinc-400"
                ></textarea>
              </div>
            </div>

            {/* Bottom Buttons */}
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

      {/* Modal 4: Suspend Confirmation Modal */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center mt-3 mb-5">
              <h4 className="text-[18px] font-bold text-zinc-900">
                Suspend Merchant Store
              </h4>
              <p className="text-[12.5px] text-zinc-500 mt-1">
                Are you sure you want to suspend{" "}
                <strong className="text-zinc-900">
                  {suspendTarget.shopName}
                </strong>
                ? Products will be hidden and new orders paused.
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
                  placeholder="Explain why this store is being suspended..."
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
                {suspendSubmitting ? "Suspending..." : "Suspend Store"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}