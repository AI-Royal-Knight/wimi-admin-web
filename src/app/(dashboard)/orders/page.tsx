"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronDown, Check, RefreshCw, Search, ShoppingBag, Eye, Store, User as UserIcon, Bike, MapPin, CheckCircle2 } from "lucide-react";
import { fetchAdminOrders, fetchAdminOrderDetail } from "@/lib/api";

export interface OrderItem {
  name: string;
  qty: string;
  price: string;
}

export interface Order {
  id: string;
  raw_id?: string;
  customer: string;
  merchant: string;
  rider: string;
  orderStatus: "Delivered" | "Placed" | "Picked Up" | "Accepted" | "Cancelled" | string;
  payment: "Paid" | "Held" | "Hold" | "Refunded" | string;
  amount: string;
  date: string;
  deliveryAddress: string;
  otpConfirmed: string;
  subtotal: string;
  deliveryFee: string;
  items: OrderItem[];
  step: number; // 1 to 5, or 0 for Cancelled
}

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const res = await fetchAdminOrders({
        search: debouncedSearch.trim() || undefined,
        status: statusFilter !== "All" ? statusFilter : undefined,
      });
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn("Could not load backend orders:", err);
      setOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // View order details handler
  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    setModalLoading(true);
    try {
      const res = await fetchAdminOrderDetail(order.id);
      if (res.success && res.data) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      console.warn("Could not refresh order details:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-50 text-emerald-700";
      case "Placed":
        return "bg-blue-50 text-blue-700";
      case "Picked Up":
      case "Out for Delivery":
        return "bg-purple-50 text-purple-700";
      case "Accepted":
        return "bg-orange-50 text-orange-700";
      case "Cancelled":
        return "bg-red-50 text-red-600";
      default:
        return "bg-zinc-100 text-zinc-700";
    }
  };

  const getPaymentBadge = (payment: string) => {
    switch (payment) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700";
      case "Held":
      case "Hold":
        return "bg-amber-50 text-amber-700";
      case "Refunded":
        return "bg-blue-50 text-blue-600";
      default:
        return "bg-zinc-100 text-zinc-700";
    }
  };

  const stepperSteps = [
    { num: 1, label: "Placed" },
    { num: 2, label: "Accepted" },
    { num: 3, label: "Picked Up" },
    { num: 4, label: "Out for Delivery" },
    { num: 5, label: "Delivered" },
  ];

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto pb-12 select-none">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order ID, customer, merchant, rider..."
              className="w-80 pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all shadow-2xs"
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

          {/* Status & Payment Filter Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-zinc-200 rounded-xl px-4 py-2 pr-9 text-[13px] font-medium text-zinc-700 focus:outline-none focus:border-zinc-400 cursor-pointer shadow-2xs"
            >
              <option value="All">All Statuses</option>
              <option value="Placed">Status: Placed</option>
              <option value="Accepted">Status: Accepted</option>
              <option value="Picked Up">Status: Picked Up</option>
              <option value="Delivered">Status: Delivered</option>
              <option value="Cancelled">Status: Cancelled</option>
              <option value="Paid">Payment: Paid</option>
              <option value="Held">Payment: Held</option>
              <option value="Refunded">Payment: Refunded</option>
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right side: Refresh & Order count */}
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-zinc-400">
            {isLoading ? "Loading orders..." : `${orders.length} order${orders.length === 1 ? "" : "s"} found`}
          </span>
          <button
            onClick={() => loadOrders(true)}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-200 rounded-xl text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Refresh order records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#FF5B00]" : "text-zinc-500"}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-white text-zinc-400 text-[11.5px] font-medium border-b border-zinc-100">
              <tr>
                <th className="py-3 px-6 font-normal">Order ID</th>
                <th className="py-3 px-6 font-normal">Customer</th>
                <th className="py-3 px-6 font-normal">Merchant</th>
                <th className="py-3 px-6 font-normal">Rider</th>
                <th className="py-3 px-6 font-normal">Order Status</th>
                <th className="py-3 px-6 font-normal">Payment</th>
                <th className="py-3 px-6 font-normal">Amount</th>
                <th className="py-3 px-6 font-normal">Date</th>
                <th className="py-3 px-6 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading ? (
                // Skeleton loading state
                Array.from({ length: 7 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-20"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-28"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-24"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-24"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-5 bg-zinc-100 rounded-full w-18"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-5 bg-zinc-100 rounded-full w-14"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-16"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-zinc-100 rounded-md w-20"></div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="h-7 bg-zinc-100 rounded-lg w-14 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : orders.length > 0 ? (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-zinc-50/70 transition-colors group"
                  >
                    <td className="py-4 px-6 font-bold text-[#1E1B4B]">
                      {o.id}
                    </td>
                    <td className="py-4 px-6 font-medium text-zinc-900">
                      {o.customer}
                    </td>
                    <td className="py-4 px-6 text-zinc-600">{o.merchant}</td>
                    <td className="py-4 px-6 text-zinc-600">{o.rider}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getOrderStatusBadge(
                          o.orderStatus
                        )}`}
                      >
                        {o.orderStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getPaymentBadge(
                          o.payment
                        )}`}
                      >
                        {o.payment}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-zinc-900">
                      {o.amount}
                    </td>
                    <td className="py-4 px-6 text-zinc-600 font-mono text-[12px]">
                      {o.date}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleViewOrder(o)}
                        className="px-5 py-1.5 rounded-lg bg-[#FF5B00] hover:bg-orange-600 text-white font-semibold text-[12px] shadow-xs transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-zinc-400 space-y-2">
                      <ShoppingBag className="w-8 h-8 stroke-1 text-zinc-300" />
                      <p className="text-[14px] font-medium text-zinc-600">No orders found</p>
                      <p className="text-[12px] text-zinc-400">
                        {searchQuery || statusFilter !== "All"
                          ? "Try clearing your search query or choosing another status filter."
                          : "Orders created on the mobile or merchant apps will appear here automatically."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-[560px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 my-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[18px] font-bold text-[#1E1B4B]">
                  Order Details — {selectedOrder.id}
                </h3>
                {modalLoading && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF5B00]" />
                )}
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="mt-6 mb-7 px-2">
              <div className="relative flex items-center justify-between">
                {/* Connecting Track */}
                <div className="absolute left-4 right-4 top-3.5 h-[2.5px] bg-zinc-200 -z-0"></div>
                <div
                  className="absolute left-4 top-3.5 h-[2.5px] bg-[#16A34A] -z-0 transition-all duration-300"
                  style={{
                    width:
                      selectedOrder.step === 0
                        ? "0%"
                        : `${((Math.max(1, Math.min(selectedOrder.step, 5)) - 1) / 4) * 100}%`,
                  }}
                ></div>

                {stepperSteps.map((s) => {
                  const isDone = selectedOrder.step >= s.num;
                  const isCurrent = selectedOrder.step === s.num;

                  return (
                    <div
                      key={s.num}
                      className="flex flex-col items-center z-10 select-none"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
                          isDone
                            ? "bg-[#16A34A] text-white shadow-xs"
                            : "bg-white border-2 border-zinc-200 text-zinc-400"
                        }`}
                      >
                        {isDone && selectedOrder.step > s.num ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          s.num
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-medium mt-1.5 whitespace-nowrap ${
                          isDone || isCurrent
                            ? "text-[#16A34A] font-semibold"
                            : "text-zinc-400"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectedOrder.step === 0 && (
                <div className="mt-3 text-center text-[12px] font-semibold text-red-600 bg-red-50 py-1.5 rounded-lg border border-red-200">
                  This order was cancelled and refunded.
                </div>
              )}
            </div>

            {/* Main Content Split: Items Ordered (Left) & Customer/Merchant/Rider Info (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Items Ordered Card */}
              <div className="p-4 rounded-xl bg-zinc-50/70 border border-zinc-100 flex flex-col justify-between">
                <div>
                  <h4 className="text-[13.5px] font-bold text-[#1E1B4B] mb-3">
                    Items Ordered
                  </h4>
                  <div className="space-y-2.5 text-[12.5px] max-h-[180px] overflow-y-auto pr-1">
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-zinc-700"
                        >
                          <div className="pr-2 truncate">
                            <span className="font-medium">{it.name} </span>
                            <span className="text-zinc-400">({it.qty})</span>
                          </div>
                          <span className="font-bold text-zinc-900 shrink-0">
                            {it.price}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between text-zinc-700">
                        <div>
                          <span>Order Package </span>
                          <span className="text-zinc-400">(1x)</span>
                        </div>
                        <span className="font-bold text-zinc-900">
                          {selectedOrder.subtotal}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Information Tiles */}
              <div className="space-y-2 text-[12.5px]">
                <div className="p-2.5 rounded-xl border border-zinc-100 bg-white flex items-center justify-between">
                  <span className="text-zinc-400">Customer</span>
                  <span className="font-bold text-[#1E1B4B] truncate max-w-[160px] text-right">
                    {selectedOrder.customer}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl border border-zinc-100 bg-white flex items-center justify-between">
                  <span className="text-zinc-400">Merchant</span>
                  <span className="font-bold text-[#1E1B4B] truncate max-w-[160px] text-right">
                    {selectedOrder.merchant}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl border border-zinc-100 bg-white flex items-center justify-between">
                  <span className="text-zinc-400">Rider</span>
                  <span className="font-bold text-[#1E1B4B] truncate max-w-[160px] text-right">
                    {selectedOrder.rider}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl border border-zinc-100 bg-white flex items-center justify-between">
                  <span className="text-zinc-400">Delivery Address</span>
                  <span className="font-bold text-[#1E1B4B] truncate max-w-[150px] text-right" title={selectedOrder.deliveryAddress}>
                    {selectedOrder.deliveryAddress}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl border border-zinc-100 bg-white flex items-center justify-between">
                  <span className="text-zinc-400">OTP Confirmed</span>
                  <span className={`font-bold ${selectedOrder.otpConfirmed.includes("✓") ? "text-emerald-600" : "text-[#1E1B4B]"}`}>
                    {selectedOrder.otpConfirmed}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Card: Payment Breakdown */}
            <div className="mt-4 p-4 rounded-xl border border-zinc-100 bg-white shadow-2xs space-y-2 text-[13px]">
              <h4 className="text-[13.5px] font-bold text-[#1E1B4B] mb-2">
                Payment Breakdown
              </h4>

              <div className="flex items-center justify-between text-zinc-500">
                <span>Subtotal</span>
                <span className="font-bold text-zinc-900">
                  {selectedOrder.subtotal}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-500">
                <span>Delivery Fee</span>
                <span className="font-bold text-zinc-900">
                  {selectedOrder.deliveryFee}
                </span>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                <span className="font-bold text-zinc-900">Total</span>
                <span className="font-bold text-[#FF5B00] text-[15px]">
                  {selectedOrder.amount}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
