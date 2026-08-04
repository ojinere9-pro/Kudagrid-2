import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, getDoc, updateDoc, addDoc, where, getDocs, orderBy, limit, startAfter } from "firebase/firestore";
import { db } from "../../firebase";
import { UserProfile, BalanceAuditLog, InvestmentPlan } from "../../types";
import { Search, User, CreditCard, History, Edit, Save, X, Loader2, ArrowUpRight, ArrowDownRight, Package } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function UserManagement({ adminId }: { adminId: string }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [balanceEdit, setBalanceEdit] = useState<{ type: "depositBalance" | "taskBalance" | "referralBalance", amount: string, reason: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const collectionPath = "users";
    console.log(`[Admin Audit] Starting listener on collection: ${collectionPath}`);
    
    // Using username for ordering as it's the document ID and guaranteed to exist
    const q = query(collection(db, collectionPath), orderBy("__name__", "asc"));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      console.log(`[Admin Audit] Snapshot received. Count: ${snap.docs.length}`);
      if (snap.empty) {
        console.warn("[Admin Audit] Snapshot is EMPTY. Check collection name or rules.");
      }
      
      const allUsers = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as any));
      
      setUsers(allUsers);
      setLoading(false);
    }, (err) => {
      console.error("[Admin Audit] Firestore Snapshot Error:", err);
      // Detailed error log
      const errInfo = {
        code: (err as any).code,
        message: err.message,
        path: collectionPath
      };
      console.error("[Admin Audit] Error Details:", JSON.stringify(errInfo));
      setLoading(false);
    });

    const unsubscribePlans = onSnapshot(collection(db, "investment_plans"), (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestmentPlan)));
    });

    return () => {
      unsubscribe();
      unsubscribePlans();
    };
  }, []);

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.firstName?.toLowerCase().includes(term) ||
      u.lastName?.toLowerCase().includes(term) ||
      u.id?.toLowerCase().includes(term)
    );
  });

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser || !balanceEdit || !balanceEdit.amount || !balanceEdit.reason) return;
    setSaving(true);
    try {
      const amount = parseFloat(balanceEdit.amount);
      const oldBalance = (selectedUser as any)[balanceEdit.type] || 0;
      const newBalance = oldBalance + amount;

      // Update user
      await updateDoc(doc(db, "users", selectedUser.username), {
        [balanceEdit.type]: newBalance
      });

      // Audit log
      await addDoc(collection(db, "balance_audit_logs"), {
        adminId,
        userId: selectedUser.username,
        type: balanceEdit.type.replace("Balance", ""),
        amount,
        oldBalance,
        newBalance,
        reason: balanceEdit.reason,
        timestamp: new Date().toISOString()
      });

      setSelectedUser({ ...selectedUser, [balanceEdit.type]: newBalance });
      setBalanceEdit(null);
      alert("Balance adjusted successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to update balance");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlan = async (planName: string) => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", selectedUser.username), {
        currentPlan: planName
      });
      setSelectedUser({ ...selectedUser, currentPlan: planName });
      alert("Plan assigned successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="mb-8 px-2">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">User Management</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verify and manage user accounts</p>
        
        {/* Audit Debug Info */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-6 bg-slate-900 rounded-3xl text-[9px] font-mono text-slate-300 space-y-2 shadow-xl shadow-slate-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
          <p className="text-blue-400 font-bold tracking-widest flex items-center gap-2">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
            [SYSTEM AUDIT ACTIVE]
          </p>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-0.5 opacity-60">
              <p>Target: users</p>
              <p>Status: {loading ? "initializing..." : "connected"}</p>
            </div>
            <div className="space-y-0.5 opacity-60">
              <p>Total Users: {users.length}</p>
              <p>Filtered: {filteredUsers.length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search */}
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Search by ID, Username, or Email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-14 pl-12 pr-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
        />
      </div>

      <div className="space-y-4">
        {filteredUsers.map((user: any, idx: number) => (
          <motion.div
            key={user.username}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="w-full p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-6 group transition-all hover:shadow-md hover:border-blue-100 relative overflow-hidden"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm border border-blue-100">
                  {user.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    {user.firstName} {user.lastName}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">@{user.username}</p>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{user.email}</p>
                  </div>
                </div>
              </div>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedUser(user)}
                className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100"
              >
                <Edit className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Investment Plan</p>
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  <p className="text-xs font-bold text-slate-900 tracking-tight">{user.currentPlan || "No Plan"}</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Account Status</p>
                <span className={`text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-widest border ${user.status === 'Suspended' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                  {user.status || 'Active'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 relative z-10">
              <div className="text-center p-3 rounded-xl bg-white border border-blue-50 shadow-sm">
                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1">Deposit</p>
                <p className="text-[10px] font-bold text-blue-600 truncate">{formatNaira(user.depositBalance)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white border border-emerald-50 shadow-sm">
                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1">Referral</p>
                <p className="text-[10px] font-bold text-emerald-600 truncate">{formatNaira(user.referralBalance)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white border border-amber-50 shadow-sm">
                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1">Earnings</p>
                <p className="text-[10px] font-bold text-amber-600 truncate">{formatNaira(user.taskBalance)}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2 text-slate-400">
                <History className="w-3.5 h-3.5" />
                <p className="text-[9px] font-bold uppercase tracking-widest">Joined: {user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <p className="text-[8px] text-slate-300 font-mono font-bold uppercase">ID: {user.id?.slice(0, 10)}</p>
            </div>
          </motion.div>
        ))}
      </div>

    <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-0 z-[160] flex flex-col bg-white overflow-hidden"
          >
            <div className="px-6 pt-12 pb-6 flex items-center justify-between border-b border-slate-50 sticky top-0 bg-white/80 backdrop-blur-md z-50">
              <div className="flex items-center gap-4">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedUser(null)} 
                  className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100"
                >
                  <X className="w-5 h-5" />
                </motion.button>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Profile</p>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">@{selectedUser.username}</h3>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 custom-scrollbar relative">
              {/* Balances */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-2">Account Balances</h4>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: "Deposit Balance", key: "depositBalance", type: "depositBalance", color: "blue" },
                    { label: "Commission Balance", key: "taskBalance", type: "taskBalance", color: "amber" },
                    { label: "Referral Balance", key: "referralBalance", type: "referralBalance", color: "emerald" },
                  ].map((item) => (
                    <motion.div 
                      key={item.key} 
                      className="p-6 rounded-3xl bg-white border border-slate-100 flex items-center justify-between shadow-sm"
                    >
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
                        <p className={`text-2xl font-bold ${
                          item.color === 'blue' ? 'text-blue-600' :
                          item.color === 'amber' ? 'text-amber-600' :
                          'text-emerald-600'
                        } tracking-tight`}>₦{((selectedUser as any)[item.key] || 0).toLocaleString()}</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setBalanceEdit({ type: item.type as any, amount: "", reason: "" })}
                        className="w-10 h-10 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all border border-slate-100 shadow-sm"
                      >
                        <Edit className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Account Control */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-2">Account Control</h4>
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-between shadow-inner">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Access Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${selectedUser.status === 'Suspended' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <p className={`text-sm font-bold ${selectedUser.status === 'Suspended' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {selectedUser.status === 'Suspended' ? 'Suspended' : 'Authorized'}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      const newStatus = selectedUser.status === 'Suspended' ? 'Active' : 'Suspended';
                      setSaving(true);
                      try {
                        await updateDoc(doc(db, "users", selectedUser.username), { status: newStatus });
                        setSelectedUser({ ...selectedUser, status: newStatus });
                      } catch (err) {
                        alert("Failed to update status");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className={`px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-md ${
                      selectedUser.status === 'Suspended'
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-900 text-white"
                    }`}
                  >
                    {selectedUser.status === 'Suspended' ? 'Authorize Account' : 'Suspend Account'}
                  </motion.button>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-2">Plan Assignment</h4>
                <div className="p-6 rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-100 flex items-center justify-between relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest mb-1">Current Plan</p>
                    <p className="text-xl font-bold tracking-tight">{selectedUser.currentPlan || "No Plan"}</p>
                  </div>
                  <Package className="w-8 h-8 opacity-30 relative z-10" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {plans.map((plan) => (
                    <motion.button
                      key={plan.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleUpdatePlan(plan.name)}
                      disabled={saving || selectedUser.currentPlan === plan.name}
                      className={`p-4 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                        selectedUser.currentPlan === plan.name
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100"
                        : "bg-white border-slate-100 text-slate-400 hover:border-blue-200"
                      }`}
                    >
                      {plan.name}
                    </motion.button>
                  ))}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleUpdatePlan("None")}
                    className="col-span-2 p-4 rounded-2xl border border-red-100 bg-red-50 text-red-500 text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-sm"
                  >
                    Remove Plan
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {balanceEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[170] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adjust Balance</p>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                    {balanceEdit.type.replace("Balance", "")} Adjustment
                  </h3>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setBalanceEdit(null)} 
                  className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Adjustment Amount (±)</label>
                  <input
                    type="number"
                    placeholder="Use - for reduction"
                    value={balanceEdit.amount}
                    onChange={(e) => setBalanceEdit({ ...balanceEdit, amount: e.target.value })}
                    className="w-full h-12 px-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Adjustment Reason</label>
                  <textarea
                    placeholder="Adjustment justification"
                    value={balanceEdit.reason}
                    onChange={(e) => setBalanceEdit({ ...balanceEdit, reason: e.target.value })}
                    className="w-full h-24 p-5 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleUpdateBalance}
                disabled={saving || !balanceEdit.amount || !balanceEdit.reason}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
