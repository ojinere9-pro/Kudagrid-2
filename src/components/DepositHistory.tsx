import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";
import { DepositRecord } from "../types";
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  Calendar, 
  Hash, 
  CreditCard,
  ExternalLink,
  History,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DepositHistoryProps {
  username: string;
}

export default function DepositHistory({ username }: DepositHistoryProps) {
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "successful" | "pending" | "failed">("all");
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRecord | null>(null);

  useEffect(() => {
    if (!username) return;

    setLoading(true);
    const depositsRef = collection(db, "users", username, "deposits");
    const q = query(depositsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DepositRecord[];
      
      setDeposits(docs);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error listening to deposits:", err);
      setError("Failed to load deposit history.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [username]);

  const filteredDeposits = deposits.filter(deposit => {
    const matchesSearch = deposit.txRef.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         deposit.transactionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || deposit.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "successful": return "text-emerald-600 bg-emerald-50 border-emerald-100";
      case "pending": return "text-amber-600 bg-amber-50 border-amber-100";
      case "failed": return "text-red-600 bg-red-50 border-red-100";
      default: return "text-gray-600 bg-gray-50 border-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "successful": return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "pending": return <Clock className="w-3.5 h-3.5" />;
      case "failed": return <XCircle className="w-3.5 h-3.5" />;
      default: return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(val);
  };

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-red-800">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl active:scale-95"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c6239]/40" />
          <input
            type="text"
            placeholder="Search by Transaction Reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#fdfaf6] border border-[#8c6239]/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8c6239] transition-all text-[#3d2314] placeholder-[#8c6239]/40"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(["all", "successful", "pending", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all border ${
                filter === f
                  ? "bg-[#3d2314] text-white border-[#3d2314] shadow-sm"
                  : "bg-white text-[#8c6239] border-[#8c6239]/20 hover:border-[#8c6239]/40"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      <div className="space-y-3 min-h-[200px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-8 h-8 border-3 border-[#d4a017] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold text-[#8c6239] uppercase tracking-widest">Loading Records...</p>
          </div>
        ) : filteredDeposits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-[#fdfaf6] rounded-2xl border border-dashed border-[#8c6239]/20">
            <History className="w-10 h-10 text-[#8c6239]/20 mb-3" />
            <p className="text-xs font-bold text-[#3d2314] uppercase tracking-wide">No deposits yet.</p>
            <p className="text-[10px] text-[#8c6239] mt-1">Your transaction history will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredDeposits.map((deposit) => (
              <motion.div
                key={deposit.id}
                layoutId={deposit.id}
                onClick={() => setSelectedDeposit(deposit)}
                className="p-4 bg-white rounded-2xl border border-[#8c6239]/10 hover:border-[#d4a017]/40 transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${getStatusColor(deposit.status)}`}>
                      {getStatusIcon(deposit.status)}
                    </div>
                    <div>
                      <h5 className="text-[13px] font-black text-[#3d2314]">{formatNaira(deposit.amount)}</h5>
                      <p className="text-[10px] text-[#8c6239] font-medium">{formatDate(deposit.createdAt)}</p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${getStatusColor(deposit.status)}`}>
                    {deposit.status}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#8c6239]/5">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Hash className="w-3 h-3 text-[#d4a017]" />
                    <span className="text-[9px] font-mono text-[#8c6239] truncate max-w-[120px] uppercase">{deposit.txRef}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8c6239]/30 group-hover:text-[#d4a017] transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <AnimatePresence>
        {selectedDeposit && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDeposit(null)}
              className="absolute inset-0 bg-[#2b180d]/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-[340px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#d4a017]/20"
            >
              {/* Header */}
              <div className={`p-6 text-center space-y-2 ${getStatusColor(selectedDeposit.status)}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10" /> {/* Spacer */}
                  <div className="p-3 bg-white/40 backdrop-blur-md rounded-2xl shadow-sm inline-block">
                    {getStatusIcon(selectedDeposit.status)}
                  </div>
                  <button 
                    onClick={() => setSelectedDeposit(null)}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Transaction Details</h4>
                <p className="text-2xl font-black font-mono">{formatNaira(selectedDeposit.amount)}</p>
                <div className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusColor(selectedDeposit.status)}`}>
                  {selectedDeposit.status}
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-[#8c6239] uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date & Time
                    </p>
                    <p className="text-[11px] font-bold text-[#3d2314]">{formatDate(selectedDeposit.createdAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-[#8c6239] uppercase tracking-wider flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> Method
                    </p>
                    <p className="text-[11px] font-bold text-[#3d2314]">{selectedDeposit.paymentMethod}</p>
                  </div>
                </div>

                <div className="space-y-2 p-4 bg-[#fdfaf6] rounded-2xl border border-[#8c6239]/10">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-[#8c6239] uppercase tracking-wider">Transaction ID</p>
                    <p className="text-[10px] font-mono font-bold text-[#3d2314] break-all">{selectedDeposit.transactionId}</p>
                  </div>
                  <div className="pt-2 border-t border-[#8c6239]/5 space-y-1">
                    <p className="text-[9px] font-bold text-[#8c6239] uppercase tracking-wider">Reference (TX-REF)</p>
                    <p className="text-[10px] font-mono font-bold text-[#d4a017] break-all uppercase">{selectedDeposit.txRef}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDeposit(null)}
                  className="w-full py-4 rounded-2xl bg-[#3d2314] text-white text-xs font-black uppercase tracking-widest hover:bg-[#2b180d] transition-all active:scale-95 shadow-premium-3d"
                >
                  Close Receipt
                </button>

                <p className="text-[8px] text-center text-[#8c6239] font-medium flex items-center justify-center gap-1">
                  Securely processed via Flutterwave Gateway <ExternalLink className="w-2 h-2" />
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
