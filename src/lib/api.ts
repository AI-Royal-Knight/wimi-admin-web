/**
 * TiBoutik Admin Web - API Client & Strict Role-Based Authentication
 */

export interface AdminUser {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  role: string;
  avatar: string | null;
  is_verified: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface AuthSuccessResponse {
  success: boolean;
  message?: string;
  data: {
    access: string;
    refresh: string;
    user: AdminUser;
  };
}

export interface ApiErrorResponse {
  success: false;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string[]>;
  };
}

export interface PlatformActivity {
  id: string;
  title: string;
  desc: string;
  type: "order" | "merchant" | "rider" | "payout";
  time: string;
}

export interface PlatformStats {
  totalRevenue: number;
  totalMerchants: number;
  activeOrders: number;
  totalCustomers: number;
  totalRiders: number;
  recentActivities: PlatformActivity[];
}

export interface PlatformStatsResponse {
  success: boolean;
  data: PlatformStats;
}

const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const FALLBACK_API_URL = "http://localhost:8001/api/v1";

/**
 * Returns authorization headers with Admin JWT Bearer token
 */
export function getAdminAuthHeaders(isFormData = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("admin_access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Robust fetch with primary/fallback host support
 */
async function adminFetch<T>(endpoint: string, options: RequestInit): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  try {
    const res = await fetch(`${PRIMARY_API_URL}${cleanEndpoint}`, options);
    const data = await res.json();
    return data;
  } catch (err) {
    try {
      const fallbackRes = await fetch(`${FALLBACK_API_URL}${cleanEndpoint}`, options);
      const fallbackData = await fallbackRes.json();
      return fallbackData;
    } catch {
      throw err;
    }
  }
}

/**
 * Store admin authentication tokens and profile in browser storage
 */
export function persistAdminSession(data: {
  access: string;
  refresh: string;
  user: AdminUser;
}) {
  if (typeof window === "undefined") return;

  localStorage.setItem("admin_access_token", data.access);
  localStorage.setItem("admin_refresh_token", data.refresh);
  localStorage.setItem("admin_user", JSON.stringify(data.user));

  // Also set cookie for middleware or persistent detection
  document.cookie = `admin_session=active; path=/; max-age=86400; SameSite=Lax`;

  window.dispatchEvent(
    new CustomEvent("admin_auth_changed", { detail: { user: data.user } })
  );
}

/**
 * Clear admin session and remove all tokens
 */
export function clearAdminSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("admin_access_token");
  localStorage.removeItem("admin_refresh_token");
  localStorage.removeItem("admin_user");
  document.cookie = "admin_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";

  window.dispatchEvent(new CustomEvent("admin_auth_changed", { detail: null }));
}

/**
 * Retrieve the current logged-in admin user from storage
 */
export function getStoredAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("admin_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Retrieve the access token
 */
export function getAdminAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_access_token");
}

/**
 * Check if the current session belongs to an authorized admin
 */
export function isAuthorizedAdmin(): boolean {
  if (typeof window === "undefined") return false;
  const token = getAdminAccessToken();
  const user = getStoredAdminUser();

  if (!token || !user) return false;

  // Strict check: role MUST be "admin" or is_staff / is_superuser
  return user.role === "admin" || user.is_staff === true || user.is_superuser === true;
}

/**
 * Strict Admin Login:
 * Authenticates against backend, then validates that the user possesses
 * the "admin" role. Rejects any non-admin users immediately.
 */
