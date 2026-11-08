"use client";

import { useState, useEffect, useRef } from "react";
import {
  MoreVertical,
  Eye,
  Package,
  Ban,
  X,
  Search,
  RefreshCw,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import {
  fetchAdminCustomers,
  fetchCustomerDetail,
  toggleBanCustomer,
  ApiCustomer,
} from "@/lib/api";

export default function CustomersAdminPage() {
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"All" | "Banned">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Action Menu state
  const [activeMenuCustomer, setActiveMenuCustomer] = useState<ApiCustomer | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);

  // Modals state
  const [selectedProfileCustomer, setSelectedProfileCustomer] = useState<ApiCustomer | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const [selectedOrdersCustomer, setSelectedOrdersCustomer] = useState<ApiCustomer | null>(null);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);

  // Ban Reason prompt dialog
  const [banPromptCustomer, setBanPromptCustomer] = useState<ApiCustomer | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banSubmitting, setBanSubmitting] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch customers from API
  const loadCustomers = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const statusParam = activeTab === "Banned" ? "banned" : "all";
      const res = await fetchAdminCustomers(statusParam, searchQuery);
      if (res.success && Array.isArray(res.data)) {
        setCustomers(res.data);
        setTotalCount(res.count);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [activeTab, searchQuery]);

  // Listen to global header search event
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
        setActiveMenuCustomer(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("admin_global_search", handleSearch);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch full details when opening profile modal
  const handleOpenProfile = async (customer: ApiCustomer) => {
    setSelectedProfileCustomer(customer);
    setActiveMenuCustomer(null);
    setProfileLoading(true);

    try {
      const res = await fetchCustomerDetail(customer.id);
      if (res.success && res.data) {
        setSelectedProfileCustomer(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch full customer profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Fetch full order history when opening orders modal
  const handleOpenOrders = async (customer: ApiCustomer) => {
    setSelectedOrdersCustomer(customer);
    setActiveMenuCustomer(null);
    setSelectedProfileCustomer(null);
    setOrdersLoading(true);

    try {
      const res = await fetchCustomerDetail(customer.id);
      if (res.success && res.data) {
        setSelectedOrdersCustomer(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch customer orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Initiate Ban / Unban workflow
  const handleBanClick = (customer: ApiCustomer) => {
    setActiveMenuCustomer(null);
    if (customer.status === "Banned" || customer.is_banned) {
      // Unban directly
      executeToggleBan(customer, "");
    } else {
      // Prompt for reason
      setBanPromptCustomer(customer);
      setBanReason("");
    }
  };

  const executeToggleBan = async (customer: ApiCustomer, reason: string) => {
    setBanSubmitting(true);
    const nextStatus = customer.status === "Banned" ? "Active" : "Banned";
    const nextIsBanned = nextStatus === "Banned";

    // Optimistic UI update
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customer.id
          ? {
              ...c,
              status: nextStatus,
              is_banned: nextIsBanned,
              ban_reason: reason || (nextIsBanned ? "Terms violation" : ""),
            }
          : c
      )
    );

    if (selectedProfileCustomer?.id === customer.id) {
      setSelectedProfileCustomer((prev) =>
        prev
          ? {
              ...prev,
              status: nextStatus,
              is_banned: nextIsBanned,
              ban_reason: reason || (nextIsBanned ? "Terms violation" : ""),
            }
          : null
      );
    }

    try {
      await toggleBanCustomer(customer.id, reason);
      // Reload to ensure full sync
      loadCustomers();
    } catch (err) {
      console.error("Failed to toggle customer ban:", err);
      // Revert on failure
      loadCustomers();
    } finally {
      setBanSubmitting(false);
      setBanPromptCustomer(null);
    }
  };

  const openActionMenu = (customer: ApiCustomer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMenuCustomer?.id === customer.id) {
      setActiveMenuCustomer(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY + 6,
      right: window.innerWidth - rect.right,
    });
    setActiveMenuCustomer(customer);
  };

  const getOrderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("delivered")) {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
    }
    if (s.includes("placed") || s.includes("new")) {
      return "bg-blue-50 text-blue-700 border border-blue-200/50";
    }
    if (s.includes("picked") || s.includes("way") || s.includes("ready")) {
      return "bg-purple-50 text-purple-700 border border-purple-200/50";
    }
    if (s.includes("accepted") || s.includes("preparing")) {
      return "bg-orange-50 text-orange-700 border border-orange-200/50";
    }
    if (s.includes("cancel")) {
      return "bg-red-50 text-red-600 border border-red-200/50";
    }
    return "bg-zinc-100 text-zinc-700 border border-zinc-200/50";
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 select-none">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E1B4B]">Customers</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Manage registered platform users, order history, and account standing
          </p>
        </div>
        <button
          onClick={() => loadCustomers(true)}
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
          {/* Tabs: All / Banned */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("All")}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === "All"
                  ? "bg-[#1E1B4B] text-white shadow-2xs"
                  : "bg-zinc-100 text-zinc-600 hover:text-black hover:bg-zinc-200"
              }`}
            >
              All Customers
            </button>
            <button
              onClick={() => setActiveTab("Banned")}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === "Banned"
                  ? "bg-[#1E1B4B] text-white shadow-2xs"
                  : "bg-zinc-100 text-zinc-600 hover:text-black hover:bg-zinc-200"
              }`}
            >
              Banned Accounts
            </button>
          </div>

          {/* Search Box & Count */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search customer, ID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[12.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#FF5B00] focus:border-[#FF5B00] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-[12.5px] font-medium text-zinc-500 whitespace-nowrap">
              {isLoading ? "..." : `${customers.length} customer${customers.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-white text-zinc-400 text-[11.5px] font-medium border-b border-zinc-100">
              <tr>
                <th className="py-3 px-6 font-normal">Customer ID</th>
                <th className="py-3 px-6 font-normal">Full Name</th>
                <th className="py-3 px-6 font-normal">Phone</th>
                <th className="py-3 px-6 font-normal">Email</th>
                <th className="py-3 px-6 font-normal">Joined</th>
                <th className="py-3 px-6 font-normal">Orders</th>
                <th className="py-3 px-6 font-normal">Spent</th>
                <th className="py-3 px-6 font-normal">Status</th>
                <th className="py-3 px-6 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-20"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-32"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-24"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-36"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-20"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-12"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-20"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-5 bg-zinc-100 rounded-full w-16"></div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="h-7 w-7 bg-zinc-100 rounded-lg ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-14 text-zinc-400 text-[13px]">
                    {searchQuery
                      ? `No customers found matching "${searchQuery}".`
                      : activeTab === "Banned"
                      ? "No banned customer accounts on TiBoutik."
                      : "No customer accounts registered yet."}
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const displayId =
                    c.display_id || `CUS-${c.id.slice(0, 8).toUpperCase()}`;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-50/70 transition-colors group"
                    >
                      <td className="py-4 px-6 font-bold text-[#1E1B4B]">
                        {displayId}
                      </td>
                      <td className="py-4 px-6 font-medium text-zinc-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#1E1B4B]/10 text-[#1E1B4B] font-bold text-xs flex items-center justify-center shrink-0">
                            {c.name ? c.name.charAt(0).toUpperCase() : "C"}
                          </div>
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-zinc-600 font-mono text-[12.5px]">
                        {c.phone || "—"}
                      </td>
                      <td className="py-4 px-6 text-zinc-600">{c.email || "—"}</td>
                      <td className="py-4 px-6 text-zinc-600 font-mono text-[12px]">
                        {c.joined}
                      </td>
                      <td className="py-4 px-6 font-bold text-zinc-900">
                        {c.orders}
                      </td>
                      <td className="py-4 px-6 font-bold text-zinc-900">
                        {c.spent}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            c.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                              : c.status === "Banned"
                              ? "bg-red-50 text-red-600 border border-red-200/50"
                              : "bg-zinc-100 text-zinc-600 border border-zinc-200/50"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right relative">
                        <button
                          onClick={(e) => openActionMenu(c, e)}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors focus:outline-none cursor-pointer"
                          aria-label="Actions"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Menu Popover */}
      {activeMenuCustomer && menuPosition && (
        <div
          ref={menuRef}
          className="fixed z-50 w-44 bg-white rounded-xl shadow-xl border border-zinc-200/90 py-1.5 animate-in fade-in duration-100"
          style={{
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
          }}
        >
          <button
            onClick={() => handleOpenProfile(activeMenuCustomer)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-zinc-700 hover:text-black hover:bg-zinc-50 transition-colors text-left cursor-pointer"
          >
            <Eye className="w-4 h-4 text-zinc-400" />
            <span>View Profile</span>
          </button>

          <button
            onClick={() => handleOpenOrders(activeMenuCustomer)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-purple-700 hover:bg-purple-50 transition-colors text-left cursor-pointer"
          >
            <Package className="w-4 h-4 text-purple-600" />
            <span>View Orders</span>
          </button>

          <button
            onClick={() => handleBanClick(activeMenuCustomer)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium transition-colors text-left cursor-pointer ${
              activeMenuCustomer.status === "Banned"
                ? "text-emerald-700 hover:bg-emerald-50"
                : "text-red-600 hover:bg-red-50"
            }`}
          >
            <Ban
              className={`w-4 h-4 ${
                activeMenuCustomer.status === "Banned"
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            />
            <span>
              {activeMenuCustomer.status === "Banned"
                ? "Unban Account"
                : "Ban Account"}
            </span>
          </button>
        </div>
      )}

      {/* Modal 1: Customer Profile Modal */}
      {selectedProfileCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h3 className="text-[17px] font-bold text-[#1E1B4B]">
                Customer Profile
              </h3>
              <button
                onClick={() => setSelectedProfileCustomer(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Avatar & Name Banner */}
            <div className="mt-5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1E1B4B] text-white flex items-center justify-center font-bold text-[18px] shrink-0 shadow-xs">
                {selectedProfileCustomer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-[15px] font-bold text-[#1E1B4B] truncate">
                    {selectedProfileCustomer.name}
                  </h4>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                      selectedProfileCustomer.status === "Active"
                        ? "bg-emerald-50 text-emerald-700"
                        : selectedProfileCustomer.status === "Banned"
                        ? "bg-red-50 text-red-600"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {selectedProfileCustomer.status}
                  </span>
                </div>
                <div className="text-[12px] text-zinc-400 truncate mt-0.5">
                  {selectedProfileCustomer.email}
                </div>
              </div>
            </div>

            {/* If Customer is Banned: Show Banner */}
            {selectedProfileCustomer.status === "Banned" && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200/60 flex items-start gap-2.5 text-red-700 text-[12px]">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <span className="font-bold">Account Banned: </span>
                  <span>
                    {selectedProfileCustomer.ban_reason ||
                      "Account suspended by administrator for terms violation."}
                  </span>
                </div>
              </div>
            )}

            {/* 6 Info Tiles */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  CUSTOMER ID
                </span>
                <div className="text-[13px] font-bold text-[#1E1B4B] mt-1 font-mono truncate">
                  {selectedProfileCustomer.display_id ||
                    `CUS-${selectedProfileCustomer.id.slice(0, 8).toUpperCase()}`}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  PHONE
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1 font-mono">
                  {selectedProfileCustomer.phone || "—"}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  MONCASH WALLET
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1 font-mono">
                  {selectedProfileCustomer.phone || "—"}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  JOINED DATE
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1 font-mono">
                  {selectedProfileCustomer.joined}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  TOTAL ORDERS
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1">
                  {selectedProfileCustomer.orders}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  TOTAL SPENT
                </span>
                <div className="text-[13px] font-bold text-zinc-900 mt-1">
                  {selectedProfileCustomer.spent}
                </div>
              </div>
            </div>

            {/* Saved Delivery Addresses */}
            {selectedProfileCustomer.addresses &&
              selectedProfileCustomer.addresses.length > 0 && (
                <div className="mt-4 p-3 rounded-xl border border-zinc-100 bg-zinc-50/40">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    PRIMARY DELIVERY ADDRESS
                  </span>
                  <div className="flex items-start gap-2 text-[12.5px] text-zinc-700">
                    <MapPin className="w-3.5 h-3.5 text-[#FF5B00] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-zinc-900">
                        {selectedProfileCustomer.addresses[0].label}:{" "}
                      </span>
                      <span>
                        {selectedProfileCustomer.addresses[0].street}
                        {selectedProfileCustomer.addresses[0].city
                          ? `, ${selectedProfileCustomer.addresses[0].city}`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* Modal Bottom Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
              <button
                onClick={() => handleBanClick(selectedProfileCustomer)}
                disabled={banSubmitting}
                className={`px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-colors cursor-pointer ${
                  selectedProfileCustomer.status === "Banned"
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "bg-red-50 text-red-600 hover:bg-red-100"
                }`}
              >
                {selectedProfileCustomer.status === "Banned"
                  ? "Unban Account"
                  : "Ban Account"}
              </button>

              <button
                onClick={() => handleOpenOrders(selectedProfileCustomer)}
                className="px-5 py-2 rounded-xl bg-[#1E1B4B] hover:bg-[#151336] text-white text-[12.5px] font-semibold transition-colors shadow-xs cursor-pointer"
              >
                View Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Customer Order History Modal */}
      {selectedOrdersCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[660px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-[17px] font-bold text-[#1E1B4B]">
                  Order History
                </h3>
                <p className="text-[12px] text-zinc-400 mt-0.5">
                  {selectedOrdersCustomer.name} ·{" "}
                  {selectedOrdersCustomer.orders} total orders ·{" "}
                  {selectedOrdersCustomer.spent} spent
                </p>
              </div>
              <button
                onClick={() => setSelectedOrdersCustomer(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-6 py-3 px-4 rounded-xl bg-zinc-50/60 border border-zinc-100 my-4 text-[12.5px]">
              <div>
                <span className="text-zinc-400">Total Orders: </span>
                <span className="font-bold text-[#1E1B4B]">
                  {selectedOrdersCustomer.orders}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">Total Spent: </span>
                <span className="font-bold text-[#1E1B4B]">
                  {selectedOrdersCustomer.spent}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">Standing: </span>
                <span
                  className={`font-bold ${
                    selectedOrdersCustomer.status === "Banned"
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {selectedOrdersCustomer.status}
                </span>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto max-h-[320px]">
              {ordersLoading ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  <div className="inline-block w-5 h-5 border-2 border-[#FF5B00] border-t-transparent rounded-full animate-spin mb-2"></div>
                  <div>Loading customer transactions...</div>
                </div>
              ) : !selectedOrdersCustomer.recent_orders ||
                selectedOrdersCustomer.recent_orders.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-[13px]">
                  No orders placed by this customer yet.
                </div>
              ) : (
                <table className="w-full text-left text-[12.5px]">
                  <thead className="text-zinc-400 text-[11px] font-medium border-b border-zinc-100 sticky top-0 bg-white">
                    <tr>
                      <th className="pb-2 font-normal">Order ID</th>
                      <th className="pb-2 font-normal">Merchant</th>
                      <th className="pb-2 font-normal">Status</th>
                      <th className="pb-2 font-normal">Amount</th>
                      <th className="pb-2 font-normal text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {selectedOrdersCustomer.recent_orders.map((order, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-zinc-50/70 transition-colors"
                      >
                        <td className="py-2.5 font-bold text-[#1E1B4B]">
                          {order.id}
                        </td>
                        <td className="py-2.5 text-zinc-700">{order.store}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${getOrderStatusBadge(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold text-zinc-900">
                          {order.amount}
                        </td>
                        <td className="py-2.5 text-right text-zinc-500 font-mono text-[11.5px]">
                          {order.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Close Button */}
            <div className="flex justify-end mt-4 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setSelectedOrdersCustomer(null)}
                className="px-4 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[12.5px] font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Ban Reason Confirmation Prompt */}
      {banPromptCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>

            <h3 className="text-[17px] font-bold text-zinc-900">
              Ban Customer Account?
            </h3>
            <p className="text-[13px] text-zinc-500 mt-1">
              Are you sure you want to suspend{" "}
              <strong className="text-zinc-900">
                {banPromptCustomer.name}
              </strong>
              ? They will be prevented from placing orders or logging in.
            </p>

            <div className="mt-4">
              <label className="block text-[11.5px] font-semibold text-zinc-600 mb-1.5">
                Reason for suspension (optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Fraudulent chargeback, abusive behavior, policy violation..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[12.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setBanPromptCustomer(null)}
                disabled={banSubmitting}
                className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 text-[12.5px] font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => executeToggleBan(banPromptCustomer, banReason)}
                disabled={banSubmitting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              >
                {banSubmitting ? "Suspending..." : "Confirm Ban"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}