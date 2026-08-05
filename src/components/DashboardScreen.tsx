import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, increment, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { 
  ArrowDownLeft, Sparkles, Copy, 
  ChevronRight, CreditCard,
  UserPlus, Users,
  User, LayoutDashboard, ArrowUpRight,
  Shield, Banknote, Headset, LogOut, Bell,
  Wallet, TrendingUp, Clock, Check, ChevronLeft, Lock, Loader2,
  ArrowDown, ArrowUp, ClipboardCheck, ShieldAlert, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import DepositModal from "./DepositModal";
import { InvestmentPlan } from "../types";
import { useGlobalSettings } from "../hooks/useGlobalSettings";

interface DashboardScreenProps {
  username: string;
  depositBalance: number;
  referralBalance: number;
  taskBalance: number;
  currentPlan: string;
  totalReferrals: number;
  totalReferralEarnings: number;
  loading: boolean;
  onLogout: () => void;
  onNavigateToUpgrade: () => void;
  onNavigateToWithdraw: (wallet?: "commission" | "referral") => void;
  onNavigateToTasks: () => void;
  onNavigateToAdmin?: () => void;
  email?: string;
  initialTab?: "home" | "referral" | "profile";
  onTabChange?: (tab: "home" | "referral" | "profile") => void;
  isAdmin?: boolean;
}

export default function DashboardScreen({
  username,
  depositBalance,
  referralBalance,
  taskBalance,
  currentPlan,
  totalReferrals,
  totalReferralEarnings,
  loading,
  onLogout,
  onNavigateToWithdraw,
  onNavigateToTasks,
  onNavigateToAdmin,
  email,
  initialTab,
  onTabChange,
}: DashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<"home" | "referral" | "profile">(initialTab || "home");
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [showTaskWarning, setShowTaskWarning] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const { settings } = useGlobalSettings();

  const isPlanPortalOpen = settings?.portals?.planPurchase !== false;
  const isReferralPortalOpen = settings?.portals?.referralSystem !== false;

  const [referredUsersCount, setReferredUsersCount] = useState(0);
  const [referralTxList, setReferralTxList] = useState<any[]>([]);
  const [tasksCompletedToday, setTasksCompletedToday] = useState(0);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!username) return;

    const plansQuery = query(collection(db, "investment_plans"), orderBy("order", "asc"));
    const unsubscribePlans = onSnapshot(plansQuery, (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestmentPlan)).filter(p => p.status === "Active"));
    });
    
    const usersQuery = query(collection(db, "users"), where("referredBy", "==", username));
    const unsubscribeUsers = onSnapshot(usersQuery, (snap) => setReferredUsersCount(snap.size));

    const txQuery = query(collection(db, "users", username, "referralTransactions"));
    const unsubscribeTx = onSnapshot(txQuery, (snap) => {
      const txs: any[] = [];
      snap.forEach((doc) => txs.push({ id: doc.id, ...doc.data() }));
      txs.sort((a, b) => (b.timestamp ? new Date(b.timestamp).getTime() : 0) - (a.timestamp ? new Date(a.timestamp).getTime() : 0));
      setReferralTxList(txs);
    });

    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];
    const completedTasksRef = collection(db, "users", username, "completedTasks");
    const unsubscribeTasks = onSnapshot(completedTasksRef, (snapshot) => {
      const count = snapshot.docs.filter(doc => doc.id.includes(todayKey)).length;
      setTasksCompletedToday(count);
    });

    return () => { 
      unsubscribePlans();
      unsubscribeUsers(); 
      unsubscribeTx(); 
      unsubscribeTasks();
    };
  }, [username]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatNaira = (val: number | null) => {
    if (val === null) return "₦0.00";
    return new Intl.NumberFormat("en-NG", { 
      style: "currency", 
      currency: "NGN", 
      minimumFractionDigits: 0 
    }).format(val);
  };

  const handleTabChange = (tab: "home" | "referral" | "profile") => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const handlePurchasePlan = async (plan: InvestmentPlan) => {
    if (!isPlanPortalOpen) {
      showToast("error", "Plan upgrades are temporarily offline.");
      return;
    }
    if (depositBalance < plan.price) {
      showToast("error", "Insufficient Balance. Please deposit funds first.");
      return;
    }

    setPurchaseLoading(plan.id);
    try {
      const userRef = doc(db, "users", username);
      await updateDoc(userRef, {
        depositBalance: increment(-plan.price),
        currentPlan: plan.name,
        planPurchaseDate: new Date().toISOString()
      });
      showToast("success", `Upgraded to ${plan.name}!`);
    } catch (err) {
      console.error(err);
      showToast("error", "Purchase failed. Try again.");
    } finally {
      setPurchaseLoading(null);
    }
  };

  const activePlanData = plans.find(p => p.name === currentPlan);
  const totalTasks = activePlanData?.dailyTasks || 0;

  return (
    <div className="flex flex-col flex-1 pb-28 bg-white overflow-hidden relative font-sans">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-premium border flex items-center gap-2.5 w-[90%] max-w-[340px] ${
              toastMessage.type === "success" ? "bg-white border-blue-100 text-blue-700" : "bg-white border-red-100 text-red-600"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${toastMessage.type === "success" ? "bg-blue-500" : "bg-red-500"}`} />
            <span className="text-[13px] font-medium leading-tight">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Warning Popup */}
      <AnimatePresence>
        {showTaskWarning && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowTaskWarning(false)} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative w-full max-w-[360px] bg-white rounded-[40px] p-8 text-center space-y-6 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
              
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-100 shadow-sm">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-tight">
                  ⚠️ IMPORTANT TASK WARNING
                </h3>
                
                <div className="text-left space-y-4">
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Before completing or submitting any task, please read this carefully. Every task proof submitted on KudaGrid is carefully reviewed using both automated systems and manual verification.
                  </p>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                    <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Do NOT submit:</p>
                    <ul className="text-[10px] text-slate-500 font-bold space-y-1">
                      <li className="flex items-center gap-2">• Fake or Edited screenshots</li>
                      <li className="flex items-center gap-2">• AI-generated images</li>
                      <li className="flex items-center gap-2">• Reused or shared screenshots</li>
                    </ul>
                  </div>

                  <p className="text-[10px] text-slate-600 font-bold leading-relaxed">
                    Any fraudulent submission will result in:
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-[10px] font-black text-red-600 uppercase tracking-tight flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                      Immediate permanent account suspension
                    </div>
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-[10px] font-black text-red-600 uppercase tracking-tight flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                      Loss of all earnings and balances
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-widest">
                    There will be NO warning and NO appeal.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowTaskWarning(false);
                    onNavigateToTasks();
                  }} 
                  className="w-full py-4 bg-blue-600 text-white rounded-[22px] text-[11px] font-bold uppercase tracking-widest active:scale-95 shadow-lg shadow-blue-100"
                >
                  🔵 I Understand & Continue
                </button>
                <button 
                  onClick={() => setShowTaskWarning(false)} 
                  className="w-full py-4 bg-slate-50 text-slate-400 rounded-[22px] text-[11px] font-bold uppercase tracking-widest active:scale-95"
                >
                  ⚪ Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-6 pt-10 pb-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 overflow-hidden flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Welcome,</p>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">{username}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full ring-2 ring-white"></span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-[2px]">Loading Account...</p>
          </div>
        ) : (
          <>
            {activeTab === "home" && (
              <>
                {/* Main Wallets */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accounts</h3>
                  </div>
                  
                    <div className="overflow-x-auto flex gap-4 pb-4 no-scrollbar -mx-6 px-6 snap-x">
                    {/* Commission Wallet */}
                    <motion.div 
                      whileTap={{ scale: 0.98 }}
                      className="min-w-[280px] snap-center p-6 rounded-[32px] fintech-gradient text-white relative overflow-hidden shadow-blue-light"
                    >
                      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                      
                      <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-xl border border-white/30">
                          <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div className="px-3 py-1 bg-white/10 rounded-full backdrop-blur-md border border-white/20">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-white/90">Commission</p>
                        </div>
                      </div>
                      
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-[2px] mb-1">Available Funds</p>
                        <h4 className="text-3xl font-bold mb-6 tracking-tight">{formatNaira(taskBalance)}</h4>
                        
                        <div className="flex gap-3">
                          <button 
                            onClick={() => onNavigateToWithdraw("commission")}
                            className="flex-1 py-3 bg-white text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
                          >
                            Withdraw
                          </button>
                        </div>
                      </div>
                    </motion.div>

                    {/* Referral Wallet */}
                    <motion.div 
                      whileTap={{ scale: 0.98 }}
                      className="min-w-[280px] snap-center p-6 rounded-[32px] bg-slate-900 text-white relative overflow-hidden shadow-sm"
                    >
                      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                      
                      <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="p-3 bg-white/5 rounded-xl backdrop-blur-xl border border-white/10">
                          <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div className="px-3 py-1 bg-white/5 rounded-full backdrop-blur-md border border-white/10">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-white/90">Referral Bonus</p>
                        </div>
                      </div>
                      
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-1">Available Funds</p>
                        <h4 className="text-3xl font-bold mb-6 tracking-tight">{formatNaira(referralBalance)}</h4>
                        
                        <div className="flex gap-3">
                          <button 
                            onClick={() => onNavigateToWithdraw("referral")}
                            className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest backdrop-blur-md transition-all border border-white/10 active:scale-95"
                          >
                            Withdraw
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Secondary Actions Card */}
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  className="p-6 rounded-2xl bg-white border border-slate-100 flex items-center justify-between shadow-sm hover:border-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Deposit Balance</p>
                      <h4 className="text-xl font-bold text-slate-900 tracking-tight">{formatNaira(depositBalance)}</h4>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDepositModalOpen(true)}
                    className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl text-white active:scale-90 transition-all shadow-lg shadow-blue-100 flex items-center justify-center"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </motion.div>

                {/* Quick Access Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsDepositModalOpen(true)}
                    className="h-16 rounded-[20px] bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all font-bold text-[13px] uppercase tracking-widest border border-white/10"
                  >
                    <ArrowDown className="w-5 h-5" />
                    Deposit
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onNavigateToWithdraw()}
                    className="h-16 rounded-[20px] bg-gradient-to-r from-blue-600 to-red-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all font-bold text-[13px] uppercase tracking-widest border border-white/10"
                  >
                    <ArrowUp className="w-5 h-5" />
                    Withdraw
                  </motion.button>
                </div>

                {/* Premium Plans Carousel */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Investment Plans</h3>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                    </div>
                  </div>

                  <div className="relative">
                    {plans.length === 0 ? (
                      <div className="w-full py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No investment plans available at the moment.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto flex gap-4 pb-8 no-scrollbar -mx-6 px-6 snap-x relative">
                        {!isPlanPortalOpen && (
                          <div className="absolute inset-y-0 left-6 right-6 z-10 bg-white/30 backdrop-blur-[2px] flex items-center justify-center rounded-3xl">
                             <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full shadow-lg border border-red-500/30">
                              <Lock className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Plans Offline</span>
                            </div>
                          </div>
                        )}
                        {plans.map((plan) => {
                          const isActive = currentPlan === plan.name;
                          return (
                            <motion.div 
                              key={plan.id} 
                              whileHover={isPlanPortalOpen ? { y: -4 } : {}}
                              className={`min-w-[280px] snap-center p-6 rounded-[32px] border transition-all duration-300 relative flex flex-col ${
                                isActive 
                                  ? "border-blue-600 bg-blue-50/40 shadow-blue-100/50" 
                                  : "border-slate-100 bg-white shadow-lg shadow-slate-200/50 hover:border-blue-200"
                              } ${!isPlanPortalOpen ? 'opacity-60' : ''}`}
                            >
                              {isActive && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white rounded-full text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-blue-200 z-10">
                                  Active Plan
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-blue-50 text-blue-600"}`}>
                                  <Sparkles className="w-6 h-6" />
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tier Name</p>
                                  <h4 className="text-lg font-bold text-slate-900">{plan.name}</h4>
                                </div>
                              </div>
                              
                              <div className="space-y-4 flex-1">
                                <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-1">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Activation Fee</p>
                                  <p className="text-xl font-bold text-slate-900">{formatNaira(plan.price)}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 rounded-xl bg-white border border-slate-100">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Task Reward</p>
                                    <p className="text-xs font-bold text-slate-900">{formatNaira(plan.earningsPerTask)}</p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-white border border-slate-100">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Daily Tasks</p>
                                    <p className="text-xs font-bold text-slate-900">{plan.dailyTasks} Tasks</p>
                                  </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-400">Daily Earnings</span>
                                    <span className="text-blue-600">{formatNaira(plan.dailyEarnings)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-400">Duration</span>
                                    <span className="text-slate-900">30 Days</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest pt-2 border-t border-slate-100">
                                    <span className="text-slate-400">Monthly Return</span>
                                    <span className="text-emerald-600 text-sm">{formatNaira(plan.monthlyEarnings)}</span>
                                  </div>
                                </div>
                              </div>

                              <button 
                                onClick={() => handlePurchasePlan(plan)}
                                disabled={isActive || purchaseLoading === plan.id || !isPlanPortalOpen}
                                className={`w-full mt-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                  isActive 
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-default" 
                                    : "bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                                } disabled:opacity-50`}
                              >
                                {purchaseLoading === plan.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    {isActive ? <Check className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                    {isActive ? "Active Plan" : "Purchase Plan"}
                                  </>
                                )}
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Activity Summary */}
                {currentPlan !== "None" && (
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className="p-6 rounded-3xl bg-slate-900 text-white space-y-6 shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                    
                    <div className="flex justify-between items-center relative z-10">
                      <div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Active Plan</p>
                        <h4 className="text-xl font-bold tracking-tight">{currentPlan}</h4>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white/5 text-blue-400 text-[10px] font-bold uppercase tracking-widest border border-white/10 backdrop-blur-md">
                        {tasksCompletedToday} / {totalTasks} Completed
                      </div>
                    </div>

                    <div className="space-y-3 relative z-10">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                        <span>Progress</span>
                        <span>{Math.round((tasksCompletedToday / (totalTasks || 1)) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(tasksCompletedToday / (totalTasks || 1)) * 100}%` }}
                          className="h-full bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-4 relative z-10 border-t border-white/5">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Earned Today</p>
                        <p className="text-xl font-bold text-white tracking-tight">{formatNaira((activePlanData?.earningsPerTask || 0) * tasksCompletedToday)}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Duration</p>
                        <p className="text-xl font-bold text-blue-400 tracking-tight">30 Days</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Transactions */}
                <div className="space-y-4 pt-2 pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Activity</h3>
                  </div>

                  <div className="space-y-3">
                    {referralTxList.length > 0 ? referralTxList.slice(0, 3).map((tx) => (
                      <motion.div 
                        key={tx.id} 
                        whileHover={{ x: 3 }}
                        className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between shadow-sm hover:border-blue-100 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                            <ArrowUpRight className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 tracking-tight">Referral Bonus</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">User: @{tx.referredUser}</p>
                          </div>
                        </div>
                        <p className="text-base font-bold text-emerald-600 tracking-tight">+{formatNaira(tx.bonusAmount)}</p>
                      </motion.div>
                    )) : (
                      <div className="py-12 text-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/30">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No activity yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === "referral" && (
              <div className="space-y-8 pt-2">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Referral Program</h3>
                  <p className="text-xs text-slate-500 font-medium max-w-[220px] mx-auto leading-relaxed">Earn commissions for every user you invite to KudaGrid.</p>
                </div>

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="p-8 rounded-[40px] bg-slate-900 text-white relative overflow-hidden text-center shadow-lg"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                  
                  {!isReferralPortalOpen && (
                    <div className="absolute inset-0 z-10 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4 border border-white/10">
                        <Lock className="w-6 h-6 text-red-500" />
                      </div>
                      <h4 className="text-base font-bold text-white uppercase tracking-tight">Referrals Disabled</h4>
                      <p className="text-[10px] text-white/50 font-medium mt-2 leading-relaxed max-w-[160px]">The referral system is under maintenance.</p>
                    </div>
                  )}
                  
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-6 relative z-10">Referral Link</p>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-8 flex items-center gap-3 backdrop-blur-xl relative z-10 group">
                    <p className="text-[11px] font-mono truncate flex-1 opacity-60 group-hover:opacity-100 transition-opacity">{`${window.location.origin}?ref=${username}`}</p>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?ref=${username}`); showToast("success", "Referral link copied!"); }}
                      disabled={!isReferralPortalOpen}
                      className="w-10 h-10 bg-blue-600 rounded-xl text-white flex items-center justify-center shadow-lg disabled:opacity-50 transition-all"
                    >
                      <Copy className="w-4 h-4" />
                    </motion.button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 py-2 border-t border-white/5 relative z-10">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Referrals</p>
                      <p className="text-3xl font-bold tracking-tight text-white">{totalReferrals}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Commission</p>
                      <p className="text-3xl font-bold tracking-tight text-blue-400">{formatNaira(referralBalance)}</p>
                    </div>
                  </div>

                  <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 relative z-10 text-left">
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Total Referral Earnings</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatNaira(totalReferralEarnings)}</p>
                  </div>
                </motion.div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Referral History</h4>
                  {referralTxList.length === 0 ? (
                    <div className="py-20 text-center rounded-[32px] bg-slate-50/50 border border-slate-100 border-dashed">
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No referrals yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {referralTxList.map((tx) => (
                        <motion.div 
                          key={tx.id} 
                          whileHover={{ x: 3 }}
                          className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm hover:border-blue-100 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                              {tx.referredUser?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 tracking-tight">@{tx.referredUser}</p>
                              <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">{tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : ""}</p>
                            </div>
                          </div>
                          <p className="text-base font-bold text-emerald-600 tracking-tight">+{formatNaira(tx.bonusAmount)}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-8 pt-4">
                <div className="flex flex-col items-center text-center">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-white border-2 border-slate-100 shadow-sm flex items-center justify-center mb-4 relative z-10 overflow-hidden">
                      <User className="w-10 h-10 text-slate-300" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 to-transparent"></div>
                    </div>
                    <div className="absolute bottom-4 right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center z-20">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{username}</h3>
                  <div className="mt-3 px-4 py-1.5 rounded-full bg-slate-900 text-white text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-slate-100">
                    {currentPlan} Plan
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-4">Account Settings</h4>
                  <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    {email === "marvellousu031@gmail.com" && (
                      <button onClick={onNavigateToAdmin} className="w-full p-5 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white group-hover:bg-blue-600 transition-all">
                            <Shield className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Admin</p>
                            <p className="text-sm font-bold text-slate-900 tracking-tight uppercase">Admin Panel</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </button>
                    )}
                    <button onClick={() => onNavigateToWithdraw()} className="w-full p-5 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm group-hover:bg-blue-100 transition-all">
                          <Banknote className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Withdraw</p>
                          <p className="text-sm font-bold text-slate-900 tracking-tight">Withdrawals</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </button>
                    <a href="https://wa.me/6285863067526" target="_blank" rel="noopener noreferrer" className="w-full p-5 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm group-hover:bg-emerald-100 transition-all">
                          <Headset className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Support</p>
                          <p className="text-sm font-bold text-slate-900 tracking-tight">Customer Support</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </a>
                    <button onClick={onLogout} className="w-full p-5 flex items-center justify-between hover:bg-red-50/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shadow-sm group-hover:bg-red-100 transition-all">
                          <LogOut className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-0.5">Logout</p>
                          <p className="text-sm font-bold text-red-600 tracking-tight">Logout of Account</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-red-200 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 inset-x-0 h-20 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around px-6 z-[60] pb-4">
        {[
          { id: "home", icon: LayoutDashboard, label: "Home" },
          { id: "referral", icon: Users, label: "Network" },
          { id: "tasks", icon: ClipboardCheck, label: "Tasks" },
          { id: "profile", icon: User, label: "Profile" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => tab.id === "tasks" ? setShowTaskWarning(true) : handleTabChange(tab.id as any)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 relative ${
                isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "bg-transparent"}`}>
                <tab.icon className="w-5 h-5" />
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? "opacity-100" : "opacity-50"}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <DepositModal 
        isOpen={isDepositModalOpen} 
        onClose={() => setIsDepositModalOpen(false)} 
        username={username}
        email={email || ""}
      />
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}
