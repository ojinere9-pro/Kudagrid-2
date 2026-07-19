import React, { useState, useEffect } from "react";
import { 
  collection, doc, onSnapshot, updateDoc, increment, 
  runTransaction, getDoc, query, orderBy, setDoc 
} from "firebase/firestore";
import { db } from "../firebase";
import { 
  ArrowLeft, Users, Landmark, Coins, Search, Check, X, 
  ShieldAlert, RefreshCw, Sparkles, Sliders, DollarSign, Calendar, Mail
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminPanelScreenProps {
  onBack: () => void;
  currentAdminUsername: string;
}

interface UserRecord {
  id: string; // Document ID (username)
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  depositBalance?: number;
  referralBalance?: number;
  taskBalance?: number;
  currentPlan?: string;
  createdAt?: string;
  isAdmin?: boolean;
}

interface WithdrawalRequest {
  id: string; // Document ID
  username: string;
  email?: string;
  amount: number;
  accountNumber: string;
  bankName: string;
  timestamp: string;
  status: "pending" | "approved" | "rejected";
  type: "Deposit Balance" | "Referral Balance" | "Task Balance";
}

export default function AdminPanelScreen({ onBack, currentAdminUsername }: AdminPanelScreenProps) {
  // Real-time states
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter/Search states
  const [userSearch, setUserSearch] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("All");
  const [withdrawalFilter, setWithdrawalFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  // Balance Adjustment state
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [adjDeposit, setAdjDeposit] = useState("");
  const [adjReferral, setAdjReferral] = useState("");
  const [adjTask, setAdjTask] = useState("");
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Sync real-time data from Firestore
  useEffect(() => {
    setLoading(true);

    // 1. Sync All Registered Users
    const usersRef = collection(db, "users");
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const usersList: UserRecord[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        username: docSnap.id,
        ...docSnap.data()
      }));
      setUsers(usersList);
      setLoading(false);
    }, (error) => {
      console.error("Admin users subscription error:", error);
      showToast("error", "Failed to sync users list.");
    });

    // 2. Sync All Root Withdrawals
    const withdrawalsRef = collection(db, "withdrawals");
    const unsubscribeWithdrawals = onSnapshot(withdrawalsRef, (snapshot) => {
      const withdrawalsList: WithdrawalRequest[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<WithdrawalRequest, "id">)
      }));
      // Sort withdrawals descending by timestamp
      withdrawalsList.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      setWithdrawals(withdrawalsList);
    }, (error) => {
      console.error("Admin withdrawals subscription error:", error);
      showToast("error", "Failed to sync withdrawals.");
    });

    return () => {
      unsubscribeUsers();
      unsubscribeWithdrawals();
    };
  }, []);

  // Show inline toast
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Aggregates computed on live snapshots
  const totalUsers = users.length;

  const totalDeposits = users.reduce((acc, u) => acc + (u.depositBalance ?? 0), 0);

  const totalWithdrawals = withdrawals
    .filter(w => w.status === "approved" || w.status as string === "Success")
    .reduce((acc, w) => acc + w.amount, 0);

  // Format currency
  const formatNaira = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(val);
  };

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  // APPROVE WITHDRAWAL REQUEST
  const handleApproveWithdrawal = async (request: WithdrawalRequest) => {
    try {
      showToast("success", `Approving withdrawal of ₦${request.amount.toLocaleString()}...`);
      
      const withdrawalDocRef = doc(db, "withdrawals", request.id);
      
      // Update root withdrawal status to approved
      await updateDoc(withdrawalDocRef, {
        status: "approved"
      });

      // Also update in user subcollection so user sees updated success status
      try {
        const userPayoutRef = doc(db, "users", request.username, "payouts", request.id);
        const payoutDoc = await getDoc(userPayoutRef);
        if (payoutDoc.exists()) {
          await updateDoc(userPayoutRef, {
            status: "Success"
          });
        }
      } catch (err) {
        console.warn("Could not sync user payouts subcollection status:", err);
      }

      showToast("success", "Withdrawal request approved successfully!");
    } catch (err: any) {
      console.error("Error approving withdrawal:", err);
      showToast("error", err.message || "Failed to approve withdrawal.");
    }
  };

  // REJECT WITHDRAWAL REQUEST & RESTORE USER BALANCE
  const handleRejectWithdrawal = async (request: WithdrawalRequest) => {
    try {
      showToast("success", "Rejecting withdrawal & restoring funds...");

      const withdrawalDocRef = doc(db, "withdrawals", request.id);
      const userRef = doc(db, "users", request.username);

      // Execute in atomic transaction to guarantee restoration of funds
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error(`User ${request.username} does not exist.`);
        }

        // 1. Update root withdrawal status to rejected
        transaction.update(withdrawalDocRef, {
          status: "rejected"
        });

        // 2. Restore user's specific balance
        if (request.type === "Deposit Balance") {
          const currentDep = userDoc.data().depositBalance ?? 0;
          transaction.update(userRef, {
            depositBalance: currentDep + request.amount
          });
          console.log(`[Admin] Restored ${request.amount} to depositBalance for ${request.username}`);
        } else if (request.type === "Task Balance") {
          const currentTask = userDoc.data().taskBalance ?? 0;
          transaction.update(userRef, {
            taskBalance: currentTask + request.amount
          });
          console.log(`[Admin] Restored ${request.amount} to taskBalance for ${request.username}`);
        } else {
          const currentRef = userDoc.data().referralBalance ?? 0;
          transaction.update(userRef, {
            referralBalance: currentRef + request.amount
          });
          console.log(`[Admin] Restored ${request.amount} to referralBalance for ${request.username}`);
        }

        // 3. Update the user's specific sub-collection payout record if it exists
        const userPayoutRef = doc(db, "users", request.username, "payouts", request.id);
        transaction.set(userPayoutRef, {
          amount: request.amount,
          accountNumber: request.accountNumber,
          bankName: request.bankName,
          timestamp: request.timestamp,
          status: "Rejected"
        }, { merge: true });
      });

      showToast("success", "Withdrawal request rejected. Funds restored to user balance!");
    } catch (err: any) {
      console.error("Error rejecting withdrawal:", err);
      showToast("error", err.message || "Failed to reject withdrawal.");
    }
  };

  // OPEN EDIT USER BALANCES MODAL
  const startEditUser = (user: UserRecord) => {
    setEditingUser(user);
    setAdjDeposit((user.depositBalance ?? 0).toString());
    setAdjReferral((user.referralBalance ?? 0).toString());
    setAdjTask((user.taskBalance ?? 0).toString());
  };

  // SAVE ADJUSTED USER BALANCES
  const handleSaveUserBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmittingAdjustment(true);
    try {
      const userRef = doc(db, "users", editingUser.username);
      
      const newDeposit = parseFloat(adjDeposit) || 0;
      const newReferral = parseFloat(adjReferral) || 0;
      const newTask = parseFloat(adjTask) || 0;

      await updateDoc(userRef, {
        depositBalance: newDeposit,
        referralBalance: newReferral,
        taskBalance: newTask
      });

      showToast("success", `Balances successfully updated for ${editingUser.username}`);
      setEditingUser(null);
    } catch (err: any) {
      console.error("Error updating user balances:", err);
      showToast("error", "Failed to save user balances.");
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  // TOGGLE ADMIN ACCESS FOR USER
  const handleToggleAdmin = async (user: UserRecord) => {
    try {
      const userRef = doc(db, "users", user.username);
      const newIsAdmin = !user.isAdmin;
      await updateDoc(userRef, {
        isAdmin: newIsAdmin
      });
      showToast("success", `Admin privileges ${newIsAdmin ? "GRANTED to" : "REVOKED from"} ${user.username}`);
    } catch (err: any) {
      console.error("Error toggling admin privilege:", err);
      showToast("error", "Failed to update admin role.");
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const queryStr = userSearch.toLowerCase().trim();
    const matchesSearch = 
      u.username.toLowerCase().includes(queryStr) ||
      (u.email || "").toLowerCase().includes(queryStr) ||
      (u.firstName || "").toLowerCase().includes(queryStr) ||
      (u.lastName || "").toLowerCase().includes(queryStr);
    
    if (selectedPlanFilter === "All") return matchesSearch;
    return matchesSearch && (u.currentPlan || "None") === selectedPlanFilter;
  });

  // Filtered Withdrawals List
  const filteredWithdrawals = withdrawals.filter((w) => {
    if (withdrawalFilter === "all") return true;
    return w.status === withdrawalFilter;
  });

  return (
    <div className="flex flex-col flex-1 bg-[#fdfaf6] min-h-screen pb-12 overflow-y-auto">
      {/* Toast Overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 w-[90%] max-w-[380px] ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            {toast.type === "success" ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="text-xs font-bold leading-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Admin Bar */}
      <div className="px-6 py-5 bg-gradient-to-r from-[#2b180d] to-[#3d2314] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dfb04d]/25">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all cursor-pointer flex items-center justify-center active:scale-95"
            title="Return to Main App"
          >
            <ArrowLeft className="w-4 h-4 text-[#dfb04d]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#dfb04d]" />
              <h2 className="text-base font-black font-display tracking-tight text-[#dfb04d]">
                KUDIGRID ADMINISTRATIVE CENTER
              </h2>
            </div>
            <p className="text-[10px] text-stone-300 uppercase tracking-widest font-mono">
              Live Mainnet Engine • Operator: {currentAdminUsername}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Real-Time Syncing
          </span>
          <button 
            onClick={() => window.location.reload()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300 transition-all cursor-pointer active:scale-95"
            title="Refresh application"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Core Real-Time Metrics Aggregates */}
      <div className="px-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Total Registered Users */}
          <div className="p-5 rounded-2xl bg-white border border-[#8c6239]/15 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#8c6239]/5 flex items-center justify-center text-[#8c6239]">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-[#8c6239] uppercase tracking-wider font-extrabold font-display block">
              Total Registered Users
            </span>
            <h3 className="text-3xl font-black text-[#3d2314] font-display">
              {loading ? "..." : totalUsers}
            </h3>
            <p className="text-[10px] text-stone-500 font-medium">
              Registered Firestore user profiles
            </p>
          </div>

          {/* Card 2: Total Deposits Pool */}
          <div className="p-5 rounded-2xl bg-white border border-[#8c6239]/15 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-amber-500/5 flex items-center justify-center text-amber-600">
              <Landmark className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-[#8c6239] uppercase tracking-wider font-extrabold font-display block">
              Deposited Capital Pool
            </span>
            <h3 className="text-2xl font-black text-amber-700 font-display">
              {loading ? "..." : formatNaira(totalDeposits)}
            </h3>
            <p className="text-[10px] text-stone-500 font-medium">
              Combined live wallet balances of all accounts
            </p>
          </div>

          {/* Card 3: Total Approved Withdrawals */}
          <div className="p-5 rounded-2xl bg-white border border-[#8c6239]/15 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center text-emerald-600">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-[#8c6239] uppercase tracking-wider font-extrabold font-display block">
              Approved Payout Pool
            </span>
            <h3 className="text-2xl font-black text-emerald-700 font-display">
              {loading ? "..." : formatNaira(totalWithdrawals)}
            </h3>
            <p className="text-[10px] text-stone-500 font-medium">
              Funds securely paid out via administration approval
            </p>
          </div>

        </div>
      </div>

      {/* Main Administrative Operations Area */}
      <div className="px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand: Real-Time Withdrawal Requests (7 Columns) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#8c6239]/15 shadow-sm overflow-hidden flex flex-col">
          
          {/* Header & Controls */}
          <div className="px-5 py-4 border-b border-stone-100 bg-[#fdfaf6] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-xs font-extrabold text-[#3d2314] uppercase tracking-wider font-display">
                Real-Time Withdrawal Queue
              </h3>
              <p className="text-[10px] text-stone-500 font-medium mt-0.5">
                Manage pending payout requests with instant balance restoration
              </p>
            </div>
            {/* Filter Controls */}
            <div className="flex rounded-lg bg-stone-100 p-0.5 border border-stone-200">
              {(["pending", "approved", "rejected", "all"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setWithdrawalFilter(filter)}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                    withdrawalFilter === filter
                      ? "bg-white text-[#3d2314] shadow-sm"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Requests Content */}
          <div className="p-5 flex-1 max-h-[500px] overflow-y-auto">
            {filteredWithdrawals.length === 0 ? (
              <div className="py-12 text-center text-stone-400 italic text-xs">
                No {withdrawalFilter !== "all" ? withdrawalFilter : ""} withdrawal requests found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredWithdrawals.map((req) => (
                  <div 
                    key={req.id}
                    className="p-4 rounded-xl border border-stone-200/80 bg-[#fdfaf6] hover:bg-stone-50/50 transition-all space-y-3"
                  >
                    {/* Top User Info & Status */}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-[#3d2314] flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-[#8c6239]/10 text-[#8c6239] rounded font-mono text-[9px]">
                            {req.username}
                          </span>
                          <span className="text-[11px] text-stone-500 font-normal truncate max-w-[150px] sm:max-w-none">
                            {req.email || "No Email"}
                          </span>
                        </p>
                        <p className="text-[9px] text-stone-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-stone-300" />
                          Requested: {formatDate(req.timestamp)}
                        </p>
                      </div>

                      <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        req.status === "pending"
                          ? "bg-amber-100 border border-amber-200 text-amber-800 animate-pulse"
                          : req.status === "approved"
                          ? "bg-emerald-100 border border-emerald-200 text-emerald-800"
                          : "bg-red-100 border border-red-200 text-red-800"
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    {/* Amount & Bank Account details */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg border border-stone-200/50 text-xs">
                      <div>
                        <span className="text-[9px] text-stone-400 block uppercase font-bold">Amount to Pay</span>
                        <p className="text-sm font-black text-[#3d2314] font-mono mt-0.5">
                          {formatNaira(req.amount)}
                        </p>
                        <span className="text-[8.5px] text-[#8c6239] font-medium block mt-0.5">
                          Source: {req.type || "Referral Balance"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-stone-400 block uppercase font-bold">Bank Credentials</span>
                        <p className="font-extrabold text-[#3d2314] truncate mt-0.5">
                          {req.bankName}
                        </p>
                        <p className="font-mono text-[11px] font-bold text-stone-600 mt-0.5 tracking-wider">
                          A/C {req.accountNumber}
                        </p>
                      </div>
                    </div>

                    {/* Operator Decision Actions (only for pending requests) */}
                    {req.status === "pending" && (
                      <div className="flex gap-2.5 pt-1.5">
                        <button
                          onClick={() => handleApproveWithdrawal(req)}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve Payout
                        </button>
                        <button
                          onClick={() => handleRejectWithdrawal(req)}
                          className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject & Refund
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Hand: Registered User Directory (5 Columns) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#8c6239]/15 shadow-sm overflow-hidden flex flex-col">
          
          {/* Header & Search */}
          <div className="p-5 border-b border-stone-100 bg-[#fdfaf6] space-y-3">
            <div>
              <h3 className="text-xs font-extrabold text-[#3d2314] uppercase tracking-wider font-display">
                User Directory Console
              </h3>
              <p className="text-[10px] text-stone-500 font-medium">
                Live monitoring of profiles, plan tiers, and instant balance override
              </p>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Find user by email or UID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-stone-200 text-xs focus:outline-none focus:border-[#8c6239] transition-all bg-white"
                />
              </div>

              {/* Tier Filter */}
              <select
                value={selectedPlanFilter}
                onChange={(e) => setSelectedPlanFilter(e.target.value)}
                className="h-9 px-2 rounded-lg border border-stone-200 text-[11px] font-bold text-[#3d2314] focus:outline-none"
              >
                <option value="All">All Tiers</option>
                <option value="None">None</option>
                <option value="Silver">Silver Plan</option>
                <option value="Gold">Gold Plan</option>
                <option value="VIP Elite">VIP Elite</option>
              </select>
            </div>
          </div>

          {/* User List Table / Cards */}
          <div className="p-5 flex-1 max-h-[500px] overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-stone-400 italic text-xs">
                No users match the search criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-3.5 rounded-xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-all space-y-3"
                  >
                    {/* User Profile Info Card */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-extrabold text-[#3d2314] flex items-center gap-1.5">
                          <span>{user.firstName} {user.lastName}</span>
                          {user.isAdmin && (
                            <span className="px-1.5 py-0.2 bg-purple-100 border border-purple-200 text-purple-800 text-[8px] font-bold rounded uppercase tracking-wider">
                              Admin
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-[#8c6239] font-mono">@{user.username}</p>
                        <p className="text-[9px] text-stone-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {user.email || "No Email Address"}
                        </p>
                      </div>
                      
                      {/* Badge Plan */}
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                        user.currentPlan === "VIP Elite" || user.currentPlan === "Gold"
                          ? "bg-amber-100 border-amber-200 text-amber-800"
                          : user.currentPlan === "Silver"
                          ? "bg-stone-100 border-stone-200 text-stone-800"
                          : "bg-stone-50 border-stone-100 text-stone-500"
                      }`}>
                        {user.currentPlan || "No Plan"}
                      </span>
                    </div>

                    {/* Live Balance Grid */}
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-stone-100 text-[10px]">
                      <div>
                        <span className="text-[8px] text-stone-400 font-bold block uppercase">Wallet</span>
                        <p className="font-mono font-bold text-stone-800">{formatNaira(user.depositBalance ?? 0)}</p>
                      </div>
                      <div>
                        <span className="text-[8px] text-stone-400 font-bold block uppercase">Commission</span>
                        <p className="font-mono font-bold text-stone-800">{formatNaira(user.taskBalance ?? 0)}</p>
                      </div>
                      <div>
                        <span className="text-[8px] text-stone-400 font-bold block uppercase">Referrals</span>
                        <p className="font-mono font-bold text-stone-800">{formatNaira(user.referralBalance ?? 0)}</p>
                      </div>
                    </div>

                    {/* Quick actions for each user */}
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => startEditUser(user)}
                        className="px-2.5 py-1.5 bg-[#3d2314] hover:bg-[#2b180d] text-[#dfb04d] rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Sliders className="w-3 h-3" />
                        Adjust Balances
                      </button>
                      <button
                        onClick={() => handleToggleAdmin(user)}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all cursor-pointer active:scale-95 ${
                          user.isAdmin
                            ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        {user.isAdmin ? "Revoke Admin" : "Make Admin"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ADJUST USER BALANCES DIALOG/MODAL */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-[#3d2314]/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl border border-[#8c6239]/20 shadow-2xl p-6 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-black text-[#3d2314] font-display uppercase tracking-wider">
                    Balance Adjustment override
                  </h3>
                  <p className="text-[10px] text-[#8c6239] font-semibold">
                    Updating: {editingUser.firstName} ({editingUser.username})
                  </p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 rounded-lg bg-[#f4eee1] text-[#3d2314] hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUserBalances} className="space-y-4">
                
                {/* Wallet Balance Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Wallet Balance (₦)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjDeposit}
                    onChange={(e) => setAdjDeposit(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#8c6239]/20 font-mono text-xs font-bold text-[#3d2314] bg-stone-50"
                    placeholder="0.00"
                  />
                </div>

                {/* Task Earnings / Commission Balance Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Commission Balance (₦)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjTask}
                    onChange={(e) => setAdjTask(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#8c6239]/20 font-mono text-xs font-bold text-[#3d2314] bg-stone-50"
                    placeholder="0.00"
                  />
                </div>

                {/* Referral Balance Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Referral Balance (₦)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjReferral}
                    onChange={(e) => setAdjReferral(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#8c6239]/20 font-mono text-xs font-bold text-[#3d2314] bg-stone-50"
                    placeholder="0.00"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdjustment}
                    className="flex-1 py-3 bg-[#3d2314] hover:bg-[#2b180d] text-[#dfb04d] rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submittingAdjustment ? "Saving..." : "Save Balances"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
