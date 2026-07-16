import React, { useState } from "react";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Shield, User, Lock, Eye, EyeOff, Coins, ArrowRight, Mail, Phone, Tag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthScreenProps {
  onAuthSuccess: (username: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Registration fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [referral, setReferral] = useState("");
  
  // Shared fields
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-detect ref code from URL parameters
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      setReferral(refCode);
      // Optional: switch to registration mode if referral is present
      setIsLogin(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (isLogin) {
      // --- LOGIN FLOW ---
      if (!cleanEmail || !cleanPassword) {
        setError("Please enter your email and password.");
        return;
      }

      setLoading(true);

      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", cleanEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("No user found with this email address.");
          setLoading(false);
          return;
        }

        // Check password matching
        let matchedUser = null;
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.password === cleanPassword) {
            matchedUser = { id: doc.id, ...data };
          }
        });

        if (matchedUser) {
          setSuccess("Access Granted. Preparing vault...");
          setTimeout(() => {
            onAuthSuccess((matchedUser as any).id);
          }, 1200);
        } else {
          setError("Invalid password. Please try again.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An unexpected login error occurred.");
      } finally {
        setLoading(false);
      }
    } else {
      // --- REGISTRATION FLOW ---
      const cleanUsername = username.trim().toLowerCase();
      const cleanFirstName = firstName.trim();
      const cleanLastName = lastName.trim();
      const cleanPhone = phone.trim();
      const cleanReferral = referral.trim();

      if (!cleanFirstName || !cleanLastName || !cleanUsername || !cleanEmail || !cleanPhone || !cleanPassword) {
        setError("Please fill in all required fields.");
        return;
      }

      if (cleanUsername.length < 3) {
        setError("Username must be at least 3 characters.");
        return;
      }

      setLoading(true);

      try {
        const userRef = doc(db, "users", cleanUsername);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setError("Username is already taken. Try another.");
          setLoading(false);
          return;
        }

        // Also check if email is already registered
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", cleanEmail));
        const emailSnap = await getDocs(q);

        if (!emailSnap.empty) {
          setError("Email address is already registered.");
          setLoading(false);
          return;
        }

        // Find referral from state or direct URL parameter
        const params = new URLSearchParams(window.location.search);
        const refFromUrl = params.get("ref")?.trim() || null;
        const finalReferral = cleanReferral || refFromUrl;

        // Save all specified fields to Firestore using Username as unique Document ID
        await setDoc(userRef, {
          firstName: cleanFirstName,
          lastName: cleanLastName,
          username: cleanUsername,
          email: cleanEmail,
          phone: cleanPhone,
          referral: finalReferral || null,
          referredBy: finalReferral || null,
          password: cleanPassword,
          depositBalance: 0,
          referralBalance: 0,
          taskBalance: 0,
          currentPlan: "None",
          createdAt: new Date().toISOString(),
        });

        setSuccess("Registration Complete! Switch to Login.");
        
        // Reset registration fields
        setFirstName("");
        setLastName("");
        setUsername("");
        setPhone("");
        setReferral("");
        setPassword("");
        
        // Wait and switch to login tab
        setTimeout(() => {
          setIsLogin(true);
          setSuccess(null);
        }, 1500);

      } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred during registration.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 px-6 justify-between py-6 overflow-y-auto">
      {/* Top Branding Section */}
      <div className="flex flex-col items-center text-center mt-3 mb-4">
        {/* Animated Custom 3D Logo Accent */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3d2314] to-[#8c6239] flex items-center justify-center shadow-premium-3d transform rotate-12 relative z-10 border border-[#d4a017]/40">
            <Coins className="w-8 h-8 text-[#d4a017] transform -rotate-12 animate-pulse" />
          </div>
          {/* Decorative glowing backdrops */}
          <div className="absolute top-1 left-1 w-16 h-16 rounded-2xl bg-[#d4a017]/20 -rotate-6 scale-105 blur-xs"></div>
          <div className="absolute -top-1 -left-1 w-16 h-16 rounded-2xl bg-[#3d2314]/10 rotate-45 scale-95"></div>
        </div>

        <h1 className="text-2xl font-bold font-display tracking-tight text-[#3d2314] mb-0.5">
          Kudi<span className="text-[#8c6239] font-medium">Grid</span>
        </h1>
        <p className="text-[10px] text-[#8c6239]/80 uppercase tracking-widest font-semibold font-display">
          👑 3D Luxury Wealth Portal 👑
        </p>
      </div>

      {/* Main Auth Form Container */}
      <div className="my-auto">
        {/* Tab Toggle */}
        <div className="flex p-1 bg-[#f4eee1] rounded-xl mb-4 shadow-inner border border-[#8c6239]/10">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 font-display cursor-pointer ${
              isLogin
                ? "bg-[#3d2314] text-white shadow-[0_4px_10px_rgba(61,35,20,0.25)]"
                : "text-[#3d2314]/70 hover:text-[#3d2314]"
            }`}
          >
            Login Access
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 font-display cursor-pointer ${
              !isLogin
                ? "bg-[#3d2314] text-white shadow-[0_4px_10px_rgba(61,35,20,0.25)]"
                : "text-[#3d2314]/70 hover:text-[#3d2314]"
            }`}
          >
            Create Vault
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isLogin ? (
            // --- LOGIN FIELDS ---
            <>
              <div>
                <label className="block text-[10px] font-semibold text-[#3d2314] uppercase tracking-wider mb-1 ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Mail className="h-4 w-4 text-[#8c6239]/70" />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#fdfaf6] border border-[#8c6239]/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8c6239] focus:border-[#3d2314] transition-all text-[#3d2314] placeholder-[#8c6239]/40 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#3d2314] uppercase tracking-wider mb-1 ml-1">
                  Secret Passkey
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Lock className="h-4 w-4 text-[#8c6239]/70" />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-[#fdfaf6] border border-[#8c6239]/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8c6239] focus:border-[#3d2314] transition-all text-[#3d2314] placeholder-[#8c6239]/40 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#8c6239]/70 hover:text-[#3d2314]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            // --- REGISTRATION FIELDS ---
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[#3d2314] uppercase tracking-wider mb-1 ml-1">
                    First Name
                  </label>
                  <input
                    id="reg-firstname"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Adewale"
                    required
                    className="w-full px-3 py-2 bg-[#fdfaf6] border border-[#8c6239]/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8c6239] focus:border-[#3d2314] transition-all text-[#3d2314] placeholder-[#8c6239]/40 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#3d2314] uppercase tracking-wider mb-1 ml-1">
                    Last Name
                  </label>
                  <input
                    id="reg-lastname"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Premium"
                    required
                    className="w-full px-3 py-2 bg-[#fdfaf6] border border-[#8c6239]/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8c6239] focus:border-[#3d2314] transition-all text-[#3d2314] placeholder-[#8c6239]/40 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#3d2314] uppercase tracking-wider mb-1 ml-1">
                  Username ID
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <User className="h-4 w-4 text-[#8c6239]/70" />
                  </span>
                  <input
                    id="reg-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter unique ID"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-[#fdfaf6] border border-[#8c6239]/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8c6239] focus:border-[#3d2314] transition-all text-[#3d2314] placeholder-[#8c6239]/40 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#3d2314] uppercase tracking-wider mb-1 ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Mail className="h-4 w-4 text-[#8c6239]/70" />
                  </span>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-[#fdfaf6] border border-[#8c6239]/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8c6239] focus:border-[#3d2314] transition-all text-[#3d2314] placeholder-[#8c6239]/40 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#3d2314] uppercase tracking-wider mb-1 ml-1">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Phone className="h-4 w-4 text-[#8c6239]/70" />
                  </span>
                  <input
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234..."
                    required
                    className="w-full pl-10 pr-4 py-2 bg-[#fdfaf6] border border-[#8c6239]/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8c6239] focus:border-[#3d2314] transition-all text-[#3d2314] placeholder-[#8c6239]/40 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#3d2314] uppercase tracking-wider mb-1 ml-1">
                  Referral Code (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Tag className="h-4 w-4 text-[#8c6239]/70" />
                  </span>
                  <input
                    id="reg-referral"
                    type="text"
                    value={referral}
                    onChange={(e) => setReferral(e.target.value)}
                    placeholder="e.g. ADEWALE"
                    className="w-full pl-10 pr-4 py-2 bg-[#fdfaf6] border border-[#8c6239]/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8c6239] focus:border-[#3d2314] transition-all text-[#3d2314] placeholder-[#8c6239]/40 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#3d2314] uppercase tracking-wider mb-1 ml-1">
                  Secret Passkey
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Lock className="h-4 w-4 text-[#8c6239]/70" />
                  </span>
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2 bg-[#fdfaf6] border border-[#8c6239]/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8c6239] focus:border-[#3d2314] transition-all text-[#3d2314] placeholder-[#8c6239]/40 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#8c6239]/70 hover:text-[#3d2314]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Feedback Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] font-medium flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0"></div>
                <span>{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-medium flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0"></div>
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 px-4 rounded-xl text-white font-semibold text-sm tracking-wide bg-gradient-to-r from-[#3d2314] to-[#2b180d] hover:from-[#2b180d] hover:to-[#1a0f08] border border-[#d4a017]/20 transition-all duration-300 transform active:scale-[0.98] shadow-premium-3d flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#d4a017] border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{isLogin ? "Secure Login" : "Complete registration"}</span>
                <ArrowRight className="w-4 h-4 text-[#d4a017]" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Trust & Footer Info */}
      <div className="text-center mt-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f4eee1] rounded-full border border-[#8c6239]/10 text-[9px] font-semibold text-[#8c6239] tracking-wider uppercase mb-2">
          <Shield className="w-3 h-3 text-[#d4a017]" />
          Bank-grade 256-bit protection
        </div>
        <p className="text-[9px] text-[#8c6239]/60 leading-relaxed font-display">
          By continuing, you authorize secure cryptographic handshakes on the KudiGrid ledger.
        </p>
      </div>
    </div>
  );
}
