import React, { useState, useEffect } from "react";
import { doc, updateDoc, increment, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { ArrowLeft, Check, Award, Sparkles, PlusCircle, Clock, TrendingUp, Coins, Loader2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { InvestmentPlan } from "../types";
import DepositModal from "./DepositModal";
import { useGlobalSettings } from "../hooks/useGlobalSettings";

interface UpgradeScreenProps {
  username: string;
  depositBalance: number;
  currentPlan: string;
  email: string;
  onBack: () => void;
}

export default function UpgradeScreen({ username, depositBalance, currentPlan, email, onBack }: UpgradeScreenProps) {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const { settings } = useGlobalSettings();

  const isPortalOpen = settings?.portals?.planPurchase !== false;

  useEffect(() => {
    const q = query(collection(db, "investment_plans"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestmentPlan)).filter(p => p.status === "Active"));
      setLoadingPlans(false);
    });
    return () => unsubscribe();
  }, []);

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePurchasePlan = async (plan: InvestmentPlan) => {
    if (!isPortalOpen) {
      showToast("error", "Plan upgrades are temporarily offline.");
      return;
    }
    if (depositBalance < plan.price) {
      showToast("error", `Insufficient Balance. Please add funds.`);
      return;
    }

    setLoadingPlanId(plan.id);
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
      showToast("error", "An error occurred during upgrade.");
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white overflow-hidden relative h-full font-sans">
// ... (rest of the component UI)
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-premium border flex items-center gap-2.5 w-[90%] max-w-[340px] ${
              toastMessage.type === "success" ? "bg-white border-blue-100 text-blue-700" : "bg-white border-red-100 text-red-600"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${toastMessage.type === "success" ? "bg-blue-500" : "bg-red-500"}`} />
            <span className="text-[13px] font-medium leading-tight">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-6 pt-10 pb-4 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Investment</p>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Upgrade Account</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-12 space-y-8 custom-scrollbar">
        {/* Balance Status */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-8 rounded-[40px] fintech-gradient text-white relative overflow-hidden shadow-blue-light"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
          
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest opacity-60 mb-2">Available Balance</p>
              <h3 className="text-3xl font-bold tracking-tight">{formatNaira(depositBalance)}</h3>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsDepositModalOpen(true)}
              className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl border border-white/20 transition-all flex items-center justify-center shadow-lg"
            >
              <PlusCircle className="w-6 h-6" />
            </motion.button>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/10 border border-white/20 w-fit backdrop-blur-md relative z-10">
            <Award className="w-4 h-4 text-blue-300" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Current: {currentPlan}</span>
          </div>
        </motion.div>

        {/* Available Tiers */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-4">Choose an Investment Plan</h4>
          {loadingPlans ? (
            <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
          ) : (
            <div className="space-y-6 relative">
              {!isPortalOpen && (
                <div className="absolute inset-x-0 -top-8 bottom-0 z-10 bg-white/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none rounded-[40px]">
                  <div className="sticky top-1/2 -translate-y-1/2 flex items-center gap-3 px-6 py-3 bg-red-600 text-white rounded-full shadow-2xl pointer-events-auto border border-red-500/30">
                    <Lock className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Plan Purchases Closed</span>
                  </div>
                </div>
              )}
              {plans.map((plan) => {
                const isActive = currentPlan === plan.name;
                return (
                  <motion.div
                    key={plan.id}
                    whileHover={isPortalOpen && !isActive ? { y: -3 } : {}}
                    className={`p-8 rounded-[40px] border transition-all duration-300 relative ${
                      isActive 
                        ? "border-blue-600 bg-blue-50/50 shadow-md" 
                        : "border-slate-100 bg-white shadow-sm hover:border-blue-100"
                    } ${!isPortalOpen ? 'opacity-60 grayscale' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{plan.name}</h5>
                        </div>
                        <h6 className="text-3xl font-bold text-slate-900 tracking-tight">{formatNaira(plan.price)}</h6>
                      </div>
                      {isActive ? (
                        <div className="px-4 py-1.5 rounded-xl bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-100">
                          Active
                        </div>
                      ) : (
                        <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                          <Sparkles className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="p-5 rounded-[24px] bg-slate-50/50 border border-slate-100 space-y-1">
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Task Yield</p>
                        <p className="text-sm font-bold text-slate-900">{formatNaira(plan.earningsPerTask)}</p>
                      </div>
                      <div className="p-5 rounded-[24px] bg-slate-50/50 border border-slate-100 space-y-1 text-right">
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Daily Limit</p>
                        <p className="text-sm font-bold text-slate-900">{plan.dailyTasks} Tasks</p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-10 px-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Daily Returns</span>
                        <span className="text-sm font-bold text-slate-900">{formatNaira(plan.dailyEarnings)}</span>
                      </div>
                      <div className="h-px bg-slate-100"></div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Monthly Returns</span>
                        <span className="text-sm font-bold text-emerald-600">{formatNaira(plan.monthlyEarnings)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePurchasePlan(plan)}
                      disabled={isActive || loadingPlanId !== null || !isPortalOpen}
                      className={`w-full py-5 rounded-[24px] text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                        isActive
                          ? "bg-emerald-500 text-white shadow-emerald-100 cursor-default"
                          : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-100"
                      } disabled:opacity-50`}
                    >
                      {loadingPlanId === plan.id ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-white" />
                      ) : isActive ? (
                        "Current Plan"
                      ) : (
                        `Purchase Plan • ${formatNaira(plan.price)}`
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <DepositModal 
        isOpen={isDepositModalOpen} 
        onClose={() => setIsDepositModalOpen(false)} 
        username={username}
        email={email}
      />
    </div>
  );
}
