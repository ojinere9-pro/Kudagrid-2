import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { 
  ArrowDownLeft, Sparkles, Copy, 
  ChevronRight, CreditCard,
  UserPlus, Megaphone, Users,
  Eye, EyeOff, User, LayoutDashboard, Award, ArrowUpRight,
  Shield, Banknote, Headset, LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import TelegramModal from "./TelegramModal";

interface DashboardScreenProps {
  username: string;
  depositBalance: number;
  referralBalance: number;
  taskBalance: number;
  currentPlan: string;
  loading: boolean;
  onLogout: () => void;
  onNavigateToUpgrade: () => void;
  onNavigateToWithdraw: (wallet?: "commission" | "referral") => void;
  onNavigateToTasks: () => void;
  onNavigateToAdmin?: () => void;
  email?: string;
  initialTab?: "home" | "referral" | "profile";
  onTabChange?: (tab: "home" | "referral" | "profile") => void;
}

export default function DashboardScreen({
  username,
  depositBalance,
  referralBalance,
  taskBalance,
  currentPlan,
  loading,
  onLogout,
  onNavigateToUpgrade,
  onNavigateToWithdraw,
  onNavigateToTasks,
  onNavigateToAdmin,
  email,
  initialTab,
  onTabChange
}: DashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<"home" | "referral" | "profile">(initialTab || "home");
  const [showBalance, setShowBalance] = useState(true);
  const [showTelegramModal, setShowTelegramModal] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Referral Stats State
  const [referredUsersCount, setReferredUsersCount] = useState(0);
  const [referralTxList, setReferralTxList] = useState<any[]>([]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!username) return;
    
    const usersQuery = query(collection(db, "users"), where("referredBy", "==", username));
    const unsubscribeUsers = onSnapshot(usersQuery, (snap) => setReferredUsersCount(snap.size));

    const txQuery = query(collection(db, "users", username, "referralTransactions"));
    const unsubscribeTx = onSnapshot(txQuery, (snap) => {
      const txs: any[] = [];
      snap.forEach((doc) => txs.push({ id: doc.id, ...doc.data() }));
      txs.sort((a, b) => (b.timestamp ? new Date(b.timestamp).getTime() : 0) - (a.timestamp ? new Date(a.timestamp).getTime() : 0));
      setReferralTxList(txs);
    });

    return () => { unsubscribeUsers(); unsubscribeTx(); };
  }, [username]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatNaira = (val: number | null) => {
    if (val === null) return "₦ 0.00";
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(val);
  };

  const totalBalance = depositBalance + referralBalance + taskBalance;

  const handleTabChange = (tab: "home" | "referral" | "profile") => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  return (
    <div className="flex flex-col flex-1 pb-24 bg-white overflow-hidden relative">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-12 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 max-w-[320px] ${
              toastMessage.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <span className="text-xs font-semibold leading-tight">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3d2314] to-[#8c6239] flex items-center justify-center border border-[#dfb04d]/30 shadow-md">
            <span className="text-sm font-bold text-[#dfb04d] font-display">KG</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#8c6239]/80 font-display">Welcome back,</p>
            <h2 className="text-sm font-bold text-[#3d2314]">{username}</h2>
          </div>
        </div>
        <button onClick={() => handleTabChange("profile")} className="p-2.5 rounded-xl bg-[#faf7f2] border border-[#8c6239]/10 text-[#8c6239] hover:bg-[#f4eee1] transition-all">
          <User className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-2 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-4 border-[#3d2314] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[#3d2314] font-medium font-display uppercase tracking-widest">Connecting Vault...</p>
          </div>
        ) : (
          <div className="space-y-6 pb-6">
            {activeTab === "home" && (
              <>
                {/* 2. Total Balance Section */}
                <div className="relative overflow-hidden rounded-[28px] bg-[#3d2314] p-7 text-white shadow-xl shadow-[#3d2314]/20 border border-white/5">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles className="w-20 h-20" />
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-white/60 font-medium tracking-wide">Total Balance</p>
                    <button onClick={() => setShowBalance(!showBalance)} className="p-1 text-white/50 hover:text-white transition-colors">
                      {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                  <h3 className="text-3xl font-black font-display tracking-tight">
                    {showBalance ? formatNaira(totalBalance) : "₦ • • • • • •"}
                  </h3>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[10px] px-2.5 py-0.5 bg-white/10 rounded-full border border-white/10 text-white/80 font-bold uppercase tracking-widest">
                      Plan: {currentPlan}
                    </span>
                  </div>
                </div>

                {/* 3. Action Buttons Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={onNavigateToUpgrade} 
                    className="p-5 rounded-2xl bg-white border border-[#8c6239]/10 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#faf7f2] flex items-center justify-center text-[#d4a017] group-hover:bg-[#d4a017] group-hover:text-white transition-colors">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-[#3d2314] uppercase tracking-wider">Deposit</span>
                  </button>
                  <button 
                    onClick={onNavigateToWithdraw} 
                    className="p-5 rounded-2xl bg-white border border-[#8c6239]/10 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#faf7f2] flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <ArrowDownLeft className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-[#3d2314] uppercase tracking-wider">Withdraw</span>
                  </button>
                  <button 
                    onClick={onNavigateToUpgrade} 
                    className="p-5 rounded-2xl bg-white border border-[#8c6239]/10 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#faf7f2] flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Award className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-[#3d2314] uppercase tracking-wider">Upgrade</span>
                  </button>
                  <button 
                    onClick={onNavigateToTasks} 
                    className="p-5 rounded-2xl bg-white border border-[#8c6239]/10 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#faf7f2] flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-[#3d2314] uppercase tracking-wider">Earnings</span>
                  </button>
                </div>

                {/* 4. Wallet Cards */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-[#3d2314] uppercase tracking-[1px] pl-1 font-display">Wallet Breakdown</h4>
                  
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-br from-[#faf7f2] to-[#f4eee1] rounded-[24px] border border-[#8c6239]/10 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#d4a017]">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#8c6239]/60 uppercase tracking-widest">Commission</p>
                          <h4 className="text-lg font-black text-[#3d2314] font-display">{formatNaira(taskBalance)}</h4>
                        </div>
                      </div>
                      <button onClick={() => onNavigateToWithdraw("commission")} className="text-[9px] font-black text-white uppercase tracking-widest bg-[#3d2314] px-3 py-2 rounded-lg active:scale-95 transition-transform flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        Cashout
                      </button>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-[#faf7f2] to-[#f4eee1] rounded-[24px] border border-[#8c6239]/10 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#d4a017]">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#8c6239]/60 uppercase tracking-widest">Referral</p>
                          <h4 className="text-lg font-black text-[#3d2314] font-display">{formatNaira(referralBalance)}</h4>
                        </div>
                      </div>
                      <button onClick={() => onNavigateToWithdraw("referral")} className="text-[9px] font-black text-white uppercase tracking-widest bg-[#3d2314] px-3 py-2 rounded-lg active:scale-95 transition-transform flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        Cashout
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. Support & Community */}
                <div className="bg-[#faf7f2]/50 rounded-2xl p-4 border border-[#8c6239]/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc]">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-[#3d2314] uppercase tracking-wide">Join Community</p>
                      <p className="text-[9px] text-[#8c6239] font-medium">Get real-time updates & support</p>
                    </div>
                  </div>
                  <a href="https://t.me/kudagridofficial" target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-lg border border-[#8c6239]/10 text-[#8c6239]">
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </>
            )}

            {activeTab === "referral" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#8c6239]/10 pb-3">
                  <h3 className="text-base font-black text-[#3d2314] font-display flex items-center gap-1.5">
                    <UserPlus className="w-5 h-5 text-[#d4a017]" />
                    <span>Referral Program</span>
                  </h3>
                  <span className="text-[9px] px-2.5 py-0.5 bg-[#d4a017]/10 text-[#d4a017] font-black rounded-full uppercase tracking-wider border border-[#d4a017]/20">50% Bonus</span>
                </div>

                <div className="bg-[#3d2314] rounded-3xl p-6 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-[2px] mb-2">Your Referral Link</p>
                    <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-3 border border-white/10 mb-4">
                      <p className="text-xs font-mono truncate flex-1 opacity-90">{`${window.location.origin}?ref=${username}`}</p>
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?ref=${username}`); showToast("success", "Link copied!"); }} className="p-2 bg-[#d4a017] rounded-xl text-[#3d2314] active:scale-90 transition-transform">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-white/40 uppercase mb-1">Total Refers</p>
                        <p className="text-2xl font-black font-display">{referredUsersCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-white/40 uppercase mb-1">Bonus Earned</p>
                        <p className="text-2xl font-black font-display">₦{referralBalance.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black text-[#3d2314] uppercase tracking-wider pl-1 font-display">Commission History</h4>
                  {referralTxList.length === 0 ? (
                    <div className="text-center py-10 bg-[#faf7f2]/50 rounded-2xl border border-[#8c6239]/10 text-xs text-[#8c6239] italic font-medium">No referral commissions yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {referralTxList.map((tx) => (
                        <div key={tx.id} className="p-4 bg-white border border-[#8c6239]/10 rounded-2xl flex items-center justify-between shadow-sm">
                          <div>
                            <p className="text-[11px] font-bold text-[#3d2314]">User: {tx.referredUser}</p>
                            <p className="text-[9px] text-[#8c6239] mt-0.5">{tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : ""}</p>
                          </div>
                          <p className="text-[13px] font-black text-emerald-600">+₦{tx.bonusAmount?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center pt-4 pb-2">
                  <div className="w-20 h-20 rounded-[28px] bg-gradient-to-tr from-[#3d2314] to-[#8c6239] flex items-center justify-center border-4 border-[#faf7f2] shadow-xl mb-4">
                    <User className="w-10 h-10 text-[#dfb04d]" />
                  </div>
                  <h3 className="text-xl font-black text-[#3d2314] font-display">{username}</h3>
                  <p className="text-[10px] text-[#8c6239] font-black uppercase tracking-widest mt-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Verified {currentPlan} Tier
                  </p>
                </div>

                <div className="bg-white rounded-3xl border border-[#8c6239]/10 overflow-hidden shadow-sm">
                  {email === "marvellousu031@gmail.com" && (
                    <div onClick={onNavigateToAdmin} className="p-5 border-b border-[#faf7f2] flex items-center justify-between cursor-pointer hover:bg-[#faf7f2]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#faf7f2] flex items-center justify-center text-[#d4a017]">
                          <Shield className="w-5 h-5" />
                        </div>
                        <p className="text-[13px] font-bold text-[#3d2314]">Enter Admin Panel</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                  <div onClick={() => onNavigateToWithdraw()} className="p-5 flex items-center justify-between cursor-pointer hover:bg-[#faf7f2]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#faf7f2] flex items-center justify-center text-[#8c6239]">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <p className="text-[13px] font-bold text-[#3d2314]">Payout History</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-[#8c6239]/10 overflow-hidden shadow-sm">
                  <a href="https://wa.me/6285863067526" target="_blank" rel="noopener noreferrer" className="p-5 border-b border-[#faf7f2] flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Headset className="w-5 h-5" />
                      </div>
                      <p className="text-[13px] font-bold text-[#3d2314]">Customer Support</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </a>
                  <button onClick={onLogout} className="w-full p-5 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                        <LogOut className="w-5 h-5" />
                      </div>
                      <p className="text-[13px] font-bold text-red-600">Deauthorize Account</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating WhatsApp Support Button */}
      <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="fixed bottom-28 right-6 z-40">
        <motion.a
          href="https://wa.me/6285863067526"
          target="_blank"
          rel="noopener noreferrer"
          animate={{ boxShadow: ["0 0 0 0px rgba(37, 211, 102, 0.4)", "0 0 0 15px rgba(37, 211, 102, 0)", "0 0 0 0px rgba(37, 211, 102, 0.4)"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 active:scale-90 transition-transform"
        >
          <Headset className="w-7 h-7" />
        </motion.a>
      </motion.div>

      {/* 6. Floating Navigation Bar */}
      <div className="fixed bottom-6 inset-x-6 h-18 bg-white border border-[#8c6239]/10 rounded-[24px] flex items-center justify-around px-2 shadow-xl z-[60]">
        {[
          { id: "home", icon: LayoutDashboard, label: "Dashboard" },
          { id: "referral", icon: Users, label: "Network" },
          { id: "tasks", icon: Sparkles, label: "Earnings" },
          { id: "profile", icon: User, label: "Account" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => tab.id === "tasks" ? onNavigateToTasks() : handleTabChange(tab.id as any)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative py-2 px-4 rounded-2xl ${
              activeTab === tab.id ? "text-[#3d2314]" : "text-[#8c6239]/40 hover:text-[#8c6239]"
            }`}
          >
            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? "stroke-[2.5px]" : "stroke-[2px]"}`} />
            <span className="text-[9px] font-black uppercase tracking-wider font-display">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="nav-pill" className="absolute inset-0 bg-[#faf7f2] -z-10 rounded-2xl border border-[#8c6239]/5" />
            )}
          </button>
        ))}
      </div>

      <TelegramModal isOpen={showTelegramModal} onClose={() => setShowTelegramModal(false)} />
    </div>
  );
}
