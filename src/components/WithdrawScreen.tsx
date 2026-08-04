import React, { useState, useEffect } from "react";
import { doc, collection, query, orderBy, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { ArrowLeft, AlertTriangle, Landmark, Loader2, ArrowUpRight, Sparkles, UserPlus, Wallet, Clock, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useGlobalSettings } from "../hooks/useGlobalSettings";

interface WithdrawScreenProps {
  username: string;
  taskBalance: number;
  referralBalance: number;
  currentPlan: string;
  initialWallet?: "commission" | "referral";
  onBack: () => void;
}

interface PayoutRecord {
  id: string;
  amount: number;
  accountNumber: string;
  bankName?: string;
  timestamp: string;
  status: string;
}

export default function WithdrawScreen({
  username,
  taskBalance,
  referralBalance,
  currentPlan,
  initialWallet,
  onBack,
}: WithdrawScreenProps) {
  const [activeWallet, setActiveWallet] = useState<"commission" | "referral">(initialWallet || "commission");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState("Access Bank");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { settings } = useGlobalSettings();

  const isCommissionPortalOpen = settings?.portals?.commissionWithdrawal !== false;
  const isReferralPortalOpen = settings?.portals?.referralWithdrawal !== false;
  const minWithdrawal = activeWallet === "commission" 
    ? (settings?.minWithdrawalCommission ?? 1500)
    : (settings?.minWithdrawalReferral ?? 1000);

  const isCurrentPortalOpen = activeWallet === "commission" ? isCommissionPortalOpen : isReferralPortalOpen;
  
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
// ... (keep the rest of the component state/logic)

  const banks = [
    "Access Bank",
    "Guaranty Trust Bank (GTB)",
    "Zenith Bank",
    "United Bank for Africa (UBA)",
    "First Bank of Nigeria",
    "Kuda Bank",
    "OPay",
    "Moniepoint Microfinance Bank",
    "Palmpay",
    "Wema Bank"
  ];

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!username) return;
    
    setLoadingHistory(true);
    const payoutsRef = collection(db, "users", username, "payouts");
    const q = query(payoutsRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PayoutRecord, "id">),
        }));
        setPayouts(list);
        setLoadingHistory(false);
      },
      (err) => {
        console.error("Payout history fetch error:", err);
        setLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, [username]);

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      showToast("error", "Please enter a valid amount.");
      return;
    }

    if (!accountNumber || accountNumber.trim().length !== 10) {
      showToast("error", "Invalid Account Number.");
      return;
    }

    if (!accountName || accountName.trim().length < 3) {
      showToast("error", "Invalid Account Name.");
      return;
    }

    if (!isCurrentPortalOpen) {
      showToast("error", "This withdrawal portal is currently closed.");
      return;
    }

    if (withdrawAmount < minWithdrawal) {
      showToast("error", `Min withdrawal is ₦${minWithdrawal.toLocaleString()}`);
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(db, "users", username);
      
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("Account not found.");

        const data = userDoc.data();
        const liveReferralBalance = data.referralBalance ?? 0;
        const liveTaskBalance = data.taskBalance ?? 0;
        
        const activeBalance = activeWallet === "commission" ? liveTaskBalance : liveReferralBalance;
        const balanceField = activeWallet === "commission" ? "taskBalance" : "referralBalance";
        const typeLabel = activeWallet === "commission" ? "Commission" : "Referral";

        if (activeBalance < withdrawAmount) {
          throw new Error("Insufficient balance");
        }

        transaction.update(userRef, {
          [balanceField]: activeBalance - withdrawAmount,
        });

        const newPayoutRef = doc(collection(db, "users", username, "payouts"));
        const rootWithdrawalRef = doc(db, "withdrawals", newPayoutRef.id);
        const timestampStr = new Date().toISOString();

        const withdrawalData = {
          id: newPayoutRef.id,
          amount: withdrawAmount,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          bankName: selectedBank,
          timestamp: timestampStr,
          status: "Pending",
          type: typeLabel,
          username: username,
        };

        transaction.set(newPayoutRef, withdrawalData);
        transaction.set(rootWithdrawalRef, withdrawalData);
      });

      showToast("success", `${formatNaira(withdrawAmount)} requested!`);
      setAmount("");
      setAccountNumber("");
      setAccountName("");
    } catch (err: any) {
      showToast("error", err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white overflow-hidden relative h-full font-sans">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-premium border flex items-center gap-2.5 w-[90%] max-w-[340px] ${
              toast.type === "success" ? "bg-white border-blue-100 text-blue-700" : "bg-white border-red-100 text-red-600"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === "success" ? "bg-blue-500" : "bg-red-500"}`} />
            <span className="text-[13px] font-medium leading-tight">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-6 pt-10 pb-4 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Withdraw Funds</p>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Withdrawals</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-12 space-y-8 custom-scrollbar">
        {/* Wallet Selection */}
        <div className="p-1 bg-slate-50 rounded-2xl flex gap-1 border border-slate-100">
          <button
            onClick={() => setActiveWallet("commission")}
            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${
              activeWallet === "commission" ? "bg-white text-blue-600 shadow-sm border border-blue-50" : "text-slate-400"
            }`}
          >
            Commission
          </button>
          <button
            onClick={() => setActiveWallet("referral")}
            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${
              activeWallet === "referral" ? "bg-white text-blue-600 shadow-sm border border-blue-50" : "text-slate-400"
            }`}
          >
            Referral
          </button>
        </div>

        {/* Balance Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative"
        >
          <div className={`p-8 rounded-[40px] text-white relative overflow-hidden shadow-blue-light transition-all duration-500 ${activeWallet === 'commission' ? 'fintech-gradient' : 'bg-slate-900'} ${!isCurrentPortalOpen ? 'grayscale opacity-80' : ''}`}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl opacity-40"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xl border border-white/20 shadow-lg">
                  {activeWallet === 'commission' ? <Wallet className="w-6 h-6 text-white" /> : <UserPlus className="w-6 h-6 text-white" />}
                </div>
                <div className="px-3 py-1 bg-white/10 rounded-full backdrop-blur-md border border-white/20">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/90">Wallet Type</p>
                </div>
              </div>
              
              <p className="text-[10px] font-medium uppercase tracking-widest opacity-60 mb-2">Available Balance</p>
              <h3 className="text-3xl font-bold mb-8 tracking-tight">
                {formatNaira(activeWallet === "commission" ? taskBalance : referralBalance)}
              </h3>
              
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/10 border border-white/10 w-fit text-[10px] font-medium uppercase tracking-widest backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-blue-300" />
                Current: Tier {currentPlan}
              </div>
            </div>
          </div>
          
          {!isCurrentPortalOpen && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/30 backdrop-blur-[2px] rounded-[40px]">
               <div className="flex items-center gap-3 px-6 py-3 bg-red-600 text-white rounded-full shadow-2xl border border-red-500/30">
                <Lock className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Withdrawals Restricted</span>
              </div>
            </div>
          )}
        </motion.div>        {/* Withdrawal Form */}
        <form onSubmit={handleWithdrawalSubmit} className="space-y-8">
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-4">Bank Details</h4>
            
            <div className="space-y-6 p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-3">Select Bank</label>
                <div className="relative group">
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full h-14 px-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none shadow-sm"
                  >
                    {banks.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-3">Account Number</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="Enter 10-digit account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-14 px-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-3">Account Name</label>
                <input
                  type="text"
                  placeholder="Enter account name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full h-14 px-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-3">Amount to Withdraw</label>
                <input
                  type="number"
                  placeholder={`Minimum ${formatNaira(minWithdrawal)}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!isCurrentPortalOpen}
                  className="w-full h-14 px-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-600 focus:bg-white transition-all disabled:opacity-50 shadow-sm"
                  min={minWithdrawal}
                  required
                />
              </div>
            </div>
          </div>

          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="p-4 rounded-2xl bg-blue-50 border border-blue-100/50 flex gap-3 items-start"
          >
            <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-900 font-medium leading-relaxed">
              <span className="font-bold uppercase tracking-widest text-blue-600 block mb-0.5">Please Note:</span> Ensure your bank details are correct. Withdrawals are typically processed within 24 hours.
            </p>
          </motion.div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={loading}
            className="w-full py-5 rounded-[24px] font-bold text-sm uppercase tracking-widest bg-slate-900 text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <Landmark className="w-5 h-5" /> Withdraw Funds </>}
          </motion.button>
        </form>

        {/* History */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-4">Withdrawal History</h4>
            {payouts.length > 0 && <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest px-2.5 py-1 bg-blue-50 rounded-full border border-blue-100">{payouts.length} Withdrawals</span>}
          </div>
          
          {loadingHistory ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
          ) : payouts.length === 0 ? (
            <div className="py-20 text-center rounded-[32px] border border-dashed border-slate-200 bg-slate-50/20">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No withdrawal history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payouts.map((record) => (
                <motion.div 
                  key={record.id} 
                  whileHover={{ x: 3 }}
                  className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between shadow-sm hover:border-blue-100 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 tracking-tight">{formatNaira(record.amount)}</h4>
                      <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">{record.bankName} • {record.accountNumber.slice(-4).padStart(10, '*')}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${
                    record.status.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    record.status.toLowerCase() === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                    'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm shadow-emerald-50'
                  }`}>
                    {record.status}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
