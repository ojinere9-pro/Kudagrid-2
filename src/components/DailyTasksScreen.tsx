import React, { useState, useEffect } from "react";
import { doc, collection, onSnapshot, runTransaction, increment, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { 
  ArrowLeft, Download, Check, Loader2, Sparkles, AlertCircle, 
  Facebook, CheckCircle2, Copy,
  Send, UserPlus, Image as ImageIcon, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { InvestmentPlan } from "../types";
import { useGlobalSettings } from "../hooks/useGlobalSettings";

interface DailyTasksScreenProps {
  username: string;
  taskBalance: number;
  currentPlan: string;
  onBack: () => void;
  onNavigateToVault?: () => void;
  onNavigateToReferral?: () => void;
  onNavigateToIdentity?: () => void;
}

interface CompletedTaskRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  rewardAmount: number;
  timestamp: string;
  status: string;
}

export default function DailyTasksScreen({
  username,
  taskBalance,
  currentPlan,
  onBack,
  onNavigateToVault,
  onNavigateToReferral,
  onNavigateToIdentity,
}: DailyTasksScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [taskStarted, setTaskStarted] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<CompletedTaskRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentDomain, setCurrentDomain] = useState("https://kudagrid.com");
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const { settings } = useGlobalSettings();

  const isPortalOpen = settings?.portals?.dailyTasks !== false;

  useEffect(() => {
    const plansQuery = query(collection(db, "investment_plans"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(plansQuery, (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestmentPlan)));
    });
    return () => unsubscribe();
  }, []);

  const PLATFORMS = ["Telegram", "Facebook", "WhatsApp", "DM"] as const;
  type Platform = (typeof PLATFORMS)[number];
  
  const [activePlatform, setActivePlatform] = useState<Platform | null>(null);
  const [view, setView] = useState<"list" | "details">("list");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentDomain(window.location.origin + window.location.pathname);
    }
  }, []);

  const activePlanData = plans.find(p => p.name === currentPlan);
  const dailyReward = activePlanData?.earningsPerTask || 0;
  const totalTasksAllowed = activePlanData?.dailyTasks || 0;
