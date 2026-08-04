import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, where, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  ArrowLeft, Search, Filter, Check, X, 
  Trash2, ExternalLink, RefreshCw, Loader2,
  Users, Banknote, ShieldAlert, ChevronRight,
  TrendingUp, Calendar, Mail, Settings, Briefcase, ShieldCheck, Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import PlatformSettings from "./Admin/PlatformSettings";
import PlanManagement from "./Admin/PlanManagement";
import UserManagement from "./Admin/UserManagement";
import AdminManagement from "./Admin/AdminManagement";
import PlatformStatistics from "./Admin/PlatformStatistics";

interface AdminPanelScreenProps {
  currentAdminUsername: string;
  onBack: () => void;
}

export default function AdminPanelScreen({ currentAdminUsername, onBack }: AdminPanelScreenProps) {
  const [activeTab, setActiveTab] = useState<"withdrawals" | "statistics" | "users" | "plans" | "settings" | "admins">("withdrawals");
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    
    // Listen to users for the map
    const usersRef = collection(db, "users");
    const unsubscribeUsers = onSnapshot(usersRef, (snap) => {
      const map: Record<string, any> = {};
      snap.docs.forEach(doc => {
        map[doc.id] = doc.data();
      });
      setUsersMap(map);
    });

    const wRef = collection(db, "withdrawals");
    const wQuery = query(wRef, orderBy("timestamp", "desc"));
    const unsubscribeW = onSnapshot(wQuery, (snap) => {
      setWithdrawals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeW();
    };
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(`${label} copied.`);
    setTimeout(() => setCopyToast(null), 3000);
  };

  const handleUpdateWithdrawal = async (withdrawalId: string, username: string, status: "Approved" | "Rejected") => {
    setActionLoading(withdrawalId);
    try {
      await updateDoc(doc(db, "withdrawals", withdrawalId), { status });
      await updateDoc(doc(db, "users", username, "payouts", withdrawalId), { status });
      alert(`Withdrawal ${status}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const filteredTransactions = () => {
    if (activeTab === "withdrawals") {
      return withdrawals.filter(w => w.username?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return [];
  };

  return (
    <div className="flex flex-col flex-1 bg-white overflow-hidden relative h-full font-sans">
      {/* Header */}
      <div className="px-6 pt-10 pb-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full bg-slate-50 text-slate-400 active:scale-95 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dashboard</p>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Admin Panel</h2>
          </div>
        </div>
      </div>

      {/* Copy Toast */}
      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 bg-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl flex items-center gap-2"
          >
            <Check className="w-3 h-3 text-emerald-400" />
            {copyToast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">
        {/* Navigation Grid */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 rounded-3xl border border-slate-100">
          {[
            { id: "withdrawals", icon: Banknote, label: "Withdrawals" },
            { id: "statistics", icon: TrendingUp, label: "Statistics" },
            { id: "users", icon: Users, label: "Users" },
            { id: "plans", icon: Briefcase, label: "Plans" },
            { id: "settings", icon: Settings, label: "Settings" },
            { id: "admins", icon: ShieldCheck, label: "Admins" },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl transition-all ${
                activeTab === tab.id ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div className={`p-2 rounded-xl transition-all ${activeTab === tab.id ? "bg-blue-50" : "bg-transparent"}`}>
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "opacity-100" : "opacity-40"}`} />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest">{tab.label}</span>
            </motion.button>
          ))}
        </div>

        {activeTab === "withdrawals" ? (
          <div className="space-y-6">
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search withdrawals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-14 pl-12 pr-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Syncing Data...</p>
              </div>
            ) : (
              <div className="space-y-6 pb-8">
                {filteredTransactions().map((item: any, idx: number) => {
                  const userData = usersMap[item.username] || {};
                  return (
                    <motion.div 
                      key={item.id} 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-6 rounded-3xl bg-white border border-slate-100 shadow-premium space-y-6 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] border border-blue-100">
                              {item.username?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">@{item.username}</p>
                              <p className="text-[9px] font-medium text-slate-300 uppercase tracking-widest">{item.id.slice(0, 8)}</p>
                            </div>
                          </div>
                          <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{formatNaira(item.amount)}</h4>
                        </div>
                        <div className={`px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${
                          item.status?.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          item.status?.toLowerCase() === 'approved' || item.status?.toLowerCase() === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {item.status}
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 relative z-10">
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                          <p className="text-xs font-bold text-slate-900 tracking-tight">{userData.firstName} {userData.lastName}</p>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                            <button onClick={() => handleCopy(userData.email || "", "Email")} className="text-slate-300 hover:text-blue-500">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[10px] font-bold text-slate-900 truncate">{userData.email || "N/A"}</p>
                        </div>
                      </div>

                      <div className="space-y-6 relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-0.5">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Wallet Type</p>
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'Referral' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                              <p className="text-[11px] font-bold text-slate-900 tracking-tight">{item.type || "Commission"}</p>
                            </div>
                          </div>
                          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-0.5">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bank Name</p>
                            <p className="text-[11px] font-bold text-slate-900 tracking-tight">{item.bankName}</p>
                          </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl shadow-slate-100">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Account Details</p>
                              <button onClick={() => handleCopy(item.accountName || "", "Account Name")} className="text-white/40 hover:text-white">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-xs font-bold text-white uppercase tracking-tight">{item.accountName || "N/A"}</p>
                          </div>

                          <div className="pt-4 border-t border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Account Number</p>
                              <button 
                                onClick={() => handleCopy(item.accountNumber || "", "Account Number")}
                                className="flex items-center gap-1.5 text-blue-400 text-[9px] font-bold uppercase tracking-widest"
                              >
                                <Copy className="w-3 h-3" />
                                Copy Number
                              </button>
                            </div>
                            <p className="text-2xl font-bold text-white tracking-widest font-mono">{item.accountNumber}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Calendar className="w-3 h-3" />
                            <p className="text-[9px] font-bold uppercase tracking-widest">{new Date(item.timestamp).toLocaleString()}</p>
                          </div>
                          <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Verified Transaction</span>
                          </div>
                        </div>
                      </div>

                      {item.status?.toLowerCase() === 'pending' && (
                        <div className="flex gap-4 relative z-10">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleUpdateWithdrawal(item.id, item.username, "Approved")}
                            disabled={actionLoading === item.id}
                            className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                          >
                            {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <> <Check className="w-4 h-4" /> Approve </>}
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleUpdateWithdrawal(item.id, item.username, "Rejected")}
                            disabled={actionLoading === item.id}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-slate-100 flex items-center justify-center gap-2"
                          >
                            {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <> <X className="w-4 h-4" /> Reject </>}
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "statistics" ? (
          <PlatformStatistics />
        ) : activeTab === "users" ? (
          <UserManagement adminId={currentAdminUsername} />
        ) : activeTab === "plans" ? (
          <PlanManagement />
        ) : activeTab === "settings" ? (
          <PlatformSettings />
        ) : (
          <AdminManagement currentAdminId={currentAdminUsername} />
        )}
      </div>
    </div>
  );
}