export async function loginAdmin(
  payload: LoginPayload
): Promise<AuthSuccessResponse | ApiErrorResponse> {
  const result = await adminFetch<AuthSuccessResponse | ApiErrorResponse>(
    "/auth/login/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!result.success || !("data" in result) || !result.data) {
    return result;
  }

  const user = result.data.user;

  // STRICT ROLE-BASED ACCESS CONTROL (RBAC) CHECK
  const isAdmin =
    user.role === "admin" ||
    user.is_staff === true ||
    user.is_superuser === true;

  if (!isAdmin) {
    // Non-admin detected! Deny entry and ensure no credentials persist
    clearAdminSession();
    return {
      success: false,
      error: {
        code: "ACCESS_DENIED",
        message: `Access denied. Account '${user.email || payload.identifier}' has role '${user.role}'. Platform Administrator privileges are strictly required.`,
      },
    };
  }

  // Persist session
  persistAdminSession(result.data);
  return result;
}

export interface DailyOrderData {
  date: string;
  orders: number;
}

export interface AdminStatsData {
  totalRevenue: number;
  totalMerchants: number;
  merchantsThisMonth?: number;
  activeOrders: number;
  pendingOrdersCount?: number;
  activeDeliveriesCount?: number;
  totalCustomers: number;
  customersThisMonth?: number;
  totalRiders: number;
  activeRiders?: number;
  ordersToday: number;
  moncashRevenue: number;
  cashRevenue: number;
  pendingPayouts: number;
  pendingPayoutCount?: number;
  disputesPendingCount?: number;
  unreadNotificationsCount?: number;
  completedDeliveriesToday: number;
  merchantsPendingVerification: number;
  ridersPendingVerification: number;
  recentActivities: PlatformActivity[];
  orderStatusCounts?: {
    placed: number;
    accepted: number;
    picked_up: number;
    delivered: number;
    cancelled: number;
  };
  dailyOrders?: DailyOrderData[];
  recentOrders?: Array<{
    id: string;
    customer: string;
    merchant: string;
    rider: string;
    status: string;
    amount: string;
    date?: string;
  }>;
}

export interface AdminStatsResponse {
  success: boolean;
  data: AdminStatsData;
}

export interface ApiCustomer {
  id: string;
  display_id?: string;
  name: string;
  phone: string;
  email: string;
  joined: string;
  orders: number;
  spent: string;
  status: "Active" | "Inactive" | "Banned";
  is_banned: boolean;
  ban_reason: string;
  addresses?: Array<{
    id: string;
    label: string;
    street: string;
    city: string;
    details: string;
    is_default: boolean;
  }>;
  recent_orders?: Array<{
    id: string;
    date: string;
    store: string;
    amount: string;
    status: string;
  }>;
}

export interface ApiMerchant {
  id: string;
  shopName: string;
  owner: string;
  email: string;
  phone: string;
  category: string;
  status: "Active" | "Pending Verification" | "Suspended" | "Rejected";
  products: number;
  totalSales: string;
  joined: string;
  walletBalance: string;
  kyc: {
    businessName: string;
    businessType: string;
    regNumber: string;
    address: string;
    city: string;
    zip: string;
    ownerName: string;
    ownerAddress: string;
    ownerPhone: string;
    ownerEmail: string;
  };
  recentOrders?: Array<{ id: string; amount: string; status: string }>;
  payoutHistory?: Array<{ date: string; amount: string; status: string }>;
  rejectionReason?: string;
  suspensionReason?: string;
}

export interface ApiRider {
  id: string;
  name: string;
  phone: string;
  zone: string;
  vehicle: "Motorcycle" | "Bicycle";
  status: "Active" | "On Delivery" | "Offline" | "Pending Verification" | "Suspended";
  deliveries: number;
  earnings: string;
  joined: string;
  walletBalance: string;
  kyc: {
    nidFront: string;
    nidBack: string;
    licenseFront: string;
    licenseBack: string;
    vehicleType: string;
    numberPlate: string;
    frontFacePhoto: string;
    leftFacePhoto: string;
    rightFacePhoto: string;
    submissionDate: string;
    submissionId: string;
  };
  recentDeliveries?: Array<{
    id: string;
    route: string;
    status: "Completed" | "Failed" | "In Transit";
  }>;
  suspensionReason?: string;
  rejectionReason?: string;
}

