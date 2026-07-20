import React, { useState, useEffect } from "react";
import { doc, collection, query, orderBy, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { ArrowLeft, AlertCircle, AlertTriangle, ChevronRight, Landmark, Loader2, Coins, ArrowUpRight, Sparkles, Check, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WithdrawScreenProps {
  username: string;
  taskBalance: number;
  referralBalance: number;
  currentPlan: string;
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
  onBack,
}: WithdrawScreenProps) {
  const [activeWallet, setActiveWallet] = useState<"campaign" | "commission">("campaign");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState("Access Bank");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Real-time payouts list
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

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
      minimumFractionDigits: 2,
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

  // Real-time payout transaction sync
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

  // Handle Withdrawal Submission (with live Firestore check)
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (!accountNumber || accountNumber.trim().length !== 10) {
      setError("Please enter a valid 10-digit Account Number.");
      return;
    }

    if (!accountName || accountName.trim().length < 3) {
      setError("Please enter a valid Account Name.");
      return;
    }

    if (withdrawAmount < 1000) {
      setError("Minimum withdrawal on commission is ₦1,000");
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(db, "users", username);
      
      // Execute as a strict Firestore Transaction to ensure non-cached freshness
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User account was not found.");
        }

        const data = userDoc.data();
        const liveReferralBalance = data.referralBalance ?? 0;
        const liveTaskBalance = data.taskBalance ?? 0;
        
        const activeBalance = activeWallet === "campaign" ? liveTaskBalance : liveReferralBalance;
        const balanceField = activeWallet === "campaign" ? "taskBalance" : "referralBalance";
        const typeLabel = activeWallet === "campaign" ? "Task Balance" : "Referral Balance";

        // Validation against actual live document on the cloud
        if (activeBalance <= 0 || activeBalance < withdrawAmount) {
          throw new Error("Insufficient balance");
        }

        console.log(`[Withdrawal] Requesting ${withdrawAmount} from ${activeWallet} wallet (${balanceField}). Current: ${activeBalance}`);

        // Deduct from the selected balance directly
        transaction.update(userRef, {
          [balanceField]: activeBalance - withdrawAmount,
        });

        // Add payout transaction to the user's payouts sub-collection with "Pending" status
        const newPayoutRef = doc(collection(db, "users", username, "payouts"));
        const rootWithdrawalRef = doc(db, "withdrawals", newPayoutRef.id);

        const timestampStr = new Date().toISOString();

        transaction.set(newPayoutRef, {
          id: newPayoutRef.id,
          amount: withdrawAmount,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          bankName: selectedBank,
          timestamp: timestampStr,
          status: "Pending",
          type: typeLabel, // Record which wallet was used
        });

        // Also add to the root withdrawals queue for admin approval
        transaction.set(rootWithdrawalRef, {
          id: newPayoutRef.id,
          username: username,
          email: data.email || null,
          amount: withdrawAmount,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          bankName: selectedBank,
          timestamp: timestampStr,
          status: "pending",
          type: typeLabel,
        });
      });

      console.log(`[Withdrawal] Successfully requested withdrawal from ${activeWallet} wallet.`);
      setSuccess(`₦${withdrawAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} withdrawal requested successfully! Status: Pending Approval.`);
      setAmount("");
      setAccountNumber("");
      setAccountName("");
    } catch (err: any) {
      console.error(err);
      if (err.message === "Insufficient balance") {
        setError("Insufficient balance");
      } else {
        setError(err.message || "An error occurred while processing your withdrawal.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-10 bg-white overflow-y-auto">
      {/* Toast Notification for errors or success */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-12 left-1/2 -translate-x-1/2 z-100 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 w-[90%] max-w-[340px] ${
              success
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {success ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="text-xs font-semibold leading-tight">{success || error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-4 bg-white border-b border-[#8c6239]/10">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-[#f4eee1] hover:bg-[#ebdcb9] border border-[#8c6239]/10 text-[#3d2314] transition-all cursor-pointer flex items-center justify-center active:scale-95"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4 text-[#8c6239]" />
        </button>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#8c6239]/80 font-display">
            Withdraw funds
          </p>
          <h2 className="text-sm font-bold text-[#3d2314]">
            Get paid to your linked bank account
          </h2>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-5">
        {/* Wallet Toggle Tabs */}
        <div className="p-1 bg-[#f4eee1] rounded-2xl flex gap-1.5 border border-[#8c6239]/10">
          <button
            onClick={() => {
              setActiveWallet("campaign");
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer ${
              activeWallet === "campaign"
                ? "bg-[#3d2314] text-white shadow-md"
                : "text-[#3d2314]/70 hover:text-[#3d2314]"
            }`}
          >
            Campaign wallet
          </button>
          <button
            onClick={() => {
              setActiveWallet("commission");
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer ${
              activeWallet === "commission"
                ? "bg-[#3d2314] text-white shadow-md"
                : "text-[#3d2314]/70 hover:text-[#3d2314]"
            }`}
          >
            Commission wallet
          </button>
        </div>

        {/* Dynamic Balance Display */}
        <div className="relative overflow-hidden rounded-2xl card-luxury-3d p-6 border border-[#dfb04d]/20 text-white shadow-premium-3d select-none">
          {/* Glowing Ambience Backdrop */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#dfb04d]/10 rounded-full blur-2xl"></div>
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-[#dfb04d]/90 font-display flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#dfb04d]" />
              {activeWallet === "campaign" ? "Campaign Revenue" : "Commission Reserve"}
            </span>
            <span className="text-[8px] px-2 py-0.5 bg-[#dfb04d]/20 border border-[#dfb04d]/30 rounded-full text-[#dfb04d] font-bold tracking-wide uppercase">
              Plan: {currentPlan || "None"}
            </span>
          </div>

          <p className="text-[10px] text-[#faf7f2]/60 uppercase tracking-widest">Available Balance</p>
          <h3 className="text-3xl font-extrabold font-mono tracking-tight text-[#fdfaf6] mt-0.5">
            {formatNaira(activeWallet === "campaign" ? taskBalance : referralBalance)}
          </h3>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-[#faf7f2]/60">
            <span>Authorized Holder: {username.toUpperCase()}</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Secure Live
            </span>
          </div>
        </div>

        {/* CAMPAIGN WALLET (Locked Mode) */}
        {activeWallet === "campaign" && (
          <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-amber-900 space-y-3.5 flex flex-col items-center text-center">
            <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Withdrawals unavailable
              </h4>
              <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                withdrawal open soon, will be notified in channel
              </p>
            </div>
          </div>
        )}

        {/* COMMISSION WALLET (Always Open Mode) */}
        {activeWallet === "commission" && (
          <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
            <div className="space-y-3.5 p-4 rounded-2xl bg-[#fdfaf6] border border-[#8c6239]/10">
              
              {/* Bank Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#3d2314] flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-[#8c6239]" />
                  Receiving Bank
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-[#8c6239]/20 bg-white text-xs font-semibold text-[#3d2314] focus:outline-none focus:border-[#3d2314] transition-all"
                >
                  {banks.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#3d2314] flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-[#8c6239]" />
                  Account Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  pattern="[0-9]*"
                  placeholder="Enter 10-digit Account Number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-11 px-3 rounded-xl border border-[#8c6239]/20 bg-white text-xs font-semibold text-[#3d2314] placeholder:text-neutral-400 focus:outline-none focus:border-[#3d2314] transition-all font-mono"
                  required
                />
              </div>

              {/* Account Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#3d2314] flex items-center gap-1">
                  <UserPlus className="w-3 h-3 text-[#8c6239]" />
                  Account Name
                </label>
                <input
                  type="text"
                  placeholder="Enter Full Account Name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-[#8c6239]/20 bg-white text-xs font-semibold text-[#3d2314] placeholder:text-neutral-400 focus:outline-none focus:border-[#3d2314] transition-all"
                  required
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#3d2314] flex items-center gap-1">
                  <Coins className="w-3 h-3 text-[#8c6239]" />
                  Withdrawal Amount (₦)
                </label>
                <input
                  type="number"
                  placeholder="Min. ₦1,000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-[#8c6239]/20 bg-white text-xs font-semibold text-[#3d2314] placeholder:text-neutral-400 focus:outline-none focus:border-[#3d2314] transition-all font-mono"
                  min={1000}
                  required
                />
              </div>

            </div>

            {/* Warning Message */}
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-red-800 uppercase tracking-tight">Warning: Double-Check Details</p>
                <p className="text-[10px] text-red-700 leading-relaxed font-medium">
                  Please re-check your bank details carefully. Payments will be paid strictly to the account name and number listed above. Kudigrid is not responsible for errors in provided details.
                </p>
              </div>
            </div>

            {/* Premium 3D Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-[#d4a017] to-[#b4860f] hover:brightness-110 text-[#2b180d] transition-all duration-300 transform active:scale-[0.98] shadow-[0_5px_15px_rgba(212,160,23,0.3)] border-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#2b180d]" />
                  Processing Payout...
                </>
              ) : (
                <>
                  <Landmark className="w-4 h-4 text-[#2b180d]" />
                  Withdraw funds
                </>
              )}
            </button>
          </form>
        )}

        {/* WITHDRAWAL HISTORY PANEL */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#3d2314] pl-1">
            Recent payouts
          </h3>

          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-6 text-[#8c6239]/60">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-[10px] font-semibold mt-1">Syncing payout ledger...</p>
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-[#8c6239]/15 text-center text-[#8c6239]/60">
              <p className="text-xs font-medium">No previous payouts found</p>
              <p className="text-[10px]">Your completed withdrawals will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {payouts.map((record) => (
                <div
                  key={record.id}
                  className="p-3.5 bg-[#fdfaf6] border border-[#8c6239]/10 rounded-2xl flex items-center justify-between transition-all hover:bg-[#fcf8f1] active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold font-mono text-[#3d2314]">
                        {formatNaira(record.amount)}
                      </h4>
                      <p className="text-[9px] text-[#8c6239]/80 font-medium">
                        {record.bankName || "Linked Bank"} • {record.accountNumber}
                      </p>
                      <p className="text-[8px] text-neutral-400 font-medium">
                        {formatDate(record.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide border ${
                      record.status === "Pending" || record.status === "pending"
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : record.status === "Rejected" || record.status === "rejected"
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-emerald-50 border-emerald-100 text-emerald-700"
                    }`}>
                      {record.status}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
