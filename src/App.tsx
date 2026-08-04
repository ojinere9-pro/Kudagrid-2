import { useState, useEffect } from "react";
import AuthScreen from "./components/AuthScreen";
import DashboardScreen from "./components/DashboardScreen";
import UpgradeScreen from "./components/UpgradeScreen";
import WithdrawScreen from "./components/WithdrawScreen";
import DailyTasksScreen from "./components/DailyTasksScreen";
import AdminPanelScreen from "./components/AdminPanelScreen";
import FloatingSupport from "./components/FloatingSupport";
import TelegramModal from "./components/TelegramModal";
import { AppScreen } from "./types";
import { Wifi, Battery, Signal, Shield, Coins, Sparkles, TrendingUp, CheckCircle2 } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
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
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [userLoading, setUserLoading] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [dashboardTab, setDashboardTab] = useState<"home" | "referral" | "profile">("home");
  const [initialWithdrawalWallet, setInitialWithdrawalWallet] = useState<"commission" | "referral">("commission");

  // Update mock phone clock in the status bar dynamically
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; 
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
    setShowTelegramModal(true);
  };

  const handleLogout = () => {
    setUsername(null);
    setScreen(AppScreen.AUTH);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col md:flex-row items-center justify-center p-0 md:p-8 select-none font-sans">
      
      {/* Brand details visible on desktop */}
      <div className="hidden lg:flex flex-col max-w-sm mr-24 space-y-8 self-center">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-[22px] bg-blue-600 flex items-center justify-center text-white shadow-blue-light">
              <TrendingUp className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tighter">KudaGrid</h1>
          </div>
          <h2 className="text-5xl font-bold text-slate-900 leading-[1.1] tracking-tight">
            Grow your wealth with <span className="text-blue-600 font-semibold">KudaGrid</span>.
          </h2>
          <p className="text-lg text-slate-500 font-medium leading-relaxed">
            Experience a simple and secure way to earn through daily tasks and networking.
          </p>
        </div>

        <div className="p-10 bg-white rounded-[48px] shadow-premium border border-slate-100 space-y-8">
          <h3 className="text-[10px] font-bold uppercase tracking-[4px] text-blue-600 flex items-center gap-3">
            <Sparkles className="w-4 h-4" />
            Platform Features
          </h3>
          <ul className="space-y-5 text-sm text-slate-600 font-medium">
            {[
              "Real-time wallet tracking",
              "Modern White & Blue design",
              "Secure withdrawals",
              "Daily task rewards",
              "24/7 support access"
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-4">
                <CheckCircle2 className="w-5 h-5 text-blue-500 opacity-60" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[4px] text-slate-300">
          <Shield className="w-5 h-5 text-blue-600" />
          Secure Protocol Enabled
        </div>
      </div>

      {/* Center Simulated Premium Mobile Shell */}
      <div className="w-full max-w-[400px] md:rounded-[56px] md:border-[12px] md:border-slate-900 bg-white md:shadow-[0_60px_100px_-20px_rgba(0,0,0,0.2)] relative flex flex-col min-h-screen md:min-h-[812px] md:max-h-[812px] overflow-hidden">
        
        {/* Mock Physical Camera Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-55 flex items-center justify-center pointer-events-none hidden md:flex">
          <div className="w-10 h-0.5 bg-slate-800 rounded-full"></div>
        </div>

        {/* Mock Status Bar */}
        <div className="pt-4 px-8 pb-2 bg-white flex justify-between items-center z-40 text-slate-900 text-[10px] font-bold relative tracking-tight">
          <span>{time || "12:00 PM"}</span>
          <div className="flex items-center gap-1.5 opacity-40">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <Battery className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Content Screens */}
        <div className="flex-1 flex flex-col overflow-y-auto relative bg-white custom-scrollbar">
          <AnimatePresence mode="wait">
            {screen === AppScreen.AUTH ? (
              <motion.div
                key="auth"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col flex-1"
              >
                <AuthScreen onAuthSuccess={handleAuthSuccess} />
              </motion.div>
            ) : screen === AppScreen.DASHBOARD ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
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
                  onNavigateToWithdraw={(wallet) => {
                    if (wallet) setInitialWithdrawalWallet(wallet);
                    setScreen(AppScreen.WITHDRAW);
                  }}
                  onNavigateToTasks={() => setScreen(AppScreen.TASKS)}
                  onNavigateToAdmin={() => setScreen(AppScreen.ADMIN)}
                  email={email}
                  initialTab={dashboardTab}
                  onTabChange={setDashboardTab}
                  isAdmin={isAdmin}
                />
              </motion.div>
            ) : screen === AppScreen.UPGRADE ? (
              <motion.div
                key="upgrade"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col flex-1"
              >
                <WithdrawScreen
                  username={username || "User"}
                  taskBalance={taskBalance}
                  referralBalance={referralBalance}
                  currentPlan={currentPlan}
                  initialWallet={initialWithdrawalWallet}
                  onBack={() => setScreen(AppScreen.DASHBOARD)}
                />
              </motion.div>
            ) : screen === AppScreen.ADMIN ? (
              <motion.div
                key="admin"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
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
        
        {/* Floating Support Button */}
        {username && <FloatingSupport />}
        
        <TelegramModal isOpen={showTelegramModal} onClose={() => setShowTelegramModal(false)} />
      </div>
    </div>
  );
}
