"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RotateCw,
  MapPin,
  Navigation,
  X,
  Layers,
  Map as MapIcon,
  Check,
  Search,
  Bike,
  Package,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { fetchAdminDeliveries, reassignDeliveryRider } from "@/lib/api";

export interface ActiveDelivery {
  id: string;
  orderId: string;
  rider: string;
  riderId: string;
  riderPhone: string;
  vehicle: string;
  status: "Picked Up" | "Accepted" | "Out for Delivery" | string;
  pickup: string;
  dropoff: string;
  timeAgo: string;
  lat: number;
  lng: number;
  speed: string;
  eta: string;
}

export interface AvailableRider {
  id: string;
  name: string;
  phone: string;
  zone: string;
  vehicle: string;
  status: string;
}

export default function DeliveriesAdminPage() {
  const [deliveries, setDeliveries] = useState<ActiveDelivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<ActiveDelivery | null>(null);
  const [activeMarker, setActiveMarker] = useState<ActiveDelivery | null>(null);
  const [availableRiders, setAvailableRiders] = useState<AvailableRider[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    activeDeliveries: 0,
    pendingPickup: 0,
    completedToday: 0,
    failedCancelled: 0,
  });

  // Map settings
  const [mapType, setMapType] = useState<"m" | "k">("m"); // 'm' for Roadmap, 'k' for Satellite

  // Reassignment Modal state
  const [reassignTarget, setReassignTarget] = useState<ActiveDelivery | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string>("");
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);
  const [reassignSuccessMsg, setReassignSuccessMsg] = useState("");

  const loadDeliveries = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const res = await fetchAdminDeliveries();
      if (res.success) {
        if (res.stats) {
          setStats(res.stats);
        }
        if (Array.isArray(res.data)) {
          const deliveriesData = res.data;
          setDeliveries(deliveriesData);
          if (deliveriesData.length > 0) {
            setSelectedDelivery((prev) => {
              if (prev) {
                const found = deliveriesData.find((d: ActiveDelivery) => d.id === prev.id);
                if (found) return found;
              }
              return deliveriesData[0];
            });
            setActiveMarker((prev) => {
              if (prev) {
                const found = deliveriesData.find((d: ActiveDelivery) => d.id === prev.id);
                if (found) return found;
              }
              return deliveriesData[0];
            });
          } else {
            setSelectedDelivery(null);
            setActiveMarker(null);
          }
        }
        if (Array.isArray(res.riders)) {
          setAvailableRiders(res.riders);
        }
      }
    } catch (err) {
      console.warn("Could not load deliveries telemetry:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

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

  // Filter deliveries based on query and status
  const filteredDeliveries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return deliveries.filter((d) => {
      const matchesStatus =
        statusFilter === "All" ||
        d.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesSearch =
        !q ||
        d.orderId.toLowerCase().includes(q) ||
        d.rider.toLowerCase().includes(q) ||
        d.pickup.toLowerCase().includes(q) ||
        d.dropoff.toLowerCase().includes(q) ||
        d.vehicle.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [deliveries, searchQuery, statusFilter]);

  const handleOpenReassign = (del: ActiveDelivery) => {
    setReassignTarget(del);
    setSelectedRiderId("");
    setReassignSuccessMsg("");
  };

  const handleConfirmReassign = async () => {
    if (!reassignTarget || !selectedRiderId) return;
    setIsSubmittingReassign(true);

    const newRider = availableRiders.find((r) => r.id === selectedRiderId);

    try {
      const res = await reassignDeliveryRider(reassignTarget.orderId, selectedRiderId);
      if (res.success) {
        setReassignSuccessMsg(`Successfully reassigned to ${newRider?.name || "new partner"}.`);
        if (newRider) {
          setDeliveries((prev) =>
            prev.map((d) =>
              d.id === reassignTarget.id
                ? {
                    ...d,
                    rider: newRider.name,
                    riderId: `RDR-${newRider.id.slice(0, 6).toUpperCase()}`,
                    riderPhone: newRider.phone,
                    vehicle: newRider.vehicle,
                  }
                : d
            )
          );
          if (selectedDelivery?.id === reassignTarget.id) {
            setSelectedDelivery((prev) =>
              prev
                ? {
                    ...prev,
                    rider: newRider.name,
                    riderId: `RDR-${newRider.id.slice(0, 6).toUpperCase()}`,
                    riderPhone: newRider.phone,
                    vehicle: newRider.vehicle,
                  }
                : null
            );
          }
        }
        setTimeout(() => {
          setReassignTarget(null);
          loadDeliveries(true);
        }, 800);
      }
    } catch (e) {
      console.error("Reassignment failed:", e);
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  // Google Map embed URL with dynamic coordinates and map type
  const currentLat = selectedDelivery?.lat ?? 18.5392;
  const currentLng = selectedDelivery?.lng ?? -72.3327;
  const googleMapUrl = `https://maps.google.com/maps?q=${currentLat},${currentLng}&z=13&t=${mapType}&output=embed`;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 select-none">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Rider, Store, Address..."
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

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-zinc-200 rounded-xl px-4 py-2 pr-9 text-[13px] font-medium text-zinc-700 focus:outline-none focus:border-zinc-400 cursor-pointer shadow-2xs"
            >
              <option value="All">All Delivery Statuses</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Picked Up">Picked Up</option>
              <option value="Accepted">Accepted / Preparing</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-zinc-400">
            {isLoading ? "Loading telemetry..." : `${filteredDeliveries.length} active in transit`}
          </span>
          <button
            onClick={() => loadDeliveries(true)}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-200 rounded-xl text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Refresh deliveries telemetry"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#FF5B00]" : "text-zinc-500"}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top Main Section: Active Deliveries List (Left) + Google Maps (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Active Deliveries Card (approx 5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-5 max-h-[580px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
            <div>
              <h2 className="text-[15.5px] font-bold text-[#1E1B4B]">
                Active Deliveries
              </h2>
              <p className="text-[11.5px] text-zinc-400 mt-0.5">
                Real-time dispatch telemetry and rider routing
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-[#FF5B00]">
              {filteredDeliveries.length} orders
            </span>
          </div>

          {/* Deliveries Scrollable List */}
          <div className="divide-y divide-zinc-100 overflow-y-auto pr-1 flex-1 mt-2">
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="py-4 space-y-2 animate-pulse">
                  <div className="flex justify-between">
                    <div className="h-4 bg-zinc-100 rounded-md w-24"></div>
                    <div className="h-4 bg-zinc-100 rounded-full w-20"></div>
                  </div>
                  <div className="h-4 bg-zinc-100 rounded-md w-32"></div>
                  <div className="h-3 bg-zinc-100 rounded-md w-48"></div>
                  <div className="h-3 bg-zinc-100 rounded-md w-40"></div>
                </div>
              ))
            ) : filteredDeliveries.length > 0 ? (
              filteredDeliveries.map((del) => {
                const isSelected = selectedDelivery?.id === del.id;
                return (
                  <div
                    key={del.id}
                    onClick={() => {
                      setSelectedDelivery(del);
                      setActiveMarker(del);
                    }}
                    className={`py-4 transition-all cursor-pointer rounded-xl px-2.5 -mx-1 my-0.5 ${
                      isSelected
                        ? "bg-orange-50/50 ring-1 ring-[#FF5B00]/30 shadow-2xs"
                        : "hover:bg-zinc-50/80"
                    }`}
                  >
                    {/* Top Row: Order ID & Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1E1B4B] text-[14px]">
                        {del.orderId}
                      </span>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          del.status === "Out for Delivery"
                            ? "bg-emerald-50 text-emerald-700"
                            : del.status === "Picked Up"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {del.status}
                      </span>
                    </div>

                    {/* Rider Name & Vehicle */}
                    <div className="mt-1 flex items-center justify-between">
                      <div className="font-bold text-zinc-900 text-[14px]">
                        {del.rider}
                      </div>
                      <span className="text-[11.5px] text-zinc-500 font-medium">
                        {del.vehicle}
                      </span>
                    </div>

                    {/* Pickup & Dropoff Route */}
                    <div className="mt-2 space-y-1.5 text-[12px]">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{del.pickup}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-600">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate">{del.dropoff}</span>
                      </div>
                    </div>

                    {/* Bottom Row: Time Ago & Reassign Rider Button */}
                    <div className="mt-3 flex items-center justify-between pt-1 border-t border-zinc-100/60">
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {del.timeAgo}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReassign(del);
                        }}
                        className="px-3 py-1 rounded-lg bg-[#EEF2FF] hover:bg-indigo-100 text-[#4F46E5] font-semibold text-[11.5px] transition-colors cursor-pointer"
                      >
                        Reassign Rider
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center text-zinc-400 space-y-2">
                <Bike className="w-8 h-8 stroke-1 text-zinc-300 mx-auto" />
                <p className="text-[13px] font-medium text-zinc-600">No deliveries found</p>
                <p className="text-[11.5px] text-zinc-400">
                  {searchQuery || statusFilter !== "All"
                    ? "Try adjusting your search query or status filter."
                    : "Active delivery routes will appear as orders are dispatched."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Google Map Live Tracking (approx 7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden relative h-[580px]">
          {/* Top-Left Floating Badge: Live Tracking — Port-au-Prince */}
          <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-xs px-4 py-2 rounded-xl shadow-md border border-zinc-200 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-[#1E1B4B] text-[13.5px]">
              Live Tracking — Port-au-Prince
            </span>
          </div>

          {/* Map Controls on Top Right */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-zinc-200">
            <button
              onClick={() => setMapType("m")}
              className={`px-3 py-1 rounded-lg text-[11.5px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                mapType === "m"
                  ? "bg-[#1E1B4B] text-white"
                  : "text-zinc-600 hover:text-black"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
            <button
              onClick={() => setMapType("k")}
              className={`px-3 py-1 rounded-lg text-[11.5px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                mapType === "k"
                  ? "bg-[#1E1B4B] text-white"
                  : "text-zinc-600 hover:text-black"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Satellite</span>
            </button>
          </div>

          {/* Embedded Google Maps Container */}
          <div className="w-full h-full relative">
            <iframe
              title="Google Map Port-au-Prince Live Telemetry"
              src={googleMapUrl}
              className="w-full h-full border-0 filter contrast-[1.05]"
              loading="lazy"
              allowFullScreen
            ></iframe>

            {/* Live Interactive Rider Overlay Pins */}
            <div className="absolute inset-0 pointer-events-none">
              {deliveries.slice(0, 10).map((del) => {
                // Approximate coordinate mapping on Port-au-Prince bounding box:
                // Lat: 18.4900 to 18.5900, Lng: -72.4200 to -72.2400
                const topPct = Math.max(14, Math.min(84, 100 - ((del.lat - 18.49) / 0.10) * 100));
                const leftPct = Math.max(14, Math.min(84, ((del.lng - (-72.42)) / 0.18) * 100));
                const isSelected = selectedDelivery?.id === del.id;

                return (
                  <div
                    key={del.id}
                    className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-125 z-10"
                    style={{ top: `${topPct.toFixed(1)}%`, left: `${leftPct.toFixed(1)}%` }}
                    onClick={() => {
                      setSelectedDelivery(del);
                      setActiveMarker(del);
                    }}
                    title={`${del.rider} · ${del.orderId}`}
                  >
                    <div className="relative flex items-center justify-center">
                      {isSelected && (
                        <span className="absolute w-12 h-12 rounded-full bg-[#FF5B00]/30 animate-ping"></span>
                      )}
                      <div
                        className={`w-8 h-8 rounded-full text-white flex items-center justify-center shadow-lg border-2 border-white transition-all ${
                          isSelected
                            ? "bg-[#FF5B00] scale-110 ring-2 ring-[#FF5B00]/40"
                            : "bg-[#1E1B4B] hover:bg-[#FF5B00]"
                        }`}
                      >
                        <Navigation className="w-4 h-4 fill-white -rotate-45" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Marker Info Card on Map (Bottom-Left overlay) */}
            {activeMarker && (
              <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-xs p-3.5 rounded-xl shadow-lg border border-zinc-200 max-w-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 gap-3">
                  <div className="font-bold text-[#1E1B4B] text-[13px] truncate">
                    {activeMarker.rider}
                  </div>
                  <span className="text-[11px] font-bold text-[#FF5B00] shrink-0">
                    {activeMarker.orderId}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-zinc-400 block font-medium">Vehicle / Speed</span>
                    <span className="font-bold text-zinc-800">
                      {activeMarker.speed}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block font-medium">Est. Arrival</span>
                    <span className="font-bold text-emerald-600">
                      {activeMarker.eta}
                    </span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-100 text-[10.5px] text-zinc-500 truncate">
                  <span className="font-medium text-zinc-400">To: </span>
                  {activeMarker.dropoff}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Active Deliveries */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#2563EB]"></span>
          </div>
          <div>
            <div className="text-[26px] font-bold text-[#1E1B4B] leading-tight">
              {isLoading ? "..." : stats.activeDeliveries}
            </div>
            <div className="text-[12.5px] font-medium text-zinc-500 mt-0.5">
              Active Deliveries
            </div>
          </div>
        </div>

        {/* Card 2: Pending Pickup */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#F59E0B]"></span>
          </div>
          <div>
            <div className="text-[26px] font-bold text-[#F59E0B] leading-tight">
              {isLoading ? "..." : stats.pendingPickup}
            </div>
            <div className="text-[12.5px] font-medium text-zinc-500 mt-0.5">
              Pending Pickup
            </div>
          </div>
        </div>

        {/* Card 3: Completed Today */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#10B981]"></span>
          </div>
          <div>
            <div className="text-[26px] font-bold text-[#10B981] leading-tight">
              {isLoading ? "..." : stats.completedToday}
            </div>
            <div className="text-[12.5px] font-medium text-zinc-500 mt-0.5">
              Completed Today
            </div>
          </div>
        </div>

        {/* Card 4: Failed / Cancelled */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#EF4444]"></span>
          </div>
          <div>
            <div className="text-[26px] font-bold text-[#EF4444] leading-tight">
              {isLoading ? "..." : stats.failedCancelled}
            </div>
            <div className="text-[12.5px] font-medium text-zinc-500 mt-0.5">
              Failed / Cancelled
            </div>
          </div>
        </div>
      </div>

      {/* Reassign Rider Modal */}
      {reassignTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[460px] bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div>
                <h3 className="text-[17px] font-bold text-[#1E1B4B]">
                  Reassign Rider
                </h3>
                <p className="text-[12px] text-zinc-400 mt-0.5">
                  Order: <span className="font-semibold text-zinc-700">{reassignTarget.orderId}</span> · Current: <span className="font-semibold text-zinc-700">{reassignTarget.rider}</span>
                </p>
              </div>
              <button
                onClick={() => setReassignTarget(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success notification */}
            {reassignSuccessMsg && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{reassignSuccessMsg}</span>
              </div>
            )}

            {/* Rider Selection List */}
            <div className="my-4 space-y-2">
              <label className="block text-[12px] font-bold uppercase tracking-wider text-zinc-400">
                Choose Delivery Partner from Fleet
              </label>
              <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                {availableRiders.length > 0 ? (
                  availableRiders.map((r) => {
                    const isSelected = selectedRiderId === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRiderId(r.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-[#FF5B00] bg-orange-50/40 ring-1 ring-[#FF5B00]/30"
                            : "border-zinc-200 hover:bg-zinc-50"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-zinc-900 text-[13px]">
                            {r.name}
                          </div>
                          <div className="text-[11.5px] text-zinc-500">
                            {r.zone} · {r.vehicle}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                              r.status === "Available" || r.status === "Active"
                                ? "bg-emerald-50 text-emerald-700"
                                : r.status === "On Delivery"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {r.status}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-[#FF5B00] stroke-[3]" />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-[12px] text-zinc-400">
                    No active riders found in database.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setReassignTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-[13px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReassign}
                disabled={!selectedRiderId || isSubmittingReassign}
                className="flex-1 py-2.5 rounded-xl bg-[#FF5B00] hover:bg-orange-600 disabled:bg-zinc-300 text-white font-semibold text-[13px] shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmittingReassign ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reassigning...</span>
                  </>
                ) : (
                  <span>Confirm Reassignment</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