/**
 * Fetch platform overview analytics for the dashboard
 */
export function triggerAdminBadgeRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("admin_stats_updated"));
  }
}

export async function fetchPlatformStats(): Promise<AdminStatsResponse> {
  try {
    const res = await adminFetch<AdminStatsResponse>("/admin/stats/", {
      headers: getAdminAuthHeaders(),
    });
    if (res?.success && res?.data) {
      return res;
    }
  } catch (err) {
    console.error("fetchPlatformStats failed:", err);
  }

  return {
    success: false,
    data: {
      totalRevenue: 0,
      totalMerchants: 0,
      merchantsThisMonth: 0,
      activeOrders: 0,
      pendingOrdersCount: 0,
      activeDeliveriesCount: 0,
      totalCustomers: 0,
      customersThisMonth: 0,
      totalRiders: 0,
      activeRiders: 0,
      ordersToday: 0,
      moncashRevenue: 0,
      cashRevenue: 0,
      pendingPayouts: 0,
      pendingPayoutCount: 0,
      disputesPendingCount: 0,
      unreadNotificationsCount: 0,
      completedDeliveriesToday: 0,
      merchantsPendingVerification: 0,
      ridersPendingVerification: 0,
      recentActivities: [],
      dailyOrders: [],
      recentOrders: [],
      orderStatusCounts: {
        placed: 0,
        accepted: 0,
        picked_up: 0,
        delivered: 0,
        cancelled: 0,
      },
    },
  };
}

// --------------------------------------------------------------------------
// CUSTOMERS API METHODS
// --------------------------------------------------------------------------
export async function fetchAdminCustomers(
  statusFilter = "all",
  searchQuery = ""
): Promise<{ success: boolean; data: ApiCustomer[]; count: number }> {
  try {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
    if (searchQuery) params.append("search", searchQuery);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await adminFetch<{ success: boolean; data: ApiCustomer[]; count: number }>(
      `/admin/customers/${qs}`,
      {
        headers: getAdminAuthHeaders(),
      }
    );
    if (res?.success && Array.isArray(res.data)) {
      return res;
    }
  } catch (err) {
    console.error("Error fetching admin customers:", err);
  }

  return { success: false, data: [], count: 0 };
}

export async function fetchCustomerDetail(
  id: string
): Promise<{ success: boolean; data?: ApiCustomer }> {
  try {
    const res = await adminFetch<{ success: boolean; data: ApiCustomer }>(
      `/admin/customers/${id}/`,
      {
        headers: getAdminAuthHeaders(),
      }
    );
    return res;
  } catch (err) {
    console.error("Error fetching customer detail:", err);
    return { success: false };
  }
}

export async function toggleBanCustomer(
  id: string,
  reason = ""
): Promise<{ success: boolean; message?: string; data?: ApiCustomer }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string; data: ApiCustomer }>(
      `/admin/customers/${id}/toggle-ban/`,
      {
        method: "POST",
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ reason }),
      }
    );
    return res;
  } catch (err) {
    console.error("Error toggling customer ban:", err);
    return { success: false, message: "Network error toggling customer ban." };
  }
}

export async function deleteCustomerAccount(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string }>(
      `/admin/customers/${id}/`,
      {
        method: "DELETE",
        headers: getAdminAuthHeaders(),
      }
    );
    return res;
  } catch (err) {
    console.error("Error deleting customer:", err);
    return { success: false, message: "Network error deleting customer account." };
  }
}

// --------------------------------------------------------------------------
// MERCHANTS API METHODS
// --------------------------------------------------------------------------
export async function fetchAdminMerchants(
  statusFilter = "all",
  searchQuery = ""
): Promise<{ success: boolean; data: ApiMerchant[]; count: number }> {
  try {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
    if (searchQuery) params.append("search", searchQuery);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await adminFetch<{ success: boolean; data: ApiMerchant[]; count: number }>(
      `/admin/merchants/${qs}`,
      {
        headers: getAdminAuthHeaders(),
      }
    );
    if (res?.success && Array.isArray(res.data)) {
      return res;
    }
  } catch (err) {
    console.error("Error fetching admin merchants:", err);
  }

  return { success: false, data: [], count: 0 };
}

