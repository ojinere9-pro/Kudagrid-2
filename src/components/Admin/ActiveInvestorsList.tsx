import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { 
  Search, ArrowLeft, Loader2, User, 
  Calendar, CreditCard, Shield, ShieldAlert,
  ArrowUp, ArrowDown, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { InvestmentPlan } from "../../types";

interface ActiveInvestorsListProps {
  onBack: () => void;
}

export default function ActiveInvestorsList({ onBack }: ActiveInvestorsListProps) {
  const [investors, setInvestors] = useState<any[]>([]);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"plan" | "registration" | "expiry" | "balance">("registration");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    // Fetch plans first to map prices
    const unsubscribePlans = onSnapshot(collection(db, "investment_plans"), (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestmentPlan)));
    });

    // Fetch active investors
    const q = query(collection(db, "users"), where("currentPlan", "!=", "None"));
    const unsubscribeInvestors = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvestors(data);
      setLoading(false);
    });

    return () => {
      unsubscribePlans();
      unsubscribeInvestors();
    };
  }, []);

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const calculateExpiry = (purchaseDate: string | undefined) => {
    if (!purchaseDate) return { date: "N/A", days: 0 };
    const start = new Date(purchaseDate);
    const expiry = new Date(start);
    expiry.setDate(start.getDate() + 30); // Assuming 30 days standard
    
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    
    return {
      date: expiry.toLocaleDateString(),
      days: daysRemaining
    };
  };

  const filteredInvestors = investors.filter(inv => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      inv.firstName?.toLowerCase().includes(term) ||
      inv.lastName?.toLowerCase().includes(term) ||
      inv.username?.toLowerCase().includes(term) ||
      inv.email?.toLowerCase().includes(term) ||
      inv.currentPlan?.toLowerCase().includes(term)
    );
  });

  const sortedInvestors = [...filteredInvestors].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "plan") {
      comparison = (a.currentPlan || "").localeCompare(b.currentPlan || "");
    } else if (sortBy === "registration") {
      comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    } else if (sortBy === "expiry") {
      const expiryA = new Date(a.planPurchaseDate || a.createdAt || 0).getTime();
      const expiryB = new Date(b.planPurchaseDate || b.createdAt || 0).getTime();
      comparison = expiryA - expiryB;
    } else if (sortBy === "balance") {
      const totalA = (a.depositBalance || 0) + (a.referralBalance || 0) + (a.taskBalance || 0);
      const totalB = (b.depositBalance || 0) + (b.referralBalance || 0) + (b.taskBalance || 0);
      comparison = totalA - totalB;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading investors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 px-2">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active Investors</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Investors with active plans</p>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 px-2">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search Name, Username, Email, Plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-6 rounded-2xl border border-slate-100 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-full">
            <Filter className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Sort:</span>
          </div>
          {[
            { id: "plan", label: "Plan" },
            { id: "registration", label: "Joined" },
            { id: "expiry", label: "Expiry" },
            { id: "balance", label: "Balance" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => {
                if (sortBy === s.id) {
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                } else {
                  setSortBy(s.id as any);
                  setSortOrder("desc");
                }
              }}
              className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                sortBy === s.id 
                  ? "bg-blue-600 border-blue-600 text-white shadow-blue-light" 
                  : "bg-white border-slate-100 text-slate-400"
              }`}
            >
              {s.label}
              {sortBy === s.id && (
                sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-4 px-2">
        {sortedInvestors.map((inv, idx) => {
          const planData = plans.find(p => p.name === inv.currentPlan);
          const expiry = calculateExpiry(inv.planPurchaseDate || inv.createdAt);
          
          return (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-5 group"
            >
              {/* Identity */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors border border-blue-100">
                    {inv.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                      {inv.firstName} {inv.lastName}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">@{inv.username}</p>
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-1.5 border ${
                  inv.status === 'Suspended' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'
                }`}>
                  {inv.status === 'Suspended' ? <ShieldAlert className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                  {inv.status || 'Active'}
                </div>
              </div>

              {/* Plan Detail */}
              <div className="p-5 rounded-2xl bg-blue-600 text-white relative overflow-hidden shadow-lg shadow-blue-100">
                <div className="relative z-10 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest mb-1">Active Plan</p>
                      <h5 className="text-base font-bold tracking-tight">{inv.currentPlan}</h5>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest mb-1">Plan Value</p>
                      <p className="text-[11px] font-bold">{formatNaira(planData?.price || 0)}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest mb-0.5">Purchase Date</p>
                      <p className="text-[10px] font-medium">{inv.planPurchaseDate ? new Date(inv.planPurchaseDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest mb-0.5">Plan Expiry</p>
                      <p className="text-[10px] font-medium">{expiry.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 rounded-full w-fit">
                    <Calendar className="w-2.5 h-2.5" />
                    <span className="text-[8px] font-bold uppercase tracking-widest">{expiry.days} Days Left</span>
                  </div>
                </div>
              </div>

              {/* Balances Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[7px] font-bold text-slate-400 uppercase mb-0.5">Deposit</p>
                  <p className="text-[9px] font-bold text-slate-900 truncate">{formatNaira(inv.depositBalance)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[7px] font-bold text-slate-400 uppercase mb-0.5">Referral</p>
                  <p className="text-[9px] font-bold text-emerald-600 truncate">{formatNaira(inv.referralBalance)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[7px] font-bold text-slate-400 uppercase mb-0.5">Comm.</p>
                  <p className="text-[9px] font-bold text-amber-600 truncate">{formatNaira(inv.taskBalance)}</p>
                </div>
              </div>

              {/* Footer Audit */}
              <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-slate-300" />
                  <span>Joined: {new Date(inv.createdAt).toLocaleDateString()}</span>
                </div>
                <span className="font-mono text-[8px] opacity-60">ID: {inv.id.slice(0, 8)}</span>
              </div>
            </motion.div>
          );
        })}

        {sortedInvestors.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
              <Search className="w-10 h-10" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No matching investors found</p>
          </div>
        )}
      </div>
    </div>
  );
}
