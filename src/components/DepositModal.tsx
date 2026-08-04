import React, { useState } from "react";
import { X, ExternalLink, ShieldCheck, Loader2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, runTransaction, increment } from "firebase/firestore";
import { db } from "../firebase";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";
import { useGlobalSettings } from "../hooks/useGlobalSettings";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  email: string;
}

export default function DepositModal({ isOpen, onClose, username, email }: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { settings } = useGlobalSettings();

  const minDeposit = settings?.minDeposit ?? 750;
  const isPortalOpen = settings?.portals?.deposit !== false;

  const depositAmount = parseFloat(amount) || 0;

  // Audit: Ensure public key is loaded correctly from environment
  const FLW_PUB_KEY = (import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || "").trim();

  const config = {
    public_key: FLW_PUB_KEY,
    tx_ref: `KUDAGRID_${username}_${Date.now()}`,
    amount: depositAmount,
    currency: "NGN",
    payment_options: "card,mobilemoney,ussd",
    customer: {
      email: email || `${username}@kudagrid.com`,
      phone_number: "08000000000",
      name: username,
    },
    customizations: {
      title: "KudaGrid Treasury",
      description: "Wallet Funding",
      logo: "https://kudagrid.com/assets/logo.png", 
    },
  };

  const handleFlutterPayment = useFlutterwave(config);

  const handleInitiatePayment = () => {
    if (!isPortalOpen) {
      alert("The deposit portal is currently closed for maintenance.");
      return;
    }

    // Validation
    if (!amount || depositAmount < minDeposit) {
      alert(`Minimum deposit amount is ₦${minDeposit.toLocaleString()}`);
      return;
    }
// ... (rest of validation)

    if (!FLW_PUB_KEY) {
      console.error("Flutterwave Error: Public Key is missing. Please set VITE_FLUTTERWAVE_PUBLIC_KEY in your environment.");
      alert("Payment configuration error. Please contact support.");
      return;
    }

    if (FLW_PUB_KEY.startsWith("FLWSECK")) {
      console.error("Flutterwave Error: You are using a SECRET KEY instead of a PUBLIC KEY. Please check your credentials.");
      alert("Payment security error. Please contact support.");
      return;
    }

    handleFlutterPayment({
      callback: async (response) => {
        if (response.status === "successful") {
          setLoading(true);
          try {
            const userRef = doc(db, "users", username);
            const depositId = `FLW_${response.transaction_id || Date.now()}`;
            const depositRef = doc(db, "deposits", depositId);

            await runTransaction(db, async (transaction) => {
              const userDoc = await transaction.get(userRef);
              if (!userDoc.exists()) throw new Error("Account not found");

              // Update user balance
              transaction.update(userRef, {
                depositBalance: increment(depositAmount),
              });

              // Create deposit record for Admin and History
              transaction.set(depositRef, {
                id: depositId,
                username,
                email,
                amount: depositAmount,
                status: "approved",
                timestamp: new Date().toISOString(),
                method: "Flutterwave",
                tx_ref: response.tx_ref,
                flw_ref: response.flw_ref
              });
            });

            alert("Deposit successful! Your balance has been updated.");
            closePaymentModal();
            onClose();
          } catch (err) {
            console.error("Verification Error:", err);
            alert("Verification failed. Please contact support.");
          } finally {
            setLoading(false);
          }
        }
        closePaymentModal();
      },
      onClose: () => {},
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-[400px] bg-white rounded-[56px] p-12 space-y-12 shadow-premium-elevated border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[4px]">Financial Node</p>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Deposit Protocol</h3>
              </div>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={onClose} 
                className="w-12 h-12 bg-slate-50 rounded-2xl text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-all border border-slate-100"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[4px] text-slate-400 ml-6">Capital Injection (₦)</label>
                <div className="relative group">
                  <input
                    type="number"
                    placeholder={`Min ${minDeposit.toLocaleString()}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={!isPortalOpen}
                    className={`w-full h-18 px-10 rounded-[32px] border border-slate-100 bg-slate-50/50 text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner ${!isPortalOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  {!isPortalOpen && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 rounded-[32px] backdrop-blur-[2px]">
                      <div className="flex items-center gap-3 px-6 py-3 bg-red-600 text-white rounded-full shadow-2xl border border-red-500/30">
                        <Lock className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-[3px]">Protocol Locked</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="p-8 rounded-[32px] bg-blue-50 border border-blue-100 flex gap-5 items-start shadow-sm"
              >
                <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                <p className="text-[11px] text-blue-900 font-medium leading-relaxed">
                  <span className="font-bold uppercase tracking-widest text-blue-600 block mb-1">Secure Protocol:</span> Authenticated Flutterwave gateway. Synchronized balances update instantly upon verification.
                </p>
              </motion.div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleInitiatePayment}
                disabled={loading || !amount}
                className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-bold text-sm uppercase tracking-[3px] shadow-2xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Initiate Payout <ExternalLink className="w-5 h-5 text-blue-400" /></>}
              </motion.button>
            </div>

            <p className="text-[10px] text-center text-slate-300 font-bold uppercase tracking-[4px] pt-4">Global Security Protocol • Flutterwave</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
