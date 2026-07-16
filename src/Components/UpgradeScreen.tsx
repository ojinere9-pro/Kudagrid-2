import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, increment, collection, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ArrowLeft, PlusCircle, Check, Award, Sparkles, AlertCircle, Coins, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UpgradeScreenProps {
  username: string;
  depositBalance: number;
  currentPlan: string;
  email: string;
  onBack: () => void;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  dailyEarnings: string;
  features: string[];
}

export default function UpgradeScreen({ username, depositBalance, currentPlan, email: userEmail, onBack }: UpgradeScreenProps) {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Deposit modal states
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmountInput, setDepositAmountInput] = useState("");
  const [email, setEmail] = useState(userEmail || "");

  // Update internal email state if the prop changes
  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  // Fetch the logged-in user's email address from Firestore if not provided as prop
  useEffect(() => {
    if (!username || email) return;
    const fetchUserEmail = async () => {
      try {
        const userRef = doc(db, "users", username);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.email) {
            setEmail(data.email);
          } else {
            setEmail(`${username}@kudigrid.com`);
          }
        } else {
          setEmail(`${username}@kudigrid.com`);
        }
      } catch (err) {
        console.error("Failed to fetch email, using fallback:", err);
        setEmail(`${username}@kudigrid.com`);
      }
    };
    fetchUserEmail();
  }, [username, email]);

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(val);
  };

  const handleDepositSuccess = async (amount: number, reference: string) => {
    try {
      const userRef = doc(db, "users", username);
      // Immediately invoke Firestore update bypassing local storage using the increment operator
      await updateDoc(userRef, {
        depositBalance: increment(amount)
      });

      // --- Referral Commission Check & 50% Commission Logic ---
      try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const referrerId = userData.referredBy || userData.referral;
          if (referrerId) {
            const cleanReferrerId = referrerId.trim().toLowerCase();
            // Prevent self-referral bonus
            if (cleanReferrerId !== username.toLowerCase()) {
              const referrerRef = doc(db, "users", cleanReferrerId);
              const referrerSnap = await getDoc(referrerRef);
              if (referrerSnap.exists()) {
                const bonusAmount = amount * 0.5; // 50% commission
                // Credit the 50% bonus amount to referrer's wallet balance
                await updateDoc(referrerRef, {
                  referralBalance: increment(bonusAmount)
                });

                // Log the transaction in a sub-collection for tracking
                const referralTxRef = doc(collection(db, "users", cleanReferrerId, "referralTransactions"));
                await setDoc(referralTxRef, {
                  id: referralTxRef.id,
                  referredUser: username,
                  depositAmount: amount,
                  bonusAmount: bonusAmount,
                  reference: reference,
                  timestamp: new Date().toISOString(),
                  status: "Success",
                  type: "Referral Commission"
                });
                console.log(`Successfully credited ${bonusAmount} NGN commission to referrer: ${cleanReferrerId}`);
              }
            }
          }
        }
      } catch (refErr) {
        console.error("Referral commission credit failed but deposit was successful:", refErr);
      }

      showToast("success", `₦${amount.toLocaleString()} added to Deposit Balance! Ref: ${reference}`);
      setIsDepositModalOpen(false);
      setDepositAmountInput("");
    } catch (err) {
      console.error("Firestore balance upgrade error:", err);
      showToast("error", "Transaction succeeded but failed to update balance in database.");
    }
  };

  const handlePaystackPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmountInput);
    if (isNaN(amount) || amount <= 0) {
      showToast("error", "Please enter a valid amount.");
      return;
    }

    if (amount < 100) {
      showToast("error", "The minimum deposit amount is ₦100.00.");
      return;
    }

    // Initialize Paystack Inline SDK popup
    try {
      const paystackPop = (window as any).PaystackPop;
      if (!paystackPop) {
        showToast("error", "Paystack SDK is loading, please try again in a moment.");
        return;
      }

      const activeEmail = email || "";

      const refCode = "KG-" + Date.now() + "-" + Math.floor(Math.random() * 10000);

      // Initialize standard Paystack inline popup using the exact key provided
      const handler = paystackPop.setup({
        key: "pk_test_a9812690cf83ae27161c016a6e2b4c59f360dd7a",
        email: activeEmail,
        amount: Math.round(amount * 100), // convert to kobo
        currency: "NGN",
        ref: refCode,
        callback: function (response: any) {
          if (response && response.reference) {
            handleDepositSuccess(amount, response.reference);
          } else {
            showToast("error", "Payment response did not contain a reference ID.");
          }
        },
        onClose: function () {
          showToast("error", "Deposit session closed.");
        },
      });
      handler.openIframe();
    } catch (err: any) {
      console.error("Paystack popup error:", err);
      showToast("error", "Failed to load Paystack payment checkout.");
    }
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500); // 4.5 seconds to read
  };

  const handlePurchasePlan = async (plan: Plan) => {
    if (depositBalance < plan.price) {
      showToast("error", `Insufficient Deposit Balance. Please click "Add Money" first.`);
      return;
    }

    setLoadingPlanId(plan.id);
    try {
      const userRef = doc(db, "users", username);
      await updateDoc(userRef, {
        depositBalance: increment(-plan.price),
        currentPlan: plan.name
      });
      showToast("success", `Successfully upgraded to ${plan.name}! 👑`);
    } catch (err) {
      console.error(err);
      showToast("error", "An error occurred during upgrade.");
    } finally {
      setLoadingPlanId(null);
    }
  };

  const plans: Plan[] = [
    {
      id: "plan-750",
      name: "Starter-750",
      price: 750,
      dailyEarnings: "₦50/day",
      features: ["Daily task access", "Standard withdrawal", "Unlimited validity"]
    },
    {
      id: "plan-1500",
      name: "Basic-1500",
      price: 1500,
      dailyEarnings: "₦100/day",
      features: ["Daily task access", "Standard withdrawal", "Unlimited validity"]
    },
    {
      id: "plan-3000",
      name: "Bronze-3000",
      price: 3000,
      dailyEarnings: "₦200/day",
      features: ["3 daily campaign tasks", "Priority processing", "Unlimited validity"]
    },
    {
      id: "plan-5000",
      name: "Silver-5000",
      price: 5000,
      dailyEarnings: "₦350/day",
      features: ["4 daily campaign tasks", "Dedicated VIP support", "Unlimited validity"]
    },
    {
      id: "plan-10000",
      name: "Gold-10000",
      price: 10000,
      dailyEarnings: "₦666/day",
      features: ["5 daily campaign tasks", "Elite support channel", "Unlimited validity"]
    },
    {
      id: "plan-15000",
      name: "Platinum-15000",
      price: 15000,
      dailyEarnings: "₦1,000/day",
      features: ["6 daily campaign tasks", "Fast lightning withdrawal", "Unlimited validity"]
    },
    {
      id: "plan-20000",
      name: "Diamond-20000",
      price: 20000,
      dailyEarnings: "₦1,400/day",
      features: ["8 daily campaign tasks", "Premium events access", "Unlimited validity"]
    },
    {
      id: "plan-30000",
      name: "Elite-30000",
      price: 30000,
      dailyEarnings: "₦2,000/day",
      features: ["10 daily campaign tasks", "Dedicated manager", "Unlimited validity"]
    },
    {
      id: "plan-40000",
      name: "Sapphire-40000",
      price: 40000,
      dailyEarnings: "₦2,700/day",
      features: ["12 daily campaign tasks", "Exclusive beta access", "Unlimited validity"]
    },
    {
      id: "plan-50000",
      name: "Obsidian-50000",
      price: 50000,
      dailyEarnings: "₦3,300/day",
      features: ["15 daily campaign tasks", "Custom branding", "Unlimited validity"]
    },
    {
      id: "plan-100000",
      name: "Sovereign-100000",
      price: 100000,
      dailyEarnings: "₦7,000/day",
      features: ["Uncapped daily tasks", "Premium rewards", "Unlimited validity"]
    }
  ];

  return (
    <div className="flex flex-col flex-1 pb-10 bg-white overflow-y-auto">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-12 left-1/2 -translate-x-1/2 z-100 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 max-w-[320px] ${
              toastMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {toastMessage.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="text-xs font-semibold leading-tight">{toastMessage.text}</span>
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
            Premium Upgrades
          </p>
          <h2 className="text-sm font-bold text-[#3d2314]">
            Membership Upgrade
          </h2>
        </div>
      </div>

      {/* Top Wallet Card displaying "Deposit Balance" explicitly */}
      <div className="px-5 pt-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-[#3d2314] to-[#2b180d] p-5 border-b-4 border-[#d4a017] text-white shadow-premium-3d select-none">
          {/* Card Glass Highlight */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
          
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[10px] text-[#faf7f2]/60 uppercase tracking-wider mb-0.5">Deposit Balance</p>
              <h3 className="text-2xl font-extrabold font-mono tracking-tight text-white">
                {formatNaira(depositBalance)}
              </h3>
            </div>
            
            <button
              onClick={() => setIsDepositModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#d4a017] hover:bg-[#b4860f] text-[#2b180d] font-bold text-xs flex items-center gap-1 transition-all duration-200 shadow-md active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Money</span>
            </button>
          </div>

          <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[10px]">
            <div>
              <span className="text-[#faf7f2]/50">Active Tier:</span>{" "}
              <span className="text-[#d4a017] font-bold uppercase">{currentPlan || "NONE"}</span>
            </div>
            <div className="flex items-center gap-1 text-[#d4a017]">
              <Coins className="w-3.5 h-3.5 animate-bounce" />
              <span className="font-semibold">Simulated Bank Link</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plans List Header */}
      <div className="px-5 mt-6 mb-3">
        <h4 className="text-xs uppercase tracking-widest font-extrabold text-[#3d2314] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
          Select Premium Membership Tiers
        </h4>
        <p className="text-[10px] text-[#8c6239] mt-0.5">Deduct fees directly from your Deposit Balance to unlock premium tasks & bonuses.</p>
      </div>

      {/* Plans List Cards */}
      <div className="px-5 space-y-4">
        {plans.map((plan) => {
          const isActive = currentPlan === plan.name;
          return (
            <div
              key={plan.id}
              className={`p-4 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden flex flex-col ${
                isActive
                  ? "border-[#d4a017] bg-[#fdfaf6] shadow-premium-3d"
                  : "border-[#8c6239]/10 bg-white hover:border-[#8c6239]/20"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 bg-[#d4a017] text-[#2b180d] text-[8px] font-bold uppercase py-1 px-3 rounded-bl-xl flex items-center gap-1 shadow-sm">
                  <Award className="w-3 h-3" />
                  <span>Current active tier</span>
                </div>
              )}

              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="text-xs font-extrabold text-[#3d2314] uppercase tracking-wide">
                    {plan.name}
                  </h5>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{plan.dailyEarnings}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-[#3d2314] font-mono">
                    {formatNaira(plan.price).split(".")[0]}
                  </p>
                  <p className="text-[8px] text-[#8c6239]/60 font-semibold uppercase">One-time Fee</p>
                </div>
              </div>

              {/* Plan Features */}
              <ul className="space-y-1.5 my-3 text-[10px] text-[#3d2314]/80">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-[#d4a017] shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Purchase Button */}
              <button
                onClick={() => handlePurchasePlan(plan)}
                disabled={isActive || loadingPlanId !== null}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#faf7f2] text-[#8c6239]/60 border border-[#8c6239]/20 cursor-not-allowed"
                    : "bg-[#3d2314] text-white hover:bg-[#2b180d] active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5"
                }`}
              >
                {loadingPlanId === plan.id ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isActive ? (
                  <span>Active & Verified</span>
                ) : (
                  <span>Unlock for {formatNaira(plan.price).split(".")[0]}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Deposit Modal Pop-up overlay */}
      <AnimatePresence>
        {isDepositModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDepositModalOpen(false)}
              className="absolute inset-0 bg-[#2b180d]/60 backdrop-blur-xs"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-[380px] bg-white rounded-t-[32px] border-t border-[#d4a017]/30 p-6 shadow-2xl z-55 flex flex-col space-y-4 text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-[#8c6239]/10">
                <div>
                  <h3 className="text-sm font-black text-[#3d2314] flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#d4a017] animate-pulse" />
                    <span>Secure Deposit Fund</span>
                  </h3>
                  <p className="text-[9px] text-[#8c6239]/70 font-semibold tracking-wider uppercase">Live Paystack Integration</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="p-2 rounded-xl bg-[#f4eee1] hover:bg-[#ebdcb9] border border-[#8c6239]/10 text-[#3d2314] transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-[#8c6239]" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handlePaystackPayment} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-[#3d2314] uppercase tracking-wider mb-1.5">
                    Enter Deposit Amount (NGN)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-bold text-[#d4a017]">
                      ₦
                    </span>
                    <input
                      type="number"
                      value={depositAmountInput}
                      onChange={(e) => setDepositAmountInput(e.target.value)}
                      placeholder="e.g. 5000"
                      required
                      min="100"
                      className="w-full pl-8 pr-4 py-3 bg-[#fdfaf6] border border-[#8c6239]/20 rounded-xl text-sm font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#8c6239] focus:border-[#3d2314] transition-all text-[#3d2314] placeholder-[#8c6239]/40"
                    />
                  </div>
                </div>

                {/* Preset Fast Selection Tags */}
                <div className="grid grid-cols-4 gap-2">
                  {[1000, 2500, 5000, 10000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDepositAmountInput(preset.toString())}
                      className="py-1.5 rounded-lg border border-[#8c6239]/15 hover:border-[#d4a017] hover:bg-[#fdfaf6] bg-white text-[10px] font-bold text-[#3d2314] transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      +{preset.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Billing details info */}
                <div className="p-3.5 bg-[#fdfaf6] rounded-xl border border-[#8c6239]/10 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-medium text-[#3d2314]">
                    <span className="text-[#8c6239]">Cardholder Email</span>
                    <span className="font-semibold text-right truncate max-w-[180px]">{email || "loading..."}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-medium text-[#3d2314]">
                    <span className="text-[#8c6239]">Processing Gateway</span>
                    <span className="font-semibold text-emerald-600">Paystack (NGN)</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-medium text-[#3d2314]">
                    <span className="text-[#8c6239]">Network Fee</span>
                    <span className="font-bold text-amber-600">FREE</span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#3d2314] to-[#2b180d] hover:from-[#2b180d] hover:to-[#1a0f08] border border-[#d4a017]/20 cursor-pointer transition-all active:scale-95 shadow-premium-3d flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#d4a017]" />
                  <span>Initiate Paystack Pay</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
