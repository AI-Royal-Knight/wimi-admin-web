"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Store,
  Bike,
  Package,
  DollarSign,
  Clock,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { fetchPlatformStats, AdminStatsData } from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    orders: number;
    x: number;
    y: number;
  } | null>(null);

  const loadStats = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const res = await fetchPlatformStats();
      if (res && res.data) {
        setStats(res.data);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("delivered")) {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
    }
    if (s.includes("placed") || s.includes("new")) {
      return "bg-blue-50 text-blue-700 border border-blue-200/50";
    }
    if (s.includes("picked") || s.includes("ready") || s.includes("way")) {
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

  // Helper to generate smooth Catmull-Rom cubic Bézier curve that stays strictly within bounds
  const getSmoothCurvePath = (points: { x: number; y: number }[]): string => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      let cp1x = p1.x + (p2.x - p0.x) / 6;
      let cp1y = p1.y + (p2.y - p0.y) / 6;
      let cp2x = p2.x - (p3.x - p1.x) / 6;
      let cp2y = p2.y - (p3.y - p1.y) / 6;

      // CRITICAL CLAMP: Prevent any control point from shooting outside the chart area
      cp1y = Math.max(25, Math.min(185, cp1y));
      cp2y = Math.max(25, Math.min(185, cp2y));

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  // 1. Dynamic Spline Chart Calculation from stats.dailyOrders
  const dailyOrders = stats?.dailyOrders || [];
  const maxDailyOrders =
    dailyOrders.length > 0
      ? Math.max(...dailyOrders.map((d) => d.orders), 5)
      : 10;

  // Compute a clean Y scale maximum
  let yAxisMax = 5;
  if (maxDailyOrders <= 5) yAxisMax = 5;
  else if (maxDailyOrders <= 10) yAxisMax = 10;
  else if (maxDailyOrders <= 20) yAxisMax = 20;
  else if (maxDailyOrders <= 50) yAxisMax = 50;
  else if (maxDailyOrders <= 100) yAxisMax = 100;
  else if (maxDailyOrders <= 200) yAxisMax = 200;
  else yAxisMax = Math.ceil(maxDailyOrders / 50) * 50;

  const yTicks = [
    yAxisMax,
    Math.round(yAxisMax * 0.75),
    Math.round(yAxisMax * 0.5),
    Math.round(yAxisMax * 0.25),
    0,
  ];

  // SVG viewBox is 720 x 200. X range: 30 to 690 (width 660). Y range: 35 (max) to 175 (0) (height 140)
  const chartPoints = dailyOrders.map((d, index) => {
    const x =
      dailyOrders.length > 1
        ? 30 + (index / (dailyOrders.length - 1)) * 660
        : 360;
    const y = 175 - (d.orders / yAxisMax) * 140;
    return {
      date: d.date,
      orders: d.orders,
      x: Math.round(x * 10) / 10,
      y: Math.max(30, Math.min(180, Math.round(y * 10) / 10)),
    };
  });

  const splinePath = getSmoothCurvePath(chartPoints);
  const firstPtX = chartPoints.length > 0 ? chartPoints[0].x : 30;
  const lastPtX =
    chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].x : 690;
  const splineAreaPath =
    chartPoints.length > 0
      ? `${splinePath} L ${lastPtX} 185 L ${firstPtX} 185 Z`
      : "";

  // 6 evenly distributed X-axis date labels
  const xAxisDateLabels = (() => {
    if (dailyOrders.length === 0) return [];
    if (dailyOrders.length <= 6) return dailyOrders.map((d) => d.date);
    const count = 6;
    const step = (dailyOrders.length - 1) / (count - 1);
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.min(Math.round(i * step), dailyOrders.length - 1);
      labels.push(dailyOrders[idx].date);
    }
    return labels;
  })();

  // 2. Dynamic Order Status Breakdown (Donut Chart)
  const orderCounts = stats?.orderStatusCounts || {
    placed: 0,
    accepted: 0,
    picked_up: 0,
    delivered: 0,
    cancelled: 0,
  };

  const totalStatusOrders =
    orderCounts.placed +
    orderCounts.accepted +
    orderCounts.picked_up +
    orderCounts.delivered +
    orderCounts.cancelled;

  const circumference = 2 * Math.PI * 38; // ~238.76

  const donutConfig = [
    {
      label: "Delivered",
      count: orderCounts.delivered,
      color: "#16A34A",
    },
    {
      label: "Placed",
      count: orderCounts.placed,
      color: "#2563EB",
    },
    {
      label: "Accepted",
      count: orderCounts.accepted,
      color: "#F97316",
    },
    {
      label: "Picked Up",
      count: orderCounts.picked_up,
      color: "#8B5CF6",
    },
    {
      label: "Cancelled",
      count: orderCounts.cancelled,
      color: "#DC2626",
    },
  ];

  let accumulatedDonutOffset = 0;
  const donutSlices = donutConfig.map((slice) => {
    const fraction = totalStatusOrders > 0 ? slice.count / totalStatusOrders : 0;
    const dashLength = fraction * circumference;
    const offset = accumulatedDonutOffset;
    accumulatedDonutOffset += dashLength;
    return {
      ...slice,
      percent: totalStatusOrders > 0 ? Math.round(fraction * 100) : 0,
      strokeDasharray: `${dashLength.toFixed(2)} ${circumference.toFixed(2)}`,
      strokeDashoffset: (-offset).toFixed(2),
    };
  });

  const recentOrders = stats?.recentOrders || [];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      {/* Top Bar with Live Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E1B4B]">Dashboard</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Real-time platform metrics, fleet activity, and financials
          </p>
        </div>
        <button
          onClick={() => loadStats(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-zinc-500 ${
              isRefreshing ? "animate-spin text-[#FF5B00]" : ""
            }`}
          />
          <span>{isRefreshing ? "Refreshing..." : "Refresh Data"}</span>
        </button>
      </div>

      {/* KPI Cards — Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Customers */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[13px] font-medium text-zinc-500">
                Total Customers
              </span>
              <div className="text-[26px] font-bold text-zinc-900 mt-2 tracking-tight">
                {isLoading ? "..." : (stats?.totalCustomers ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-[12px] font-medium text-emerald-600 mt-3 flex items-center gap-1">
            <span>↑</span>
            <span>
              {stats?.customersThisMonth ?? 0} this month
            </span>
          </div>
        </div>

        {/* Total Merchants */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[13px] font-medium text-zinc-500">
                Total Merchants
              </span>
              <div className="text-[26px] font-bold text-zinc-900 mt-2 tracking-tight">
                {isLoading ? "..." : (stats?.totalMerchants ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5B00] flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-[12px] font-medium text-emerald-600 mt-3 flex items-center gap-1">
            <span>↑</span>
            <span>
              {stats?.merchantsThisMonth ?? 0} this month
            </span>
          </div>
        </div>

        {/* Total Riders */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[13px] font-medium text-zinc-500">
                Total Riders
              </span>
              <div className="text-[26px] font-bold text-zinc-900 mt-2 tracking-tight">
                {isLoading ? "..." : (stats?.totalRiders ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Bike className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-[12px] font-medium text-zinc-500 mt-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{stats?.activeRiders ?? 0} active now</span>
          </div>
        </div>

        {/* Orders Today */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[13px] font-medium text-zinc-500">
                Orders Today
              </span>
              <div className="text-[26px] font-bold text-zinc-900 mt-2 tracking-tight">
                {isLoading ? "..." : (stats?.ordersToday ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-[12px] font-medium text-purple-600 mt-3">
            <span>{stats?.activeOrders ?? 0} in progress</span>
          </div>
        </div>
      </div>

      {/* KPI Cards — Row 2 (Financials & Today Fulfillment) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Revenue Collected (MonCash) */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[13px] font-medium text-zinc-500">
                Revenue Collected (MonCash)
              </span>
              <div className="text-[24px] font-bold text-zinc-900 mt-2 tracking-tight">
                {isLoading ? "..." : `${(stats?.moncashRevenue ?? 0).toLocaleString()} HTG`}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5B00] flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <span className="text-[12px] text-zinc-400 mt-2">
            Mobile wallet settlements
          </span>
        </div>

        {/* Revenue Collected (Hand Cash) */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[13px] font-medium text-zinc-500">
                Revenue Collected (Hand Cash)
              </span>
              <div className="text-[24px] font-bold text-zinc-900 mt-2 tracking-tight">
                {isLoading ? "..." : `${(stats?.cashRevenue ?? 0).toLocaleString()} HTG`}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5B00] flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <span className="text-[12px] text-zinc-400 mt-2">
            Cash on delivery
          </span>
        </div>

        {/* Pending Payouts */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[13px] font-medium text-zinc-500">
                Pending Payouts
              </span>
              <div className="text-[24px] font-bold text-zinc-900 mt-2 tracking-tight">
                {isLoading ? "..." : `${(stats?.pendingPayouts ?? 0).toLocaleString()} HTG`}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <span className="text-[12px] text-zinc-400 mt-2">
            {stats?.pendingPayoutCount ?? 0} pending accounts
          </span>
        </div>

        {/* Completed Deliveries Today */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[13px] font-medium text-zinc-500">
                Completed Deliveries Today
              </span>
              <div className="text-[24px] font-bold text-zinc-900 mt-2 tracking-tight">
                {isLoading ? "..." : stats?.completedDeliveriesToday ?? 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <span className="text-[12px] text-emerald-600 mt-2 font-medium">
            Fulfilled successfully today
          </span>
        </div>
      </div>

      {/* Row 3: Daily Orders Chart (2/3) + Order Status Breakdown (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Orders Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-2xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-bold text-[#1E1B4B]">
                Daily Orders — Last 30 Days
              </h2>
              <p className="text-[12px] text-zinc-400 mt-0.5">
                Total daily order volume recorded across the platform
              </p>
            </div>
            {chartPoints.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-orange-50 text-[#FF5B00] rounded-lg">
                Peak: {Math.max(...dailyOrders.map((d) => d.orders))} orders
              </span>
            )}
          </div>

          <div className="relative w-full h-[260px] select-none pt-2 overflow-hidden">
            {/* Y Axis Guide Lines */}
            <div className="absolute inset-0 flex flex-col justify-between text-[11px] text-zinc-400 pointer-events-none pb-7">
              {yTicks.map((tick, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-7 text-right font-mono">{tick}</span>
                  <div
                    className={`flex-1 h-[1px] ${
                      tick === 0 ? "bg-zinc-200" : "bg-zinc-100"
                    }`}
                  ></div>
                </div>
              ))}
            </div>

            {/* SVG Spline bounded strictly to viewBox and clipped */}
            <div className="absolute inset-0 pl-10 pr-4 pb-7 overflow-hidden">
              <svg
                className="w-full h-full overflow-hidden"
                viewBox="0 0 720 200"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Strict Clip Path so no spline path or control points can spill outside */}
                  <clipPath id="chartClip">
                    <rect x="0" y="0" width="720" height="200" />
                  </clipPath>
                  <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF5B00" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#FF5B00" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <g clipPath="url(#chartClip)">
                  {/* Gradient Area Fill under the line */}
                  {splineAreaPath && (
                    <path d={splineAreaPath} fill="url(#orderGrad)" />
                  )}

                  {/* Main Bézier Smooth Line */}
                  {splinePath && (
                    <path
                      d={splinePath}
                      fill="none"
                      stroke="#FF5B00"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Interactive Points on hover */}
                  {chartPoints.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint?.date === pt.date ? "6" : "3.5"}
                      className="fill-[#FF5B00] stroke-white stroke-2 cursor-pointer transition-all hover:scale-125"
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </g>
              </svg>
            </div>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute z-10 px-2.5 py-1 bg-zinc-900 text-white rounded-lg text-[11px] font-semibold shadow-lg pointer-events-none -translate-x-1/2 -translate-y-8"
                style={{
                  left: `${(hoveredPoint.x / 720) * 90 + 5}%`,
                  top: `${hoveredPoint.y - 10}px`,
                }}
              >
                {hoveredPoint.date}: {hoveredPoint.orders} order
                {hoveredPoint.orders === 1 ? "" : "s"}
              </div>
            )}

            {/* Dynamic X Axis Dates */}
            <div className="absolute bottom-0 left-10 right-4 flex justify-between text-[11px] text-zinc-400 font-medium font-mono">
              {xAxisDateLabels.map((dateStr, idx) => (
                <span key={idx}>{dateStr}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Order Status Breakdown Donut Chart */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-[#1E1B4B]">
              Order Status Breakdown
            </h2>
            <p className="text-[12px] text-zinc-400 mt-0.5">
              Live status across all orders in database
            </p>
          </div>

          <div className="my-auto py-4 flex flex-col items-center justify-center">
            {/* SVG Donut Chart with center metric */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#F3F4F6"
                  strokeWidth="14"
                />

                {/* Dynamic Slices */}
                {donutSlices.map((slice, index) =>
                  slice.count > 0 ? (
                    <circle
                      key={index}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="14"
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      className="transition-all duration-500"
                    />
                  ) : null
                )}
              </svg>

              {/* Donut Center Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[22px] font-bold text-zinc-900 leading-none">
                  {totalStatusOrders}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium mt-1">
                  Total Orders
                </span>
              </div>
            </div>

            {/* Donut Legend with live counts & percentages */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-5 text-[11.5px] font-medium text-zinc-600">
              {donutSlices.map((slice, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  ></span>
                  <span>
                    {slice.label}:{" "}
                    <strong className="text-zinc-900 font-semibold">
                      {slice.count}
                    </strong>{" "}
                    <span className="text-zinc-400 text-[10px]">
                      ({slice.percent}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Orders (2/3) + Pending Actions (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-bold text-[#1E1B4B]">
                Recent Orders
              </h2>
              <p className="text-[12px] text-zinc-400 mt-0.5">
                Latest transactions placed on the platform
              </p>
            </div>
            <Link
              href="/orders"
              className="text-[12px] font-semibold text-[#FF5B00] hover:text-orange-600 transition-colors"
            >
              View all orders →
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-sm">
                No orders recorded yet. Orders will appear here as soon as they are placed.
              </div>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead className="text-zinc-400 text-[11.5px] font-medium border-b border-zinc-100">
                  <tr>
                    <th className="pb-3 font-normal">Order ID</th>
                    <th className="pb-3 font-normal">Customer</th>
                    <th className="pb-3 font-normal">Merchant</th>
                    <th className="pb-3 font-normal">Rider</th>
                    <th className="pb-3 font-normal">Status</th>
                    <th className="pb-3 font-normal text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {recentOrders.map((order, i) => (
                    <tr
                      key={i}
                      className="hover:bg-zinc-50/60 transition-colors"
                    >
                      <td className="py-3.5 font-bold text-[#1E1B4B]">
                        {order.id}
                      </td>
                      <td className="py-3.5 text-zinc-800 font-medium">
                        {order.customer}
                      </td>
                      <td className="py-3.5 text-zinc-600">
                        {order.merchant}
                      </td>
                      <td className="py-3.5 text-zinc-600">
                        {order.rider}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-bold text-zinc-900">
                        {order.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pending Actions Block */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-[15px] font-bold text-[#1E1B4B]">
              Pending Actions
            </h2>
            <p className="text-[12px] text-zinc-400 mt-0.5">
              Items requiring administrator verification & approval
            </p>
          </div>

          <div className="space-y-4 my-auto">
            {/* Merchants awaiting verification */}
            <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <div>
                <div className="text-[12.5px] font-medium text-zinc-600">
                  Merchants awaiting verification
                </div>
                <div className="text-[26px] font-bold text-[#FF5B00] mt-0.5">
                  {isLoading ? "..." : stats?.merchantsPendingVerification ?? 0}
                </div>
              </div>
              <Link
                href="/merchants"
                className="px-4 py-2 bg-[#FF5B00] hover:bg-orange-600 text-white font-semibold text-[12.5px] rounded-xl shadow-2xs transition-colors"
              >
                Review All
              </Link>
            </div>

            {/* Riders awaiting verification */}
            <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <div>
                <div className="text-[12.5px] font-medium text-zinc-600">
                  Riders awaiting verification
                </div>
                <div className="text-[26px] font-bold text-[#FF5B00] mt-0.5">
                  {isLoading ? "..." : stats?.ridersPendingVerification ?? 0}
                </div>
              </div>
              <Link
                href="/riders"
                className="px-4 py-2 bg-[#FF5B00] hover:bg-orange-600 text-white font-semibold text-[12.5px] rounded-xl shadow-2xs transition-colors"
              >
                Review All
              </Link>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 text-center">
            Verifications ensure compliance with TiBoutik partner policies.
          </div>
        </div>
      </div>
    </div>
  );
}