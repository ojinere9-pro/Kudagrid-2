import React, { useState, useEffect } from "react";
import { doc, onSnapshot, updateDoc, increment, collection, query, where, getDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { 
  ArrowUpRight, ArrowDownLeft, Award, Sparkles, Copy, Check, LogOut, 
  ChevronRight, Phone, Wifi, Mail, Zap, X, CreditCard, Banknote, ShieldAlert, AlertCircle,
  Clock, CheckCircle, Smartphone, UserPlus
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
  onNavigateToWithdraw: () => void;
  onNavigateToTasks: () => void;
  onNavigateToAdmin?: () => void;
  email?: string;
  initialTab?: "home" | "referral" | "profile";
  onTabChange?: (tab: "home" | "referral" | "profile") => void;
}

interface Transaction {
  id: string;
  type: "Upgrade" | "Withdrawal" | "Airtime" | "Data" | "Bulk SMS" | "Boost";
  amount: number;
  status: "Success" | "Pending";
  date: string;
  details?: string;
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
  onTabChange,
}: DashboardScreenProps) {
  // 2-Slide Balance Mode carousel index (0: Referral Balance, 1: Task Balance)
  const [currentSlide, setCurrentSlide] = useState(0);

  const [currentDomain, setCurrentDomain] = useState("https://kudigrid.com");
  const [showTelegramModal, setShowTelegramModal] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentDomain(window.location.origin + window.location.pathname);
    }
  }, []);

  // App tabs: "home" | "referral" | "profile"
  const [activeTab, setActiveTab] = useState<"home" | "referral" | "profile">(initialTab || "home");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab: "home" | "referral" | "profile") => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Referral Metrics states and Firestore subscription
  const [referredUsersCount, setReferredUsersCount] = useState(0);
  const [referralTxList, setReferralTxList] = useState<any[]>([]);
  const [loadingReferralStats, setLoadingReferralStats] = useState(true);

  useEffect(() => {
    if (!username) return;

    setLoadingReferralStats(true);
    
    // 1. Fetch referred users count
    const usersQuery = query(collection(db, "users"), where("referredBy", "==", username));
    const unsubscribeUsers = onSnapshot(usersQuery, (snap) => {
      setReferredUsersCount(snap.size);
    }, (err) => {
      console.error("Error loading referred users:", err);
    });

    // 2. Fetch referral transactions history
    const txQuery = query(collection(db, "users", username, "referralTransactions"));
    const unsubscribeTx = onSnapshot(txQuery, (snap) => {
      const txs: any[] = [];
      snap.forEach((doc) => {
        txs.push({ id: doc.id, ...doc.data() });
      });
      // Sort by timestamp descending
      txs.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      setReferralTxList(txs);
      setLoadingReferralStats(false);
    }, (err) => {
      console.error("Error loading referral transactions:", err);
      setLoadingReferralStats(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTx();
    };
  }, [username]);

  // Interactive drawer modals state
  const [activeModal, setActiveModal] = useState<
    "withdraw" | "airtime" | "data" | "bulksms" | "boost" | "unavailable" | "restricted" | null
  >(null);

  // Success screen after an action
  const [successReceipt, setSuccessReceipt] = useState<{
    title: string;
    amount: number;
    reference: string;
    details: string;
  } | null>(null);

  // Local transaction logging
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "TX-990112",
      type: "Upgrade",
      amount: 1000,
      status: "Success",
      date: "Just now",
      details: "Database sync"
    },
    {
      id: "TX-781923",
      type: "Boost",
      amount: 5000,
      status: "Success",
      date: "2 hours ago",
      details: "Luxury Tier active"
    }
  ]);

  // Form states
  const [copied, setCopied] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBank, setWithdrawBank] = useState("Access Bank");
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Services state
  const [airtimePhone, setAirtimePhone] = useState("");
  const [airtimeNetwork, setAirtimeNetwork] = useState("MTN");
  const [airtimeAmount, setAirtimeAmount] = useState("");

  const [dataPhone, setDataPhone] = useState("");
  const [dataNetwork, setDataNetwork] = useState("MTN");
  const [dataPlan, setDataPlan] = useState("1.5GB (30 Days) - ₦1,200");

  const [smsSender, setSmsSender] = useState("");
  const [smsRecipients, setSmsRecipients] = useState("");
  const [smsMessage, setSmsMessage] = useState("");

  // Trigger copy referral link
  const handleCopyReferral = () => {
    const currentDomain = window.location.origin + window.location.pathname;
    const referralLink = `${currentDomain}?ref=${username}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. "Upgrade" pill button is handled by onNavigateToUpgrade prop, bypassing previous legacy balance increment

  // 2. "Boost ⚡" action: Adds 5,000 to the deposit balance
  const handleBoost = async () => {
    setActionLoading(true);
    try {
      const userRef = doc(db, "users", username);
      await updateDoc(userRef, {
        depositBalance: increment(5000)
      });
      
      const newTx: Transaction = {
        id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        type: "Boost",
        amount: 5000,
        status: "Success",
        date: "Just now",
        details: "⚡ Turbo Boost Injection"
      };
      setTransactions(prev => [newTx, ...prev]);
      setActiveModal(null);

      setSuccessReceipt({
        title: "Turbo Boost Complete ⚡",
        amount: 5000,
        reference: newTx.id,
        details: "Bronze amplifier module triggered. Premium reserves added."
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. "Withdraw" action: Deducts amount from deposit balance using increment(-amount)
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amount = parseFloat(withdrawAmount);

    if (isNaN(amount) || amount <= 0) {
      setFormError("Enter a valid amount.");
      return;
    }

    if (depositBalance === null || depositBalance < amount) {
      setFormError("Insufficient deposit balance funds.");
      return;
    }

    if (!withdrawAccount || withdrawAccount.length < 10) {
      setFormError("Account number must be 10 digits.");
      return;
    }

    setActionLoading(true);
    try {
      const userRef = doc(db, "users", username);
      const userSnap = await getDoc(userRef);
      const email = userSnap.exists() ? (userSnap.data().email || null) : null;

      // Deduct/freeze deposit balance
      await updateDoc(userRef, {
        depositBalance: increment(-amount)
      });

      const txId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
      const timestampStr = new Date().toISOString();

      // Create a pending request in global withdrawals queue
      const rootWithdrawalRef = doc(db, "withdrawals", txId);
      await setDoc(rootWithdrawalRef, {
        id: txId,
        username: username,
        email: email,
        amount: amount,
        accountNumber: withdrawAccount.trim(),
        bankName: withdrawBank,
        timestamp: timestampStr,
        status: "pending",
        type: "Deposit Balance",
      });

      // Also save to user's local payouts subcollection
      const userPayoutRef = doc(db, "users", username, "payouts", txId);
      await setDoc(userPayoutRef, {
        id: txId,
        amount: amount,
        accountNumber: withdrawAccount.trim(),
        bankName: withdrawBank,
        timestamp: timestampStr,
        status: "Pending",
      });

      const newTx: Transaction = {
        id: txId,
        type: "Withdrawal",
        amount: amount,
        status: "Pending",
        date: "Just now",
        details: `${withdrawBank} (${withdrawAccount.slice(-4)})`
      };
      setTransactions(prev => [newTx, ...prev]);

      // Clear input fields & close modal
      setWithdrawAmount("");
      setWithdrawAccount("");
      setActiveModal(null);

      // Pop success receipt
      setSuccessReceipt({
        title: "Withdrawal Dispatched 💸",
        amount: amount,
        reference: txId,
        details: `Secured transit path mapped to ${withdrawBank} A/C ${withdrawAccount}. Pending administrator approval.`
      });
    } catch (err) {
      console.error(err);
      setFormError("Transaction failed. Try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. "Airtime" action
  const handleAirtimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amount = parseFloat(airtimeAmount);

    if (isNaN(amount) || amount <= 0) {
      setFormError("Enter a valid amount.");
      return;
    }

    if (depositBalance === null || depositBalance < amount) {
      setFormError("Insufficient deposit balance funds.");
      return;
    }

    if (!airtimePhone || airtimePhone.length < 10) {
      setFormError("Enter a valid phone number.");
      return;
    }

    setActionLoading(true);
    try {
      const userRef = doc(db, "users", username);
      await updateDoc(userRef, {
        depositBalance: increment(-amount)
      });

      const newTx: Transaction = {
        id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        type: "Airtime",
        amount: amount,
        status: "Success",
        date: "Just now",
        details: `${airtimeNetwork} (${airtimePhone})`
      };
      setTransactions(prev => [newTx, ...prev]);

      setAirtimeAmount("");
      setAirtimePhone("");
      setActiveModal(null);

      setSuccessReceipt({
        title: "Airtime Transferred 📱",
        amount: amount,
        reference: newTx.id,
        details: `Dispensed to ${airtimeNetwork} line ${airtimePhone} successfully.`
      });
    } catch (err) {
      console.error(err);
      setFormError("Transaction failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. "Data" action
  const handleDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Parse cost from plan string
    let cost = 1200;
    if (dataPlan.includes("2,200")) cost = 2200;
    if (dataPlan.includes("5,000")) cost = 5000;
    if (dataPlan.includes("10,000")) cost = 10000;

    if (depositBalance === null || depositBalance < cost) {
      setFormError("Insufficient deposit balance funds.");
      return;
    }

    if (!dataPhone || dataPhone.length < 10) {
      setFormError("Enter a valid phone number.");
      return;
    }

    setActionLoading(true);
    try {
      const userRef = doc(db, "users", username);
      await updateDoc(userRef, {
        depositBalance: increment(-cost)
      });

      const newTx: Transaction = {
        id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        type: "Data",
        amount: cost,
        status: "Success",
        date: "Just now",
        details: `${dataNetwork} - ${dataPlan.split(" - ")[0]} to ${dataPhone}`
      };
      setTransactions(prev => [newTx, ...prev]);

      setDataPhone("");
      setActiveModal(null);

      setSuccessReceipt({
        title: "Data Plan Activated 🌐",
        amount: cost,
        reference: newTx.id,
        details: `Supercharged high-speed bandwidth delivered to ${dataPhone}.`
      });
    } catch (err) {
      console.error(err);
      setFormError("Transaction failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. "Bulk SMS" action
  const handleSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!smsSender || !smsRecipients || !smsMessage) {
      setFormError("Please fill all SMS parameters.");
      return;
    }

    const recipientCount = smsRecipients.split(",").filter(r => r.trim()).length;
    const smsCost = recipientCount * 15; // ₦15 per SMS

    if (depositBalance === null || depositBalance < smsCost) {
      setFormError(`Insufficient deposit balance. Required: ₦${smsCost}`);
      return;
    }

    setActionLoading(true);
    try {
      const userRef = doc(db, "users", username);
      await updateDoc(userRef, {
        depositBalance: increment(-smsCost)
      });

      const newTx: Transaction = {
        id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        type: "Bulk SMS",
        amount: smsCost,
        status: "Success",
        date: "Just now",
        details: `Sender ID: "${smsSender}" to ${recipientCount} recipients`
      };
      setTransactions(prev => [newTx, ...prev]);

      setSmsSender("");
      setSmsRecipients("");
      setSmsMessage("");
      setActiveModal(null);

      setSuccessReceipt({
        title: "Bulk SMS Dispatched ✉️",
        amount: smsCost,
        reference: newTx.id,
        details: `Propagated message through secure routing lines for ${recipientCount} users.`
      });
    } catch (err) {
      console.error(err);
      setFormError("SMS Dispatch failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Format Nigerian Naira Helper
  const formatNaira = (val: number | null) => {
    if (val === null) return "₦ --.--";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="flex flex-col flex-1 pb-24">
      {/* Top Bar Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between bg-[#faf7f2] border-b border-[#8c6239]/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3d2314] to-[#8c6239] flex items-center justify-center border border-[#dfb04d]/30 shadow-md">
            <span className="text-xs font-bold text-[#dfb04d] font-display">KG</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#8c6239]/80 font-display">
              Vanguard Portal
            </p>
            <h2 className="text-sm font-bold text-[#3d2314] flex items-center gap-1.5">
              <span>{username}</span>
              <Award className="w-3.5 h-3.5 text-[#dfb04d]" />
            </h2>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="p-2 rounded-xl bg-[#f4eee1] hover:bg-[#ebdcb9] border border-[#8c6239]/10 text-[#3d2314] transition-all cursor-pointer"
          title="Exit Portal"
        >
          <LogOut className="w-4 h-4 text-[#8c6239]" />
        </button>
      </div>

      {/* Primary Tab Swapper */}
      <div className="flex-1 overflow-y-auto px-5 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-4 border-[#8c6239] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[#8c6239] font-medium font-display uppercase tracking-widest">
              Connecting Vault...
            </p>
          </div>
        ) : (
          <>
            {/* TABS VIEW */}
            {activeTab === "home" && (
              <div className="space-y-6">
                
                {/* 1. Main Premium 3D Balance Card: 2-Slide Balance Mode */}
                <div 
                  onClick={() => setCurrentSlide(prev => (prev === 0 ? 1 : 0))}
                  className="relative overflow-hidden rounded-2xl card-luxury-3d p-6 border border-[#dfb04d]/30 text-white select-none cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-[0.99]"
                >
                  {/* Glowing Backdrops */}
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#dfb04d]/20 rounded-full blur-2xl"></div>
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[#8c6239]/30 rounded-full blur-xl"></div>
                  
                  {/* Gloss Highlight Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>

                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#dfb04d]/95 font-display flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#dfb04d]" />
                      {currentSlide === 0 ? "Referral Commission" : "Task Earnings"}
                    </span>
                    <span className="text-[8px] px-2.5 py-1 bg-[#dfb04d]/20 border border-[#dfb04d]/40 rounded-full text-[#dfb04d] font-bold tracking-wider uppercase font-display shadow-sm flex items-center gap-1">
                      <span>👑</span>
                      <span>Plan: {currentPlan || "None"}</span>
                    </span>
                  </div>

                  {/* Balance Display with Navigation Arrows */}
                  <div className="flex items-center justify-between py-2">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlide(prev => (prev === 0 ? 1 : 0));
                      }}
                      className="p-1 rounded-full bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                    >
                      <span className="text-sm font-bold">&lsaquo;</span>
                    </button>

                    <div className="text-center space-y-1 flex-1">
                      <p className="text-[9px] text-[#faf7f2]/60 uppercase tracking-widest">
                        {currentSlide === 0 ? "Commission Reserve" : "Campaign Revenue"}
                      </p>
                      <h3 className="text-3xl font-extrabold font-mono tracking-tight text-[#fdfaf6]">
                        {formatNaira(currentSlide === 0 ? referralBalance : taskBalance)}
                      </h3>
                    </div>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlide(prev => (prev === 0 ? 1 : 0));
                      }}
                      className="p-1 rounded-full bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                    >
                      <span className="text-sm font-bold">&rsaquo;</span>
                    </button>
                  </div>

                  {/* Bottom details with slide dots indicator */}
                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-[#faf7f2]/40 uppercase tracking-wider">Authorized Custodian</p>
                      <p className="text-xs font-semibold text-white tracking-wide">{username.toUpperCase()}</p>
                    </div>

                    {/* Dot indicators */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSlide === 0 ? "bg-[#dfb04d] scale-110 shadow-[0_0_8px_#dfb04d]" : "bg-white/30"}`}></div>
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSlide === 1 ? "bg-[#dfb04d] scale-110 shadow-[0_0_8px_#dfb04d]" : "bg-white/30"}`}></div>
                    </div>
                  </div>
                </div>

                {/* 2. Quick Actions: Withdraw & Upgrade */}
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    onClick={() => {
                      if (!currentPlan || currentPlan === "None") {
                        setActiveModal("restricted");
                      } else {
                        onNavigateToWithdraw();
                      }
                    }}
                    className="py-3 px-4 rounded-[14px] font-semibold text-[13px] bg-[#3d2314] hover:bg-[#2b180d] text-white transition-all duration-300 transform active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer border-none"
                  >
                    <ArrowDownLeft className="w-4 h-4 text-[#d4a017]" />
                    <span>Withdraw</span>
                  </button>

                  <button
                    onClick={onNavigateToUpgrade}
                    className="py-3 px-4 rounded-[14px] font-bold text-[13px] bg-gradient-to-r from-[#d4a017] to-[#b4860f] hover:brightness-110 text-[#2b180d] transition-all duration-300 transform active:scale-95 shadow-[0_4px_15px_rgba(212,160,23,0.4)] flex items-center justify-center gap-1.5 cursor-pointer border-none"
                  >
                    <span>Upgrade</span>
                    <span>👑</span>
                  </button>
                </div>

                {/* 3. Services Grid (aligned with Design HTML) */}
                <div>
                  <h4 className="text-[14px] uppercase tracking-[0.5px] font-extrabold text-[#3d2314] mt-6 mb-4 ml-1 font-sans">
                    Our Services
                  </h4>
                  <div className="grid grid-cols-4 gap-3.5 text-center">
                    {/* Airtime */}
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => {
                          setFormError(null);
                          setActiveModal("unavailable");
                        }}
                        className="w-14 h-14 rounded-full bg-[#fdf5e6] hover:scale-105 text-[#3d2314] border border-[#d4a017] transition-all duration-200 flex items-center justify-center shadow-sm active:scale-90 cursor-pointer"
                      >
                        <span className="text-xl">📱</span>
                      </button>
                      <span className="text-[10px] font-extrabold text-[#3d2314] text-center leading-tight">Airtime</span>
                    </div>

                    {/* Data */}
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => {
                          setFormError(null);
                          setActiveModal("unavailable");
                        }}
                        className="w-14 h-14 rounded-full bg-[#fdf5e6] hover:scale-105 text-[#3d2314] border border-[#d4a017] transition-all duration-200 flex items-center justify-center shadow-sm active:scale-90 cursor-pointer"
                      >
                        <span className="text-xl">🌐</span>
                      </button>
                      <span className="text-[10px] font-extrabold text-[#3d2314] text-center leading-tight">Data</span>
                    </div>

                    {/* Bulk SMS */}
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => {
                          setFormError(null);
                          setActiveModal("unavailable");
                        }}
                        className="w-14 h-14 rounded-full bg-[#fdf5e6] hover:scale-105 text-[#3d2314] border border-[#d4a017] transition-all duration-200 flex items-center justify-center shadow-sm active:scale-90 cursor-pointer"
                      >
                        <span className="text-xl">📩</span>
                      </button>
                      <span className="text-[10px] font-extrabold text-[#3d2314] text-center leading-tight">Bulk SMS</span>
                    </div>

                    {/* Boost */}
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => {
                          setFormError(null);
                          setActiveModal("unavailable");
                        }}
                        className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#3d2314] to-[#2b180d] hover:scale-105 text-[#dfb04d] border border-[#d4a017] transition-all duration-200 flex items-center justify-center shadow-sm active:scale-90 cursor-pointer"
                      >
                        <span className="text-xl">🚀</span>
                      </button>
                      <span className="text-[10px] font-extrabold text-[#3d2314] text-center leading-tight">Boost</span>
                    </div>
                  </div>
                </div>

                {/* 4. Referral Box */}
                <div>
                  <h4 className="text-[14px] uppercase tracking-[0.5px] font-extrabold text-[#3d2314] mt-6 mb-4 ml-1 font-sans">
                    Refer & Earn
                  </h4>
                  <div className="p-4 bg-[#f8f4f0] rounded-[20px] border-2 border-dashed border-[#d4a017] flex justify-between items-center">
                    <span className="text-[11px] text-[#3d2314] font-mono font-bold truncate max-w-[190px]">
                      {`${currentDomain.replace(/^https?:\/\//, "")}?ref=${username}`}
                    </span>
                    <button
                      onClick={handleCopyReferral}
                      className="bg-[#3d2314] text-[#d4a017] text-[9px] font-extrabold uppercase py-1 px-2.5 rounded-[8px] transition-all duration-300 active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 p-3 bg-[#faf7f2] border border-[#8c6239]/10 rounded-xl text-[10px] text-[#8c6239] font-medium font-display">
                  <span>🔒 Secure Real-time Firestore Sync Active</span>
                </div>
              </div>
            )}

            {/* REFERRAL TAB (Referral Dashboard) */}
            {activeTab === "referral" && (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#8c6239]/10 pb-3">
                  <h3 className="text-base font-black text-[#3d2314] font-display flex items-center gap-1.5">
                    <UserPlus className="w-4.5 h-4.5 text-[#d4a017]" />
                    <span>Referral Program</span>
                  </h3>
                  <span className="text-[9px] px-2.5 py-0.5 bg-[#d4a017]/20 border border-[#d4a017]/45 text-[#3d2314] font-extrabold rounded-full uppercase tracking-wider">
                    50% Comm.
                  </span>
                </div>

                {/* Info Alert Box */}
                <div className="p-3 bg-[#fdfaf6] border border-[#d4a017]/30 rounded-xl flex items-start gap-2.5">
                  <Sparkles className="w-4.5 h-4.5 text-[#d4a017] shrink-0 mt-0.5" />
                  <div className="text-[10px] text-[#3d2314]/80 leading-relaxed">
                    <span className="font-bold text-[#3d2314]">Instant 50% Bonus:</span> Invite your friends to upgrade. When they fund their deposit wallet, you instantly receive 50% of the deposit amount in your balance!
                  </div>
                </div>

                {/* Dynamic Referral Link Section */}
                <div className="bg-[#faf7f2] border border-[#8c6239]/10 rounded-2xl p-4 space-y-2.5">
                  <p className="text-[10px] font-bold text-[#8c6239] uppercase tracking-wider font-display">
                    Your Unique Invitation Link
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white border border-[#8c6239]/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#3d2314] select-all truncate font-mono">
                      {`${currentDomain}?ref=${username}`}
                    </div>
                    <button
                      onClick={handleCopyReferral}
                      className="p-2.5 rounded-xl bg-[#3d2314] text-[#dfb04d] hover:bg-[#2b180d] transition-all cursor-pointer flex items-center justify-center border border-[#dfb04d]/20 active:scale-95"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 2 Statistics Cards */}
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Card 1: Total Referred Users */}
                  <div className="p-4 bg-white border border-[#8c6239]/15 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[9px] text-[#8c6239] uppercase tracking-widest font-bold font-display">Referred Users</span>
                    <p className="text-2xl font-black text-[#3d2314] font-display">
                      {loadingReferralStats ? "..." : referredUsersCount}
                    </p>
                    <span className="text-[8.5px] text-[#8c6239]/60 font-medium">Joined using your link</span>
                  </div>

                  {/* Card 2: Total Referral Earnings */}
                  <div className="p-4 bg-white border border-[#8c6239]/15 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[9px] text-[#8c6239] uppercase tracking-widest font-bold font-display">Earnings (₦)</span>
                    <p className="text-xl font-black text-[#3d2314] font-display truncate">
                      ₦{(referralTxList.reduce((acc, curr) => acc + (curr.bonusAmount || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[8.5px] text-emerald-600 font-bold">50% Cash credited</span>
                  </div>
                </div>

                {/* Referral Commissions List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-[#3d2314] uppercase tracking-wider pl-1 font-display">
                    Commission Ledger Logs
                  </h4>

                  {loadingReferralStats ? (
                    <div className="text-center py-6 text-xs text-[#8c6239]">Loading commissions...</div>
                  ) : referralTxList.length === 0 ? (
                    <div className="text-center py-8 bg-[#fdfaf6] border border-[#8c6239]/10 rounded-xl text-xs text-[#8c6239]/60 font-medium italic">
                      No referral commissions recorded yet. Share your link above to begin earning!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {referralTxList.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-3 bg-[#fdfaf6] border border-[#8c6239]/10 rounded-xl flex items-center justify-between hover:bg-[#faf7f2] transition-all"
                        >
                          <div>
                            <p className="text-xs font-bold text-[#3d2314]">
                              User: {tx.referredUser}
                            </p>
                            <p className="text-[9px] text-[#8c6239]">
                              Deposited: ₦{tx.depositAmount?.toLocaleString()} • {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-emerald-600">
                              +₦{tx.bonusAmount?.toLocaleString()}
                            </p>
                            <span className="text-[8px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Credited
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-5">
                <div className="flex flex-col items-center text-center p-6 bg-[#f4eee1]/50 rounded-2xl border border-[#8c6239]/15">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#3d2314] to-[#8c6239] flex items-center justify-center border-2 border-[#dfb04d] shadow-lg mb-3">
                    <span className="text-xl font-bold text-[#dfb04d] font-display">
                      {username.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#3d2314] font-display">{username}</h3>
                  <p className="text-[10px] text-[#8c6239] font-medium uppercase tracking-wider mt-1">
                    KG-Gold Tier Member
                  </p>
                </div>

                <div className="p-1 bg-[#f4eee1] rounded-xl border border-[#8c6239]/10 space-y-px overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between p-3.5 bg-white text-xs text-[#3d2314] font-medium border-b border-[#faf7f2]">
                    <span className="text-[#8c6239]">Vault Status</span>
                    <span className="font-bold flex items-center gap-1.5 text-[#3d2314]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Verified VIP
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 bg-white text-xs text-[#3d2314] font-medium border-b border-[#faf7f2]">
                    <span className="text-[#8c6239]">Secured Reference ID</span>
                    <span className="font-mono font-bold">GRID-{username.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 bg-white text-xs text-[#3d2314] font-medium">
                    <span className="text-[#8c6239]">Network Node</span>
                    <span className="font-bold">Mainnet Cloud</span>
                  </div>
                </div>

                {onNavigateToAdmin && email === "marvellousu031@gmail.com" && (
                  <button
                    onClick={onNavigateToAdmin}
                    className="w-full py-3.5 px-4 rounded-xl border-2 border-purple-200 hover:bg-purple-50 text-purple-700 font-bold text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4 text-purple-600" />
                    <span>ENTER ADMIN PORTAL</span>
                  </button>
                )}

                <button
                  onClick={onLogout}
                  className="w-full py-3.5 px-4 rounded-xl border-2 border-red-200 hover:bg-red-50 text-red-700 font-semibold text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>DEAUTHORIZE DEVICE</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* FLOAT DRAWER MODALS (AnimatePresence Overlay) */}
      <AnimatePresence>
        {activeModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-[#2b180d] z-40"
            ></motion.div>

            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 inset-x-0 bg-[#fdfaf6] rounded-t-3xl border-t border-[#dfb04d]/40 z-50 p-6 shadow-[0_-15px_30px_rgba(43,24,13,0.15)] flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#8c6239]/15">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#f4eee1] flex items-center justify-center border border-[#8c6239]/20">
                    {activeModal === "withdraw" && <Banknote className="w-4.5 h-4.5 text-[#3d2314]" />}
                    {activeModal === "airtime" && <Phone className="w-4.5 h-4.5 text-[#8c6239]" />}
                    {activeModal === "data" && <Wifi className="w-4.5 h-4.5 text-[#8c6239]" />}
                    {activeModal === "bulksms" && <Mail className="w-4.5 h-4.5 text-[#8c6239]" />}
                    {activeModal === "boost" && <Zap className="w-4.5 h-4.5 text-[#dfb04d]" />}
                    {activeModal === "unavailable" && <AlertCircle className="w-4.5 h-4.5 text-amber-600" />}
                    {activeModal === "restricted" && <ShieldAlert className="w-4.5 h-4.5 text-red-600" />}
                  </div>
                  <h3 className="text-sm font-extrabold text-[#3d2314] uppercase tracking-wider font-display">
                    {activeModal === "withdraw" && "Request Withdrawal"}
                    {activeModal === "airtime" && "Buy Airtime Reserves"}
                    {activeModal === "data" && "Settle Data Plans"}
                    {activeModal === "bulksms" && "Broadcast Bulk SMS"}
                    {activeModal === "boost" && "Trigger Power Boost"}
                    {activeModal === "unavailable" && "Notice"}
                    {activeModal === "restricted" && "Access Denied"}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 rounded-full bg-[#f4eee1] text-[#3d2314]/80 hover:text-[#3d2314] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pt-4 space-y-4">
                
                {/* --- 0. UNAVAILABLE NOTICE --- */}
                {activeModal === "unavailable" && (
                  <div className="py-8 px-4 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100 mb-2">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h4 className="text-base font-bold text-[#3d2314]">Service Unavailable</h4>
                    <p className="text-sm text-[#8c6239] leading-relaxed font-medium">
                      Not available at the moment. You will be informed in the channel when available.
                    </p>
                    <button
                      onClick={() => setActiveModal(null)}
                      className="mt-6 w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider bg-[#3d2314] text-white hover:bg-[#2b180d] transition-all shadow-md cursor-pointer"
                    >
                      Got it
                    </button>
                  </div>
                )}

                {/* --- 0.1 RESTRICTION NOTICE --- */}
                {activeModal === "restricted" && (
                  <div className="py-8 px-4 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100 mb-2">
                      <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <h4 className="text-base font-bold text-[#3d2314]">Withdrawal Restricted</h4>
                    <p className="text-sm text-[#8c6239] leading-relaxed font-medium">
                      You must purchase a plan to withdraw your balance or referral bonuses.
                    </p>
                    <button
                      onClick={() => setActiveModal(null)}
                      className="mt-6 w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-all shadow-md cursor-pointer"
                    >
                      Understood
                    </button>
                  </div>
                )}
                
                {/* --- 1. WITHDRAW FORM --- */}
                {activeModal === "withdraw" && (
                  <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#3d2314] uppercase tracking-wider mb-1">
                        Destination Bank
                      </label>
                      <select
                        value={withdrawBank}
                        onChange={(e) => setWithdrawBank(e.target.value)}
                        className="w-full p-3 bg-white border border-[#8c6239]/20 rounded-xl text-xs font-semibold text-[#3d2314] focus:outline-none focus:ring-1 focus:ring-[#8c6239]"
                      >
                        <option>Access Bank</option>
                        <option>Guaranty Trust Bank</option>
                        <option>United Bank for Africa</option>
                        <option>Zenith Bank</option>
                        <option>Kuda Microfinance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#3d2314] uppercase tracking-wider mb-1">
                        10-Digit Account Number
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={withdrawAccount}
                        onChange={(e) => setWithdrawAccount(e.target.value.replace(/\D/g, ""))}
                        placeholder="0123456789"
                        required
                        className="w-full p-3 bg-white border border-[#8c6239]/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8c6239]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#3d2314] uppercase tracking-wider mb-1">
                        Amount to Transfer (₦)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-[#8c6239]">
                          ₦
                        </span>
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          required
                          className="w-full pl-7 pr-4 p-3 bg-white border border-[#8c6239]/20 rounded-xl text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-[#8c6239] text-[#3d2314]"
                        />
                      </div>
                    </div>

                    {formError && (
                      <p className="text-[11px] text-red-700 font-bold bg-red-50 p-2.5 rounded-lg border border-red-200">
                        ⚠️ {formError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-3.5 bg-[#3d2314] hover:bg-[#2b180d] text-white rounded-xl text-xs font-bold tracking-wider uppercase border border-[#dfb04d]/20 transition-all shadow-md cursor-pointer disabled:opacity-80"
                    >
                      {actionLoading ? "Processing..." : "Authorize Transit Outflow"}
                    </button>
                  </form>
                )}

                {/* --- 2. AIRTIME FORM --- */}
                {activeModal === "airtime" && (
                  <form onSubmit={handleAirtimeSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#3d2314] uppercase tracking-wider mb-1">
                        Carrier Service
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {["MTN", "Airtel", "Glo", "9mobile"].map((network) => (
                          <button
                            key={network}
                            type="button"
                            onClick={() => setAirtimeNetwork(network)}
                            className={`p-2 rounded-xl text-[10px] font-bold border transition-all ${
                              airtimeNetwork === network
                                ? "bg-[#3d2314] text-white border-[#3d2314]"
                                : "bg-white text-[#3d2314] border-[#8c6239]/20"
                            }`}
                          >
                            {network}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#3d2314] uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={airtimePhone}
                        onChange={(e) => setAirtimePhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="08031234567"
                        required
                        className="w-full p-3 bg-white border border-[#8c6239]/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8c6239]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#3d2314] uppercase tracking-wider mb-1">
                        Amount (₦)
                      </label>
                      <input
                        type="number"
                        value={airtimeAmount}
                        onChange={(e) => setAirtimeAmount(e.target.value)}
                        placeholder="₦100 - ₦50,000"
                        required
                        className="w-full p-3 bg-white border border-[#8c6239]/20 rounded-xl text-xs font-extrabold focus:outline-none"
                      />
                    </div>

                    {formError && (
                      <p className="text-[11px] text-red-700 font-bold bg-red-50 p-2.5 rounded-lg">
                        ⚠️ {formError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-3.5 bg-[#3d2314] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-80"
                    >
                      {actionLoading ? "Processing..." : "Purchase Airtime"}
                    </button>
                  </form>
                )}

                {/* --- 3. DATA FORM --- */}
                {activeModal === "data" && (
                  <form onSubmit={handleDataSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#3d2314] uppercase tracking-wider mb-1">
                        Carrier Service
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {["MTN", "Airtel", "Glo", "9mobile"].map((network) => (
                          <button
                            key={network}
                            type="button"
                            onClick={() => setDataNetwork(network)}
                            className={`p-2 rounded-xl text-[10px] font-bold border transition-all ${
                              dataNetwork === network
                                ? "bg-[#3d2314] text-white border-[#3d2314]"
                                : "bg-white text-[#3d2314] border-[#8c6239]/20"
                            }`}
                          >
                            {network}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#3d2314] uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={dataPhone}
                        onChange={(e) => setDataPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="08031234567"
                        required
                        className="w-full p-3 bg-white border border-[#8c6239]/20 rounded-xl text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#3d2314] uppercase tracking-wider mb-1">
                        Select Data Package
                      </label>
                      <select
                        value={dataPlan}
                        onChange={(e) => setDataPlan(e.target.value)}
                        className="w-full p-3 bg-white border border-[#8c6239]/20 rounded-xl text-xs font-semibold text-[#3d2314]"
                      >
                        <option>1.5GB (30 Days) - ₦1,200</option>
                        <option>3GB (30 Days) - ₦2,200</option>
                        <option>10GB (30 Days) - ₦5,000</option>
                        <option>24GB (30 Days) - ₦10,000</option>
                      </select>
                    </div>

                    {formError && (
                      <p className="text-[11px] text-red-700 font-bold bg-red-50 p-2.5 rounded-lg">
                        ⚠️ {formError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-3.5 bg-[#3d2314] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer"
                    >
                      {actionLoading ? "Deploying Bandwidth..." : "Settle Bundles"}
                    </button>
                  </form>
                )}

                {/* --- 4. BULK SMS FORM --- */}
                {activeModal === "bulksms" && (
                  <form onSubmit={handleSmsSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#3d2314] uppercase tracking-wider mb-1">
                        Custom Sender ID (Max 11 chars)
                      </label>
                      <input
                        type="text"
                        maxLength={11}
                        value={smsSender}
                        onChange={(e) => setSmsSender(e.target.value)}
                        placeholder="KUDIGRID"
                        required
                        className="w-full p-3 bg-white border border-[#8c6239]/20 rounded-xl text-xs font-bold text-[#3d2314]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#3d2314] uppercase tracking-wider mb-1">
                        Recipients (Comma separated)
                      </label>
                      <textarea
                        value={smsRecipients}
                        onChange={(e) => setSmsRecipients(e.target.value)}
                        placeholder="08031234567, 08029876543"
                        required
                        rows={2}
                        className="w-full p-3 bg-white border border-[#8c6239]/20 rounded-xl text-xs font-medium resize-none"
                      />
                      <p className="text-[8px] text-[#8c6239] mt-0.5 ml-1">Rate: ₦15 per SMS node transmission</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#3d2314] uppercase tracking-wider mb-1">
                        Message Content
                      </label>
                      <textarea
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                        placeholder="Enter premium broadcasting payload..."
                        required
                        rows={3}
                        className="w-full p-3 bg-white border border-[#8c6239]/20 rounded-xl text-xs font-medium resize-none"
                      />
                    </div>

                    {formError && (
                      <p className="text-[11px] text-red-700 font-bold bg-red-50 p-2.5 rounded-lg">
                        ⚠️ {formError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-3.5 bg-[#3d2314] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer"
                    >
                      {actionLoading ? "Broadcasting..." : "Broadcast Bulk SMS"}
                    </button>
                  </form>
                )}

                {/* --- 5. BOOST VIEW --- */}
                {activeModal === "boost" && (
                  <div className="space-y-5 text-center py-4">
                    <div className="relative inline-flex mb-2">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3d2314] to-[#dfb04d] flex items-center justify-center border border-[#dfb04d]/40 shadow-xl relative z-10 animate-bounce">
                        <Zap className="w-8 h-8 text-[#fdfaf6]" />
                      </div>
                      <div className="absolute top-0 left-0 w-16 h-16 bg-[#dfb04d]/30 rounded-2xl blur-md"></div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[#3d2314] font-display">
                        Bronze Wealth Amplifier Pack
                      </h4>
                      <p className="text-xs text-[#8c6239] px-4">
                        Add an instant luxury booster allocation of <span className="font-extrabold text-[#3d2314]">₦5,000.00</span> directly into your real-time database balance.
                      </p>
                    </div>

                    <div className="p-3 bg-[#f4eee1] rounded-xl border border-[#8c6239]/10 text-[10px] text-[#3d2314] font-medium flex items-center gap-1.5 justify-center">
                      <span>💎 Fully verified on the ledger instantaneously</span>
                    </div>

                    <button
                      onClick={handleBoost}
                      disabled={actionLoading}
                      className="w-full py-4 bg-gradient-to-r from-[#3d2314] to-[#2b180d] hover:from-[#2b180d] hover:to-[#1a0f08] border border-[#dfb04d]/50 text-[#dfb04d] font-bold rounded-xl text-xs uppercase tracking-widest shadow-premium-3d cursor-pointer"
                    >
                      {actionLoading ? "Deploying Amplifiers..." : "TRIGGER AMPLIFIER (+₦5,000)"}
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- PREMIUM RECEIPT SUCCESS MODAL (AnimatePresence Overlay) --- */}
      <AnimatePresence>
        {successReceipt && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#2b180d] z-50"
            ></motion.div>

            {/* Receipt Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="absolute inset-x-6 top-[20%] bg-white rounded-3xl border border-[#dfb04d]/40 z-55 p-6 shadow-2xl flex flex-col items-center text-center select-none"
            >
              <div className="w-14 h-14 bg-emerald-50 border-2 border-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>

              <h3 className="text-base font-extrabold text-[#3d2314] font-display">
                {successReceipt.title}
              </h3>
              <p className="text-[10px] text-[#8c6239] mt-1 uppercase tracking-widest font-semibold">
                Transaction Secured
              </p>

              <div className="w-full my-5 p-4 bg-[#fdfaf6] border border-[#8c6239]/15 rounded-2xl relative">
                {/* Visual receipt scissor pattern accents */}
                <div className="absolute top-1/2 -left-2 w-4 h-4 bg-white border-r border-[#8c6239]/15 rounded-full transform -translate-y-1/2"></div>
                <div className="absolute top-1/2 -right-2 w-4 h-4 bg-white border-l border-[#8c6239]/15 rounded-full transform -translate-y-1/2"></div>

                <p className="text-[9px] uppercase tracking-wider text-[#8c6239]">Amount Handled</p>
                <p className="text-2xl font-black text-[#3d2314] mt-1 font-display">
                  ₦{successReceipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>

                <div className="mt-4 pt-4 border-t border-dashed border-[#8c6239]/20 space-y-2 text-[10px] text-left">
                  <div className="flex justify-between">
                    <span className="text-[#8c6239]/80">Reference Hash</span>
                    <span className="font-mono font-bold text-[#3d2314]">{successReceipt.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8c6239]/80">Details</span>
                    <span className="font-semibold text-[#3d2314] max-w-[160px] text-right truncate">{successReceipt.details}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSuccessReceipt(null)}
                className="w-full py-3 bg-[#3d2314] hover:bg-[#2b180d] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Return to Vault
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- FIXED ROUNDED WHITE FLOATING NAVIGATION BAR --- */}
      <div className="absolute bottom-5 inset-x-5 h-16 bg-white border border-[#8c6239]/15 rounded-2xl flex items-center justify-around px-4 shadow-[0_12px_24px_rgba(43,24,13,0.12)] z-30">
        {/* Home Button */}
        <button
          onClick={() => handleTabChange("home")}
          className={`flex flex-col items-center gap-1 transition-all duration-300 relative py-1 cursor-pointer ${
            activeTab === "home" ? "text-[#3d2314] scale-105" : "text-[#8c6239]/60 hover:text-[#8c6239]"
          }`}
        >
          <Smartphone className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wider font-display">Vault</span>
          {activeTab === "home" && (
            <motion.div
              layoutId="nav-indicator"
              className="absolute -bottom-1 w-5 h-0.75 bg-[#3d2314] rounded-full"
            />
          )}
        </button>

        {/* Referral Button */}
        <button
          onClick={() => handleTabChange("referral")}
          className={`flex flex-col items-center gap-1 transition-all duration-300 relative py-1 cursor-pointer ${
            activeTab === "referral" ? "text-[#3d2314] scale-105" : "text-[#8c6239]/60 hover:text-[#8c6239]"
          }`}
        >
          <UserPlus className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wider font-display">Referral</span>
          {activeTab === "referral" && (
            <motion.div
              layoutId="nav-indicator"
              className="absolute -bottom-1 w-5 h-0.75 bg-[#3d2314] rounded-full"
            />
          )}
        </button>

        {/* Tasks Button */}
        <button
          onClick={onNavigateToTasks}
          className="flex flex-col items-center gap-1 transition-all duration-300 relative py-1 cursor-pointer text-[#8c6239]/60 hover:text-[#8c6239]"
        >
          <Sparkles className="w-5 h-5 text-[#8c6239]/70" />
          <span className="text-[9px] font-bold tracking-wider font-display">Tasks</span>
        </button>

        {/* Profile Button */}
        <button
          onClick={() => handleTabChange("profile")}
          className={`flex flex-col items-center gap-1 transition-all duration-300 relative py-1 cursor-pointer ${
            activeTab === "profile" ? "text-[#3d2314] scale-105" : "text-[#8c6239]/60 hover:text-[#8c6239]"
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wider font-display">Identity</span>
          {activeTab === "profile" && (
            <motion.div
              layoutId="nav-indicator"
              className="absolute -bottom-1 w-5 h-0.75 bg-[#3d2314] rounded-full"
            />
          )}
        </button>
      </div>

      <TelegramModal 
        isOpen={showTelegramModal} 
        onClose={() => setShowTelegramModal(false)} 
      />
    </div>
  );
}
