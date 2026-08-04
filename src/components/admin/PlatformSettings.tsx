import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { GlobalSettings } from "../../types";
import { Settings, ShieldCheck, ToggleLeft, ToggleRight, Loader2, Save } from "lucide-react";
import { motion } from "motion/react";

export default function PlatformSettings() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, "settings", "global");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as GlobalSettings);
      } else {
        // Initialize default settings
        const defaultSettings: GlobalSettings = {
          minDeposit: 750,
          minWithdrawalCommission: 1500,
          minWithdrawalReferral: 1000,
          minWithdrawalDeposit: 2000,
          portals: {
            registration: true,
            deposit: true,
            commissionWithdrawal: true,
            referralWithdrawal: true,
            planPurchase: true,
            dailyTasks: true,
            referralSystem: true,
          },
          taskBannerUrl: "/src/assets/images/kudagrid_pro_enhanced_banner_1785804665675.jpg",
          taskCaption: "💙 I'm earning real money from KudaGrid by completing simple daily online tasks!\n\nJoin thousands of Nigerians already earning every day. Register now, activate a plan, complete daily tasks, earn referral bonuses, and withdraw directly to your bank account.\n\n🚀 Join KudaGrid today and start earning!"
        };
        setSettings(defaultSettings);
        await setDoc(docRef, defaultSettings);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "global"), settings);
      alert("Settings updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const togglePortal = (portal: keyof GlobalSettings["portals"]) => {
    if (!settings) return;
    setSettings({
      ...settings,
      portals: {
        ...settings.portals,
        [portal]: !settings.portals[portal],
      }
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Loading Configuration...</p>
    </div>
  );

  if (!settings) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Platform Settings</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global Transaction Limits</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[
            { label: "Minimum Deposit", key: "minDeposit" },
            { label: "Minimum Commission Withdrawal", key: "minWithdrawalCommission" },
            { label: "Minimum Referral Withdrawal", key: "minWithdrawalReferral" },
            { label: "Minimum Deposit Withdrawal", key: "minWithdrawalDeposit" },
          ].map((item, idx) => (
            <motion.div 
              key={item.key} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-5 rounded-2xl bg-white border border-slate-100 flex items-center justify-between shadow-sm hover:border-blue-100 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] border border-blue-100">
                  ₦
                </div>
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">{item.label}</span>
              </div>
              <input
                type="number"
                value={(settings as any)[item.key]}
                onChange={(e) => setSettings({ ...settings, [item.key]: parseFloat(e.target.value) || 0 })}
                className="w-28 h-10 px-4 rounded-xl border border-slate-100 bg-slate-50/50 text-sm font-bold text-blue-600 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-right shadow-inner"
              />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Task Promotion Assets</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Banner & Content Management</p>
        </div>
        <div className="space-y-4">
          <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Task Promotional Banner URL</label>
              <input
                type="text"
                value={settings.taskBannerUrl || ""}
                onChange={(e) => setSettings({ ...settings, taskBannerUrl: e.target.value })}
                placeholder="https://example.com/banner.jpg"
                className="w-full h-12 px-5 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-600 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Task Promotional Caption</label>
              <textarea
                value={settings.taskCaption || ""}
                onChange={(e) => setSettings({ ...settings, taskCaption: e.target.value })}
                rows={6}
                placeholder="Enter caption for users to copy..."
                className="w-full p-5 rounded-3xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-600 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">System Controls</h3>
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(settings.portals).map(([key, value], idx) => (
            <motion.div 
              key={key} 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-5 rounded-3xl bg-white border border-slate-100 flex items-center justify-between shadow-sm hover:border-blue-100 transition-all group relative overflow-hidden"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3 rounded-2xl transition-all duration-300 ${value ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'} shadow-sm`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-slate-900 tracking-tight">
                    {key.replace(/([A-Z])/g, ' $1').trim()} System
                  </span>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Status: {value ? 'Active' : 'Disabled'}
                  </p>
                </div>
              </div>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => togglePortal(key as any)} 
                className="transition-all relative z-10"
              >
                {value ? (
                  <ToggleRight className="w-10 h-10 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-300" />
                )}
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
      </motion.button>
    </div>
  );
}
