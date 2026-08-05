import React, { useState } from "react";
import { doc, getDoc, setDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { 
  TrendingUp, Mail, User, Lock, 
  ArrowRight, Phone, Sparkles, 
  Loader2, CheckCircle2, ChevronRight,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useGlobalSettings } from "../hooks/useGlobalSettings";

interface AuthScreenProps {
  onAuthSuccess: (username: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const { settings } = useGlobalSettings();

  const isRegistrationOpen = settings?.portals?.registration !== false;
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
// ... (rest of the fields)
  
  // Registration fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referredBy, setReferredBy] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse referral code from URL if present
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferredBy(ref);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Login Logic
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error("Invalid Email Address or Password.");
        } else {
          const userDoc = querySnapshot.docs[0];
          if (userDoc.data().password !== password) {
            throw new Error("Invalid Password.");
          }
          onAuthSuccess(userDoc.data().username);
        }
      } else {
        // Registration Logic
        if (!isRegistrationOpen) {
          throw new Error("Registration is currently closed. Please contact support.");
        }
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        if (username.length < 3) throw new Error("Username too short.");
        
        const userRef = doc(db, "users", username.trim());
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) throw new Error("Username already exists.");

        await setDoc(userRef, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          email: email.toLowerCase().trim(),
          phoneNumber: phoneNumber.trim(),
          password,
          referredBy: referredBy.trim() || null,
          depositBalance: 0,
          referralBalance: 0,
          taskBalance: 0,
          totalReferrals: 0,
          totalReferralEarnings: 0,
          referralRewardPaid: false,
          currentPlan: "None",
          createdAt: new Date().toISOString(),
          isAdmin: false
        });
        onAuthSuccess(username.trim());
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white relative overflow-hidden font-sans">
      <div className="flex-1 overflow-y-auto px-6 pb-12 pt-16 space-y-10 custom-scrollbar relative z-10">
        
        {/* Branding */}
        <div className="space-y-4 text-center">
          <div className="flex flex-col items-center gap-3">
            <motion.div 
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100 relative group"
            >
              <TrendingUp className="w-6 h-6 relative z-10" />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">KudaGrid</h1>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              {isLogin ? "Login to your account" : "Create an account"}
            </h2>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold flex items-center gap-2"
              >
                <div className="w-1 h-1 bg-red-500 rounded-full" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {isLogin ? (
              <>
                {/* Login Fields */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Email Address</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email" placeholder="Enter your email" required
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-14 pl-12 pr-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Password</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password" placeholder="Enter your password" required
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-14 pl-12 pr-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Registration Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">First Name</label>
                    <input
                      type="text" placeholder="First Name" required
                      value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      className="w-full h-14 px-5 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Last Name</label>
                    <input
                      type="text" placeholder="Last Name" required
                      value={lastName} onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-14 px-5 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Username</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text" placeholder="Enter username" required
                      value={username} onChange={(e) => setUsername(e.target.value)}
                      className="w-full h-14 pl-12 pr-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Email Address</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email" placeholder="Enter your email" required
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-14 pl-12 pr-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Phone Number</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel" placeholder="Enter phone number" required
                      value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full h-14 pl-12 pr-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Password</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password" placeholder="Enter password" required
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-14 pl-12 pr-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password" placeholder="Confirm password" required
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-14 pl-12 pr-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Referral Code (Optional)</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <input
                      type="text" placeholder="Referral code"
                      value={referredBy} onChange={(e) => setReferredBy(e.target.value)}
                      className="w-full h-14 pl-12 pr-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <> {isLogin ? "Login" : "Register"} <ArrowRight className="w-4 h-4" /> </>}
          </motion.button>
          
          {isLogin && (
            <button
              type="button"
              className="w-full text-center text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
            >
              Forgot Password?
            </button>
          )}
        </form>

        <div className="flex flex-col items-center gap-3 pt-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { 
              if (isLogin && !isRegistrationOpen) {
                setError("Registration is currently closed.");
                return;
              }
              setIsLogin(!isLogin); 
              setError(null); 
            }}
            className={`px-8 py-3 rounded-full border border-slate-100 text-slate-900 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-sm ${isLogin && !isRegistrationOpen ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
          >
            {isLogin ? "Register" : "Login"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