export async function fetchMerchantDetail(
  id: string
): Promise<{ success: boolean; data?: ApiMerchant }> {
  try {
    const res = await adminFetch<{ success: boolean; data: ApiMerchant }>(
      `/admin/merchants/${id}/`,
      {
        headers: getAdminAuthHeaders(),
      }
    );
    return res;
  } catch (err) {
    console.error("Error fetching merchant detail:", err);
    return { success: false };
  }
}

export async function verifyMerchantKYC(
  id: string
): Promise<{ success: boolean; message?: string; data?: ApiMerchant }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string; data: ApiMerchant }>(
      `/admin/merchants/${id}/verify/`,
      {
        method: "POST",
        headers: getAdminAuthHeaders(),
      }
    );
    if (res.success) {
      triggerAdminBadgeRefresh();
    }
    return res;
  } catch (err) {
    console.error("Error verifying merchant:", err);
    return { success: false, message: "Network error approving merchant KYC." };
  }
}

export async function rejectMerchantKYC(
  id: string,
  reason: string
): Promise<{ success: boolean; message?: string; data?: ApiMerchant }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string; data: ApiMerchant }>(
      `/admin/merchants/${id}/reject/`,
      {
        method: "POST",
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ reason }),
      }
    );
    return res;
  } catch (err) {
    console.error("Error rejecting merchant:", err);
    return { success: false, message: "Network error rejecting merchant KYC." };
  }
}

export async function toggleSuspendMerchant(
  id: string,
  action: "suspend" | "unsuspend",
  reason = ""
): Promise<{ success: boolean; message?: string; data?: ApiMerchant }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string; data: ApiMerchant }>(
      `/admin/merchants/${id}/suspend/`,
      {
        method: "POST",
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ action, reason }),
      }
    );
    return res;
  } catch (err) {
    console.error("Error suspending merchant:", err);
    return { success: false, message: "Network error updating merchant suspension." };
  }
}

// --------------------------------------------------------------------------
// RIDERS API METHODS
// --------------------------------------------------------------------------
export async function fetchAdminRiders(
  statusFilter = "all",
  searchQuery = ""
): Promise<{ success: boolean; data: ApiRider[]; count: number }> {
  try {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
    if (searchQuery) params.append("search", searchQuery);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await adminFetch<{ success: boolean; data: ApiRider[]; count: number }>(
      `/admin/riders/${qs}`,
      {
        headers: getAdminAuthHeaders(),
      }
    );
    if (res?.success && Array.isArray(res.data)) {
      return res;
    }
  } catch (err) {
    console.error("Error fetching admin riders:", err);
  }

  return { success: false, data: [], count: 0 };
}

export async function fetchRiderDetail(
  id: string
): Promise<{ success: boolean; data?: ApiRider }> {
  try {
    const res = await adminFetch<{ success: boolean; data: ApiRider }>(
      `/admin/riders/${id}/`,
      {
        headers: getAdminAuthHeaders(),
      }
    );
    return res;
  } catch (err) {
    console.error("Error fetching rider detail:", err);
    return { success: false };
  }
}

export async function verifyRiderKYC(
  id: string
): Promise<{ success: boolean; message?: string; data?: ApiRider }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string; data: ApiRider }>(
      `/admin/riders/${id}/verify/`,
      {
        method: "POST",
        headers: getAdminAuthHeaders(),
      }
    );
    if (res.success) {
      triggerAdminBadgeRefresh();
    }
    return res;
  } catch (err) {
    console.error("Error verifying rider:", err);
    return { success: false, message: "Network error approving rider KYC." };
  }
}

