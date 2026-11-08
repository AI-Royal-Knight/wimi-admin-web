"use client";

import { useState, useEffect } from "react";
import {
  Check,
  Shield,
  User,
  Mail,
  Phone,
  KeyRound,
  Lock,
  RotateCw,
  Sliders,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  fetchAdminProfile,
  updateAdminProfile,
  getStoredAdminUser,
} from "@/lib/api";

export default function AdminSettingsPage() {
  const [fullName, setFullName] = useState(() => getStoredAdminUser()?.full_name || "Admin");
  const [email, setEmail] = useState(() => getStoredAdminUser()?.email || "admin@gmail.com");
  const [phone, setPhone] = useState(() => getStoredAdminUser()?.phone || "+509 3788-0001");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [role, setRole] = useState("Super Admin");
  const [dateJoined, setDateJoined] = useState("2026-11-01");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Platform operational preferences
  const [commissionRate, setCommissionRate] = useState("10");
  const [baseDeliveryFee, setBaseDeliveryFee] = useState("100");
  const [supportEmail, setSupportEmail] = useState("support@tiboutik.ht");
  const [supportPhone, setSupportPhone] = useState("+509 2811-0000");
  const [moncashAutoPayout, setMoncashAutoPayout] = useState(true);
  const [platformSavedToast, setPlatformSavedToast] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      setIsLoading(true);
      try {
        const res = await fetchAdminProfile();
        if (isMounted && res.success && res.data) {
          if (res.data.full_name) setFullName(res.data.full_name);
          if (res.data.email) setEmail(res.data.email);
          if (res.data.phone) setPhone(res.data.phone);
          if (res.data.role) {
            setRole(res.data.role === "admin" ? "Super Admin" : "Platform Admin");
          }
          if (res.data.date_joined) {
            setDateJoined(res.data.date_joined.split("T")[0]);
          }
        }
      } catch (err) {
        console.warn("Could not fetch admin profile:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword) {
      if (!currentPassword) {
        setErrorMessage("Please enter your current password to set a new password.");
        return;
      }
      if (newPassword.length < 8) {
        setErrorMessage("New password must be at least 8 characters long.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("New password and confirmation password do not match.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await updateAdminProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
      });

      if (res.success) {
        setShowSavedToast(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setShowSavedToast(false);
        }, 3000);
      } else {
        setErrorMessage(res.message || "Failed to update profile settings.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred while saving your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePlatformConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setPlatformSavedToast(true);
    setTimeout(() => {
      setPlatformSavedToast(false);
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 select-none">
      {/* Toast Alert: Profile Saved */}
      {showSavedToast && (
        <div className="fixed top-6 right-8 z-50 bg-[#1E1B4B] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-[13px] font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span>Admin profile preferences saved successfully!</span>
        </div>
      )}

      {/* Toast Alert: Platform Settings Saved */}
      {platformSavedToast && (
        <div className="fixed top-6 right-8 z-50 bg-[#FF5B00] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-[13px] font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="w-5 h-5 rounded-full bg-white text-[#FF5B00] flex items-center justify-center">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span>Platform configuration updated!</span>
        </div>
      )}

      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-[#1E1B4B]">Settings</h1>
        <p className="text-[13px] text-zinc-500 mt-0.5">
          Manage your administrator profile, security credentials, and platform preferences
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-[13px] animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-400 hover:text-red-700 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Section 1: Admin Profile Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-[16px] font-bold text-[#1E1B4B]">
              Admin Profile & Credentials
            </h3>
            <p className="text-[12px] text-zinc-400 mt-0.5">
              Live administrator identity and authentication settings
            </p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>{role}</span>
          </span>
        </div>

        {/* Profile Banner Strip */}
        <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1E1B4B] text-white font-bold text-[18px] flex items-center justify-center shadow-xs">
              {fullName.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <div className="font-bold text-zinc-900 text-[15.5px]">
                {isLoading ? "Loading profile..." : fullName}
              </div>
              <div className="text-[12.5px] text-zinc-500 mt-0.5">
                {email} · Super Admin on TiBoutik
              </div>
            </div>
          </div>
          <div className="text-right text-[12px] text-zinc-400">
            Member since: <span className="font-mono text-zinc-600 font-medium">{dateJoined}</span>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-[13px]">
            {/* Full Name */}
            <div>
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Admin Full Name"
                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all shadow-2xs"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gmail.com"
                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all shadow-2xs"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span>Contact Phone</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+509 3788-0001"
                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all shadow-2xs font-mono"
              />
            </div>
          </div>

          {/* Password Change Box */}
          <div className="pt-4 border-t border-zinc-100">
            <div className="mb-3">
              <h4 className="text-[13.5px] font-bold text-[#1E1B4B] flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#FF5B00]" />
                <span>Change Password</span>
              </h4>
              <p className="text-[12px] text-zinc-400">
                Leave password fields blank if you only wish to update personal info
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-[13px]">
              <div>
                <label className="block text-[12.5px] font-medium text-zinc-600 mb-1.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-zinc-400" />
                  <span>Current Password</span>
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-medium text-zinc-600 mb-1.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-zinc-400" />
                  <span>New Password</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-medium text-zinc-600 mb-1.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-zinc-400" />
                  <span>Confirm New Password</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#1E1B4B] hover:bg-[#151336] disabled:bg-zinc-300 text-white font-semibold text-[13px] shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Platform Operational Parameters */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-[16px] font-bold text-[#1E1B4B] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#FF5B00]" />
              <span>Platform & Gateway Preferences</span>
            </h3>
            <p className="text-[12px] text-zinc-400 mt-0.5">
              Default commission rates, delivery thresholds, and mobile gateway configuration
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold">
            Currency: HTG (Haiti)
          </span>
        </div>

        <form onSubmit={handleSavePlatformConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[13px]">
            <div>
              <label className="block text-[12.5px] font-medium text-zinc-700 mb-1.5">
                Platform Commission (%)
              </label>
              <input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                min="0"
                max="50"
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[13.5px] font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-zinc-700 mb-1.5">
                Base Delivery Fee (HTG)
              </label>
              <input
                type="number"
                value={baseDeliveryFee}
                onChange={(e) => setBaseDeliveryFee(e.target.value)}
                min="0"
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[13.5px] font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-zinc-700 mb-1.5">
                Support Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[13.5px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-zinc-700 mb-1.5">
                Support Phone
              </label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[13.5px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-100 flex items-center justify-between">
            <div>
              <div className="font-semibold text-zinc-900 text-[13px]">
                MonCash Instant Disbursal Mode
              </div>
              <div className="text-[11.5px] text-zinc-500">
                Automatically verify customer OTP confirmation before releasing partner payout eligibility
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={moncashAutoPayout}
                onChange={(e) => setMoncashAutoPayout(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF5B00]"></div>
            </label>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#FF5B00] hover:bg-orange-600 text-white font-semibold text-[12.5px] shadow-xs transition-colors cursor-pointer"
            >
              Update Platform Config
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
