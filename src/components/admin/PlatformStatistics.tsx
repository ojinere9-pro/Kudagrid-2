import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { 
  Users, Banknote, TrendingUp, Clock, 
  Briefcase, Activity, Loader2, ArrowUpRight,
  TrendingDown
} from "lucide-react";
import { motion } from "motion/react";
import ActiveInvestorsList from "./ActiveInvestorsList";

export default function PlatformStatistics() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    activePlans: 0,
    activeInvestors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showActiveInvestorsList, setShowActiveInvestorsList] = useState(false);

  useEffect(() => {
    // 1. Total Registered Users
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snap) => {
      const users = snap.docs.map(doc => doc.data());
      const activeInvestorsCount = users.filter(u => u.currentPlan && u.currentPlan !== "None").length;
      
      setStats(prev => ({ 
        ...prev, 
        totalUsers: snap.docs.length,
        activePlans: activeInvestorsCount,
        activeInvestors: activeInvestorsCount
      }));
    });

    // 2. Total Deposits (Approved)
    const dQuery = query(collection(db, "deposits"), where("status", "==", "approved"));
    const unsubscribeDeposits = onSnapshot(dQuery, (snap) => {
      const total = snap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      setStats(prev => ({ ...prev, totalDeposits: total }));
    });

    // 3. Total Withdrawals (Approved)
    const wApprovedQuery = query(collection(db, "withdrawals"), where("status", "==", "Approved"));
    const unsubscribeWApproved = onSnapshot(wApprovedQuery, (snap) => {
      const total = snap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      setStats(prev => ({ ...prev, totalWithdrawals: total }));
    });

    // 4. Pending Withdrawals
    const wPendingQuery = query(collection(db, "withdrawals"), where("status", "==", "pending"));
    const unsubscribeWPending = onSnapshot(wPendingQuery, (snap) => {
      setStats(prev => ({ ...prev, pendingWithdrawals: snap.docs.length }));
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeDeposits();
      unsubscribeWApproved();
      unsubscribeWPending();
    };
  }, []);

  if (showActiveInvestorsList) {
    return <ActiveInvestorsList onBack={() => setShowActiveInvestorsList(false)} />;
  }

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const statCards = [
    { 
      label: "Total Users", 
      value: stats.totalUsers, 
      icon: Users, 
      color: "blue",
      description: "Total registered accounts" 
    },
    { 
      label: "Total Deposits", 
      value: formatNaira(stats.totalDeposits), 
      icon: Banknote, 
      color: "emerald",
      description: "Total successful deposits" 
    },
    { 
      label: "Total Withdrawals", 
      value: formatNaira(stats.totalWithdrawals), 
      icon: TrendingDown, 
      color: "slate",
      description: "Total successful withdrawals" 
    },
    { 
      label: "Pending Withdrawals", 
      value: stats.pendingWithdrawals, 
      icon: Clock, 
      color: "amber",
      description: "Withdrawal requests pending" 
    },
    { 
      label: "Active Plans", 
      value: stats.activePlans, 
      icon: Briefcase, 
      color: "indigo",
      description: "Active investment plans" 
    },
    { 
      label: "Active Investors", 
      value: stats.activeInvestors, 
      icon: Activity, 
      color: "violet",
      description: "Investors with active plans",
      clickable: true
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Platform Statistics</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live system metrics</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Live Sync</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => card.clickable && setShowActiveInvestorsList(true)}
            className={`p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-5 hover:border-blue-200 transition-all duration-300 group relative overflow-hidden ${card.clickable ? 'cursor-pointer' : ''}`}
          >
            <div className="flex justify-between items-start relative z-10">
              <div className={`p-3 rounded-2xl transition-all duration-300 ${
                card.color === 'blue' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                card.color === 'amber' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                card.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                card.color === 'violet' ? 'bg-violet-50 text-violet-600 border border-violet-100' :
                'bg-slate-50 text-slate-600 border border-slate-100'
              } group-hover:scale-105 shadow-sm`}>
                <card.icon className="w-5 h-5" />
              </div>
              {card.clickable ? (
                <div className="px-2.5 py-1 bg-violet-600 text-white rounded-lg text-[7px] font-bold uppercase tracking-widest shadow-lg shadow-violet-100">
                  View List
                </div>
              ) : (
                <ArrowUpRight className="w-4 h-4 text-slate-200" />
              )}
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
              <h4 className="text-xl font-bold text-slate-900 tracking-tight mt-1">{card.value}</h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">{card.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