export async function rejectRiderKYC(
  id: string,
  reason: string
): Promise<{ success: boolean; message?: string; data?: ApiRider }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string; data: ApiRider }>(
      `/admin/riders/${id}/reject/`,
      {
        method: "POST",
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ reason }),
      }
    );
    return res;
  } catch (err) {
    console.error("Error rejecting rider:", err);
    return { success: false, message: "Network error rejecting rider KYC." };
  }
}

export async function toggleSuspendRider(
  id: string,
  action: "suspend" | "unsuspend",
  reason = ""
): Promise<{ success: boolean; message?: string; data?: ApiRider }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string; data: ApiRider }>(
      `/admin/riders/${id}/suspend/`,
      {
        method: "POST",
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ action, reason }),
      }
    );
    return res;
  } catch (err) {
    console.error("Error suspending rider:", err);
    return { success: false, message: "Network error updating rider suspension." };
  }
}

// --------------------------------------------------------------------------
// ADMIN PROFILE & SETTINGS
// --------------------------------------------------------------------------
export async function fetchAdminProfile(): Promise<{ success: boolean; data?: AdminUser }> {
  try {
    const res = await adminFetch<{ success: boolean; data: AdminUser }>("/admin/profile/", {
      headers: getAdminAuthHeaders(),
    });
    return res;
  } catch (err) {
    console.error("Error fetching admin profile:", err);
    return { success: false };
  }
}

export async function updateAdminProfile(payload: {
  full_name?: string;
  email?: string;
  phone?: string;
  current_password?: string;
  new_password?: string;
}): Promise<{ success: boolean; message?: string; data?: AdminUser; error?: { message?: string } }> {
  try {
    const res = await adminFetch<{
      success: boolean;
      message: string;
      data: AdminUser;
      error?: { message?: string };
    }>("/admin/profile/", {
      method: "PATCH",
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.success && res.data && typeof window !== "undefined") {
      const existing = getStoredAdminUser();
      const updated = { ...existing, ...res.data };
      localStorage.setItem("admin_user", JSON.stringify(updated));
      window.dispatchEvent(new Event("admin_auth_changed"));
    }

    return res;
  } catch (err) {
    console.error("Error updating admin profile:", err);
    return { success: false, message: "Failed to update admin profile." };
  }
}

// --------------------------------------------------------------------------
// ORDERS, DELIVERIES & PAYOUTS
// --------------------------------------------------------------------------
export async function fetchAdminOrders(params?: { search?: string; status?: string }): Promise<{
  success: boolean;
  data?: any[];
  count?: number;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status && params.status !== "All") query.set("status", params.status);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await adminFetch<{ success: boolean; data: any[]; count: number }>(
      `/admin/orders/${qs}`,
      { headers: getAdminAuthHeaders() }
    );
    return res;
  } catch (err) {
    console.error("Error fetching admin orders:", err);
    return { success: false };
  }
}

export async function fetchAdminOrderDetail(id: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
}> {
  try {
    const cleanId = encodeURIComponent(id.trim());
    const res = await adminFetch<{ success: boolean; data: any; message?: string }>(
      `/admin/orders/${cleanId}/`,
      { headers: getAdminAuthHeaders() }
    );
    return res;
  } catch (err) {
    console.error("Error fetching admin order detail:", err);
    return { success: false, message: "Failed to load order details." };
  }
}

export async function fetchAdminDeliveries(): Promise<{
  success: boolean;
  stats?: {
    activeDeliveries: number;
    pendingPickup: number;
    completedToday: number;
    failedCancelled: number;
  };
  data?: any[];
  riders?: any[];
}> {
  try {
    const res = await adminFetch<{
      success: boolean;
      stats: {
        activeDeliveries: number;
        pendingPickup: number;
        completedToday: number;
        failedCancelled: number;
      };
      data: any[];
      riders?: any[];
    }>("/admin/deliveries/", { headers: getAdminAuthHeaders() });
    return res;
  } catch (err) {
    console.error("Error fetching admin deliveries:", err);
    return { success: false };
  }
}

