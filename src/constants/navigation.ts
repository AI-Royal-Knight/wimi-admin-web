import {
  LucideIcon,
  LayoutDashboard,
  Users,
  Store,
  Bike,
  Package,
  Truck,
  Wallet,
  TrendingUp,
  AlertCircle,
  Bell,
  Settings,
} from "lucide-react";

export type AdminNavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

export const ADMIN_NAVIGATION: AdminNavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Merchants",
    href: "/merchants",
    icon: Store,
  },
  {
    title: "Riders",
    href: "/riders",
    icon: Bike,
  },
  {
    title: "Orders",
    href: "/orders",
    icon: Package,
  },
  {
    title: "Deliveries",
    href: "/deliveries",
    icon: Truck,
  },
  {
    title: "Payments & Wallets",
    href: "/payouts",
    icon: Wallet,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export const ADMIN_MORE_NAVIGATION: AdminNavigationItem[] = [
  {
    title: "Commissions",
    href: "/commissions",
    icon: TrendingUp,
  },
  {
    title: "Disputes",
    href: "/disputes",
    icon: AlertCircle,
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
];