// ... (rest of the component logic)

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    if (!username) return;

    setLoadingHistory(true);
    const completedRef = collection(db, "users", username, "completedTasks");
    
    const unsubscribe = onSnapshot(
      completedRef,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<CompletedTaskRecord, "id">),
        }));
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setCompletedTasks(list);
        setLoadingHistory(false);
      },
      (err) => {
        console.error("Failed to sync completed tasks history:", err);
        setLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, [username]);

  const getTodayCompletedCount = () => {
    const today = new Date().toISOString().split('T')[0];
    return completedTasks.filter(task => task.timestamp.includes(today)).length;
  };

  const isTaskCompleted = (platform: Platform) => {
    const today = new Date().toISOString().split('T')[0];
    return completedTasks.some(
      (task) => task.taskId === `sponsored_post_${platform}_${today}`
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartTask = (platform: Platform) => {
    if (platform === "Telegram") {
      window.open("https://t.me/share/url?url=" + encodeURIComponent(currentDomain), "_blank");
    } else if (platform === "WhatsApp") {
      window.open("https://wa.me/?text=" + encodeURIComponent(`Join KudaGrid and earn daily! ${currentDomain}?ref=${username}`), "_blank");
    } else if (platform === "Facebook") {
      window.open("https://facebook.com/groups", "_blank");
    } else if (platform === "DM") {
      setSuccess("Share the banner via DM to friends.");
      setTimeout(() => setSuccess(null), 3000);
    }
    setTaskStarted(true);
  };

  const generateSvgBanner = (refUsername: string) => {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1250" width="100%" height="100%">
      <rect width="1000" height="1250" fill="#2563EB" />
      <circle cx="500" cy="625" r="500" fill="#1D4ED8" opacity="0.5" />
      <text x="500" y="200" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="900" font-size="80">KUDAGRID</text>
      <text x="500" y="300" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="700" font-size="40" opacity="0.8">Premium Task Earnings</text>
      <rect x="100" y="400" width="800" height="400" rx="40" fill="white" />
      <text x="500" y="550" text-anchor="middle" fill="#2563EB" font-family="sans-serif" font-weight="900" font-size="100">PAYDAY!</text>
      <text x="500" y="650" text-anchor="middle" fill="#1F2937" font-family="sans-serif" font-weight="700" font-size="40">Earn daily commission now.</text>
      <text x="500" y="720" text-anchor="middle" fill="#2563EB" font-family="sans-serif" font-weight="900" font-size="50">Join @${refUsername}</text>
    </svg>`;
  };

  const handleDownloadBanner = () => {
    if (!settings?.taskBannerUrl) return;
    try {
      const link = document.createElement("a");
      link.href = settings.taskBannerUrl;
      link.download = `kudagrid_promo_${username}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccess("Banner secured!");
    } catch (err) {
      setError("Download failed.");
    }
  };

  const handleCopyCaption = () => {
    const textToCopy = settings?.taskCaption || `💙 I'm earning real money from KudaGrid by completing simple daily online tasks!\n\nJoin thousands of Nigerians already earning every day. Register now, activate a plan, complete daily tasks, earn referral bonuses, and withdraw directly to your bank account.\n\n🚀 Join KudaGrid today and start earning!`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setSuccess("Caption secured!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!isPortalOpen) {
      setError("Task center is temporarily offline.");
      return;
    }
    if (dailyReward <= 0) {
      setError("Premium Tier required.");
      return;
    }
    if (getTodayCompletedCount() >= totalTasksAllowed) {
      setError("Daily limit reached.");
      return;
    }
    if (!screenshotFile || !activePlatform) {
      setError("Proof required.");
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, "users", username);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("Account not found.");

        const data = userDoc.data();
        const plan = plans.find(p => p.name === data.currentPlan);
        if (!plan) throw new Error("Tier required.");

        const todayKey = new Date().toISOString().split('T')[0];
        const taskId = `task_${activePlatform}_${todayKey}_${Date.now()}`;

        transaction.update(userRef, { taskBalance: increment(plan.earningsPerTask) });
        const completedTaskRef = doc(db, "users", username, "completedTasks", taskId);
        transaction.set(completedTaskRef, {
          taskId,
          username,
          taskTitle: `Mission: ${activePlatform}`,
          rewardAmount: plan.earningsPerTask,
          platform: activePlatform,
          timestamp: new Date().toISOString(),
          status: "Verified",
        });
      });

      setSuccess(`Verified! ${formatNaira(dailyReward)} added.`);
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setTaskStarted(false);
      setView("list");
      setActivePlatform(null);
    } catch (err: any) {
      setError(err.message || "Failed to verify.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white overflow-hidden relative h-full font-sans">
      <AnimatePresence>
        {(error || success) && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-premium border flex items-center gap-2.5 w-[90%] max-w-[340px] ${success ? "bg-white border-blue-100 text-blue-700" : "bg-white border-red-100 text-red-600"}`}>
            <div className={`w-2 h-2 rounded-full ${success ? "bg-blue-500" : "bg-red-500"}`} />
            <span className="text-[13px] font-medium leading-tight">{success || error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center px-6 pt-10 pb-4 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <button onClick={view === "details" ? () => { setView("list"); setTaskStarted(false); setActivePlatform(null); } : onBack} className="p-2 rounded-full bg-slate-50 text-slate-400 active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="ml-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Earn Rewards</p>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">{view === "details" ? `${activePlatform} Proof` : "Daily Tasks"}</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-12 space-y-8 custom-scrollbar">
        {view === "list" ? (
          <div className="space-y-8 relative">
            {!isPortalOpen && (
              <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-[32px] text-center p-8">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-red-500" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Task Center Offline</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2 max-w-[200px]">Tasks are temporarily closed for maintenance.</p>
              </div>
            )}
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100"
            >
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Today's Progress</h3>
              <div className="px-3 py-1 bg-white text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-50 shadow-sm">
                {getTodayCompletedCount()} / {totalTasksAllowed} Completed
              </div>
            </motion.div>

            <div className="grid gap-4">
              {PLATFORMS.map((platform, idx) => {
                const completed = isTaskCompleted(platform);
                return (
                  <motion.button 
                    key={platform} 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => { if (!completed && isPortalOpen) { setActivePlatform(platform); setView("details"); } }} 
                    disabled={completed || !isPortalOpen} 
                    className={`group w-full p-6 rounded-[32px] border transition-all duration-300 flex items-center justify-between ${completed ? "border-slate-50 bg-slate-50/50" : "border-slate-100 bg-white hover:border-blue-100 shadow-sm active:scale-[0.98]"} ${!isPortalOpen && !completed ? 'opacity-40 grayscale' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${completed ? "bg-slate-100 text-slate-300" : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"}`}>
                        {platform === "Telegram" && <Send className="w-6 h-6" />}
                        {platform === "Facebook" && <Facebook className="w-6 h-6" />}
                        {platform === "WhatsApp" && <CheckCircle2 className="w-6 h-6" />}
                        {platform === "DM" && <UserPlus className="w-6 h-6" />}
                      </div>
                      <div className="text-left">
                        <h4 className="text-base font-bold text-slate-900 tracking-tight">{platform} Task</h4>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${completed ? "text-slate-300" : "text-slate-400"}`}>{completed ? "Completed" : "Available"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Reward</p>
                      <p className={`text-base font-bold tracking-tight ${completed ? "text-slate-300" : "text-blue-600"}`}>{formatNaira(dailyReward)}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task History</h4>
                <div className="h-px bg-slate-100 flex-1 ml-4"></div>
              </div>
              
              {loadingHistory ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
              ) : completedTasks.length === 0 ? (
                <div className="py-20 text-center rounded-[32px] border border-dashed border-slate-200 bg-slate-50/20">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No tasks completed yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedTasks.slice(0, 10).map((record) => (
                    <motion.div 
                      key={record.id} 
                      whileHover={{ x: 3 }}
                      className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 tracking-tight">{record.taskTitle}</p>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">+{formatNaira(record.rewardAmount)} Earned</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">{formatDate(record.timestamp)}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8 pb-12">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sponsored Task Assets</h4>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDownloadBanner} 
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" /> Download Banner
                </motion.button>
              </div>
              <div className="relative w-full rounded-[32px] overflow-hidden bg-slate-100 shadow-xl border border-slate-200">
                <img 
                  src={settings?.taskBannerUrl || "/src/assets/images/kudagrid_pro_enhanced_banner_1785804665675.jpg"} 
                  alt="Task Banner" 
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campaign Caption</h4>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopyCaption} 
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copied" : "Copy Caption"}
                </motion.button>
              </div>
              <div className="p-6 rounded-[24px] bg-slate-50 border border-slate-100 text-[12px] font-medium text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                {settings?.taskCaption || `💙 I'm earning real money from KudaGrid by completing simple daily online tasks!\n\nJoin thousands of Nigerians already earning every day. Register now, activate a plan, complete daily tasks, earn referral bonuses, and withdraw directly to your bank account.\n\n🚀 Join KudaGrid today and start earning!`}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-4">Mission Action</h4>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => handleStartTask(activePlatform!)} 
                className="w-full py-5 rounded-[24px] bg-blue-600 text-white font-bold text-sm uppercase tracking-widest active:scale-95 transition-all shadow-lg"
              >
                Share on {activePlatform}
              </motion.button>
            </div>

            <div className="h-px bg-slate-100"></div>
            
            <div className="space-y-6">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-4">Submit Verification</h4>
              <div className="space-y-6">
                <label className="w-full aspect-video rounded-[32px] border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group hover:border-blue-300 transition-all">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  {screenshotPreview ? (
                    <img src={screenshotPreview} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 shadow-sm group-hover:text-blue-500 transition-all">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upload Screenshot Proof</span>
                    </div>
                  )}
                </label>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmitProof} 
                  disabled={loading || !screenshotFile} 
                  className="w-full py-5 rounded-[24px] bg-slate-900 text-white font-bold text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white" /> : "Verify Task Completion"}
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
