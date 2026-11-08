"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/layouts/admin-sidebar";
import AdminHeader from "@/components/layouts/admin-header";
import { isAuthorizedAdmin } from "@/lib/api";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authorized = isAuthorizedAdmin();
      if (!authorized) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace("/login");
      } else {
        setIsAuthorized(true);
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
    window.addEventListener("admin_auth_changed", checkAuth);
    return () => {
      window.removeEventListener("admin_auth_changed", checkAuth);
    };
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8F9FC]">
        <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border border-zinc-200 shadow-sm max-w-[340px] text-center">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5B00]">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-zinc-900">
              Verifying Admin Credentials
            </h2>
            <p className="text-[13px] text-zinc-500 mt-1">
              Checking platform administrator privileges...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8F9FC] p-6">
        <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border border-red-200 shadow-sm max-w-[400px] text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-[17px] font-bold text-zinc-900">
              Access Restricted
            </h2>
            <p className="text-[13px] text-zinc-600 mt-2">
              Only platform administrators are permitted to access this portal. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8F9FC]">
      <AdminSidebar />
      <div className="flex flex-col flex-1 w-full min-w-0 overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
