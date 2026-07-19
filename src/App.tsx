import { useState, useEffect } from "react";
import AuthScreen from "./components/AuthScreen";
import DashboardScreen from "./components/DashboardScreen";
import UpgradeScreen from "./components/UpgradeScreen";
import WithdrawScreen from "./components/WithdrawScreen";
import DailyTasksScreen from "./components/DailyTasksScreen";
import AdminPanelScreen from "./components/AdminPanelScreen";
import { AccountRecovery } from "./components/AccountRecovery";
import { AppScreen } from "./types";
import { Wifi, Battery, Signal, Shield, Coins, Sparkles } from "lucide-react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [screen, setScreen] = useState<AppScreen>(AppScreen.AUTH);
  const [time, setTime] = useState("");

  // Firestore user profile states
  const [depositBalance, setDepositBalance] = useState<number>(0);
  const [referralBalance, setReferralBalance] = useState<number>(0);
  const [taskBalance, setTaskBalance] = useState<number>(0);
  const [currentPlan, setCurrentPlan] = useState<string>("None");
  const [userLoading, setUserLoading] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [dashboardTab, setDashboardTab] = useState<"home" | "referral" | "profile">("home");
  const [showRecovery, setShowRecovery] = useState(false);

  // Update mock phone clock in the status bar dynamically
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setTime(`${hours}:${minutes} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen to Firestore real-time changes
  useEffect(() => {
    if (!username) {
      setUserLoading(false);
      return;
    }
    setUserLoading(true);
    const userRef = doc(db, "users", username);
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDepositBalance(data.depositBalance ?? data.balance ?? 0);
          setReferralBalance(data.referralBalance ?? 0);
          setTaskBalance(data.taskBalance ?? 0);
          setCurrentPlan(data.currentPlan ?? "None");
          setIsAdmin(data.isAdmin ?? false);
          setEmail(data.email ?? "");

          // Check if user needs recovery (only run once)
          if (data.recoveryStatus !== "completed") {
            setShowRecovery(true);
          } else {
            setShowRecovery(false);
          }
        } else {
          setDepositBalance(0);
          setReferralBalance(0);
          setTaskBalance(0);
          setCurrentPlan("None");
          setIsAdmin(false);
          setEmail("");
        }
        setUserLoading(false);
      },
      (error) => {
        console.error("Firestore balance sync error:", error);
        setUserLoading(false);
      }
    );
    return () => unsubscribe();
  }, [username]);

  const handleAuthSuccess = (authedUsername: string) => {
    setUsername(authedUsername);
    setScreen(AppScreen.DASHBOARD);
  };

  const handleLogout = () => {
    setUsername(null);
    setScreen(AppScreen.AUTH);
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f1ee] flex flex-col md:flex-row items-center justify-center p-0 md:p-8 select-none">
      
      {/* Brand details visible on desktop, hidden on small screens (aligned with Design HTML) */}
      <div className="hidden md:flex flex-col max-w-sm mr-16 space-y-5 text-[#3d2314] self-center">
        <div>
          <span className="inline-block px-3 py-1.5 bg-[#d4a017] text-[#3d2314] font-extrabold text-[10px] rounded uppercase tracking-wider mb-4 shadow-sm">
            Premium Tier
          </span>
          <h1 className="font-serif font-bold text-5xl leading-none tracking-tight mb-5 text-[#3d2314]">
            Kudi<br />Grid.
          </h1>
          <p className="text-sm leading-relaxed text-[#3d2314]/70 font-medium max-w-xs">
            Experience the next generation of African wealth management. Seamless, secure, and purely premium.
          </p>
        </div>

        <div className="p-5 bg-white border border-[#d4a017]/25 rounded-3xl shadow-premium-3d space-y-3.5 max-w-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#3d2314] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#d4a017]" />
            VIP Access Node
          </h3>
          <ul className="space-y-2 text-xs text-[#3d2314]/80 font-medium">
            <li className="flex items-center gap-2">
              <span className="text-[#d4a017]">✓</span> Real-time Firestore balance updates
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#d4a017]">✓</span> Luxury Gold & Chocolate aesthetic
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#d4a017]">✓</span> Instant Account Upgrade (👑 ₦1,000)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#d4a017]">✓</span> Luxury 1-click Turbo Booster (+₦5,000)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#d4a017]">✓</span> Live SMS, airtime & data utilities
            </li>
          </ul>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase text-[#8c6239] pl-1">
          <Shield className="w-4 h-4 text-[#d4a017]" />
          Secured with active snapshot ledger
        </div>
      </div>

      {/* Center Simulated Premium Mobile Shell */}
      <div className="w-full max-w-[380px] md:rounded-[40px] md:border-[8px] md:border-[#2b180d] bg-white md:shadow-[0_40px_100px_rgba(61,35,20,0.2)] relative flex flex-col min-h-screen md:min-h-[720px] md:max-h-[720px] overflow-hidden">
        
        {/* Mock Physical Camera Notch / Dynamic Island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-55 flex items-center justify-center pointer-events-none hidden md:flex">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800 ml-auto mr-4"></div>
        </div>

        {/* Mock Status Bar */}
        <div className="pt-3 px-6 pb-2 bg-white flex justify-between items-center z-40 text-[#3d2314]/80 text-xs font-bold relative border-b border-[#8c6239]/5">
          {/* Status Bar Left: Clock */}
          <span className="font-display tracking-tight text-[11px]">
            {time || "12:00 PM"}
          </span>
          
          {/* Status Bar Right: Icons */}
          <div className="flex items-center gap-1.5 text-[#3d2314]/70">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* Content Screens inside phone */}
        <div className="flex-1 flex flex-col overflow-y-auto relative bg-white">
          {/* Account Recovery Overlay */}
          {showRecovery && username && (
            <AccountRecovery 
              username={username} 
              onComplete={() => setShowRecovery(false)} 
            />
          )}
          <AnimatePresence mode="wait">
            {screen === AppScreen.AUTH ? (
              <motion.div
                key="auth"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col flex-1"
              >
                <AuthScreen onAuthSuccess={handleAuthSuccess} />
              </motion.div>
            ) : screen === AppScreen.DASHBOARD ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col flex-1"
              >
                <DashboardScreen
                  username={username || "User"}
                  depositBalance={depositBalance}
                  referralBalance={referralBalance}
                  taskBalance={taskBalance}
                  currentPlan={currentPlan}
                  loading={userLoading}
                  onLogout={handleLogout}
                  onNavigateToUpgrade={() => setScreen(AppScreen.UPGRADE)}
                  onNavigateToWithdraw={() => setScreen(AppScreen.WITHDRAW)}
                  onNavigateToTasks={() => setScreen(AppScreen.TASKS)}
                  onNavigateToAdmin={() => setScreen(AppScreen.ADMIN)}
                  email={email}
                  initialTab={dashboardTab}
                  onTabChange={setDashboardTab}
                />
              </motion.div>
            ) : screen === AppScreen.UPGRADE ? (
              <motion.div
                key="upgrade"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col flex-1"
              >
                <UpgradeScreen
                  username={username || "User"}
                  depositBalance={depositBalance}
                  currentPlan={currentPlan}
                  email={email}
                  onBack={() => setScreen(AppScreen.DASHBOARD)}
                />
              </motion.div>
            ) : screen === AppScreen.WITHDRAW ? (
              <motion.div
                key="withdraw"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col flex-1"
              >
                <WithdrawScreen
                  username={username || "User"}
                  taskBalance={taskBalance}
                  referralBalance={referralBalance}
                  currentPlan={currentPlan}
                  onBack={() => setScreen(AppScreen.DASHBOARD)}
                />
              </motion.div>
            ) : screen === AppScreen.ADMIN ? (
              <motion.div
                key="admin"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col flex-1"
              >
                <AdminPanelScreen
                  currentAdminUsername={username || "Admin"}
                  onBack={() => setScreen(AppScreen.DASHBOARD)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col flex-1"
              >
                <DailyTasksScreen
                  username={username || "User"}
                  taskBalance={taskBalance}
                  currentPlan={currentPlan}
                  onBack={() => setScreen(AppScreen.DASHBOARD)}
                  onNavigateToVault={() => {
                    setDashboardTab("home");
                    setScreen(AppScreen.DASHBOARD);
                  }}
                  onNavigateToReferral={() => {
                    setDashboardTab("referral");
                    setScreen(AppScreen.DASHBOARD);
                  }}
                  onNavigateToIdentity={() => {
                    setDashboardTab("profile");
                    setScreen(AppScreen.DASHBOARD);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