export async function reassignDeliveryRider(
  orderId: string,
  riderId?: string
): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string; data?: any }>(
      `/admin/orders/${encodeURIComponent(orderId)}/reassign/`,
      {
        method: "POST",
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ rider_id: riderId }),
      }
    );
    return res;
  } catch (err) {
    console.error("Error reassigning delivery rider:", err);
    return { success: false, message: "Failed to reassign delivery rider." };
  }
}

export async function fetchAdminPayouts(): Promise<{
  success: boolean;
  stats?: {
    platformWalletTotal: string;
    merchantPendingPayouts: string;
    riderPendingPayouts: string;
    merchantWaitingCount?: number;
    riderWaitingCount?: number;
  };
  transactions?: any[];
  merchantQueue?: any[];
  riderQueue?: any[];
}> {
  try {
    const res = await adminFetch<{
      success: boolean;
      stats: {
        platformWalletTotal: string;
        merchantPendingPayouts: string;
        riderPendingPayouts: string;
        merchantWaitingCount?: number;
        riderWaitingCount?: number;
      };
      transactions: any[];
      merchantQueue: any[];
      riderQueue: any[];
    }>("/admin/payouts/", { headers: getAdminAuthHeaders() });
    return res;
  } catch (err) {
    console.error("Error fetching admin payouts:", err);
    return { success: false };
  }
}

export async function approveAdminPayout(payload: {
  recipient: string;
  amount: string;
  id?: string;
  type?: string;
}): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string; data?: any }>("/admin/payouts/approve/", {
      method: "POST",
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (res.success) {
      triggerAdminBadgeRefresh();
    }
    return res;
  } catch (err) {
    console.error("Error approving admin payout:", err);
    return { success: false, message: "Failed to approve payout." };
  }
}

// --------------------------------------------------------------------------
// COMMISSIONS API
// --------------------------------------------------------------------------
export interface CommissionMerchant {
  id: string;
  name: string;
  category: string;
  ordersCount: number;
  grossVolume: string;
  commissionGenerated: string;
  rate: string;
  status: string;
}

export interface MonthlyCommissionBreakdown {
  month: string;
  orders: number;
  gross: string;
  commission: string;
  status: string;
}

export interface AdminCommissionsResponse {
  success: boolean;
  data?: {
    stats: {
      takeRatePct: number;
      deliveryPlatformCut: string;
      totalCommissionEarned: string;
      totalGrossVolume: string;
      merchantsEnrolled: number;
      settlementCycle: string;
    };
    settings: {
      take_rate_pct: number;
      delivery_platform_cut: number;
      payout_processing_fee: number;
    };
    monthlyBreakdown: MonthlyCommissionBreakdown[];
    merchantCommissions: CommissionMerchant[];
  };
}

export async function fetchAdminCommissions(): Promise<AdminCommissionsResponse> {
  try {
    const res = await adminFetch<AdminCommissionsResponse>("/admin/commissions/", {
      headers: getAdminAuthHeaders(),
    });
    return res;
  } catch (err) {
    console.error("Error fetching commissions:", err);
    return { success: false };
  }
}

export async function updateAdminCommissionSettings(payload: {
  take_rate_pct?: number;
  delivery_platform_cut?: number;
  payout_processing_fee?: number;
}): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string; data: any }>(
      "/admin/commissions/settings/",
      {
        method: "POST",
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );
    return res;
  } catch (err) {
    console.error("Error updating commission settings:", err);
    return { success: false, message: "Failed to update commission settings." };
  }
}

// --------------------------------------------------------------------------
// DISPUTES API
// --------------------------------------------------------------------------
export interface AdminDispute {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  merchantName: string;
  reason: string;
  claimAmount: string;
  date: string;
  status: "Open" | "Resolved - Refunded" | "Resolved - Merchant Upheld" | "Dismissed";
  priority: "High" | "Medium" | "Low";
  customerNote: string;
  merchantResponse: string;
  resolutionNote?: string;
}

export async function fetchAdminDisputes(params?: {
  status?: string;
  search?: string;
}): Promise<{
  success: boolean;
  stats?: {
    totalDisputes: number;
    openClaims: number;
    resolvedRefunded: number;
    disputeRate: string;
  };
  data?: AdminDispute[];
}> {
  try {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "All") query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString() ? `?${query.toString()}` : "";

    const res = await adminFetch<{
      success: boolean;
      stats: {
        totalDisputes: number;
        openClaims: number;
        resolvedRefunded: number;
        disputeRate: string;
      };
      data: AdminDispute[];
    }>(`/admin/disputes/${qs}`, { headers: getAdminAuthHeaders() });
    return res;
  } catch (err) {
    console.error("Error fetching disputes:", err);
    return { success: false };
  }
}

export async function resolveAdminDispute(
  id: string,
  action: "refund" | "uphold_merchant" | "dismiss",
  notes?: string
): Promise<{ success: boolean; message?: string; data?: AdminDispute }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string; data: AdminDispute }>(
      `/admin/disputes/${encodeURIComponent(id)}/resolve/`,
      {
        method: "POST",
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ action, notes }),
      }
    );
    if (res.success) {
      triggerAdminBadgeRefresh();
    }
    return res;
  } catch (err) {
    console.error("Error resolving dispute:", err);
    return { success: false, message: "Failed to resolve dispute." };
  }
}

// --------------------------------------------------------------------------
// NOTIFICATIONS & BROADCASTS API
// --------------------------------------------------------------------------
export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  category: "dispute" | "merchant" | "rider" | "payout" | "system" | string;
  priority: "urgent" | "normal";
  time: string;
  action_url?: string;
  is_read: boolean;
}

export async function fetchAdminNotifications(category?: string): Promise<{
  success: boolean;
  unreadCount?: number;
  data?: AdminNotification[];
}> {
  try {
    const qs = category && category !== "all" ? `?category=${encodeURIComponent(category)}` : "";
    const res = await adminFetch<{
      success: boolean;
      unreadCount: number;
      data: AdminNotification[];
    }>(`/admin/notifications/${qs}`, { headers: getAdminAuthHeaders() });
    return res;
  } catch (err) {
    console.error("Error fetching admin notifications:", err);
    return { success: false };
  }
}

export async function sendAdminBroadcast(payload: {
  title: string;
  message: string;
  category?: string;
  priority?: "urgent" | "normal";
}): Promise<{ success: boolean; message?: string; data?: AdminNotification }> {
  try {
    const res = await adminFetch<{ success: boolean; message: string; data: AdminNotification }>(
      "/admin/notifications/broadcast/",
      {
        method: "POST",
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );
    return res;
  } catch (err) {
    console.error("Error sending broadcast:", err);
    return { success: false, message: "Failed to broadcast notification." };
  }
}

export async function markAdminNotificationRead(id: string): Promise<{ success: boolean }> {
  try {
    const res = await adminFetch<{ success: boolean }>(
      `/admin/notifications/${encodeURIComponent(id)}/read/`,
      {
        method: "POST",
        headers: getAdminAuthHeaders(),
      }
    );
    if (res.success) {
      triggerAdminBadgeRefresh();
    }
    return res;
  } catch (err) {
    console.error("Error marking notification read:", err);
    return { success: false };
  }
}

export async function markAllAdminNotificationsRead(): Promise<{ success: boolean }> {
  try {
    const res = await adminFetch<{ success: boolean }>("/admin/notifications/read-all/", {
      method: "POST",
      headers: getAdminAuthHeaders(),
    });
    if (res.success) {
      triggerAdminBadgeRefresh();
    }
    return res;
  } catch (err) {
    console.error("Error marking all read:", err);
    return { success: false };
  }
}


