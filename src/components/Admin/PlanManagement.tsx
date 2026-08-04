import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, addDoc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../../firebase";
import { InvestmentPlan } from "../../types";
import { Plus, Edit2, Trash2, Save, X, Loader2, ListOrdered, TrendingUp, Sparkles, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const OFFICIAL_PLANS = [
  { name: "Tier 1 (T1)", price: 750, dailyTasks: 4, earningsPerTask: 50, order: 1 },
  { name: "Tier 2 (T2)", price: 1500, dailyTasks: 4, earningsPerTask: 100, order: 2 },
  { name: "Tier 3 (T3)", price: 4000, dailyTasks: 4, earningsPerTask: 250, order: 3 },
  { name: "Tier 4 (T4)", price: 10000, dailyTasks: 4, earningsPerTask: 300, order: 4 },
  { name: "Tier 5 (T5)", price: 20000, dailyTasks: 4, earningsPerTask: 600, order: 5 },
  { name: "Tier 6 (T6)", price: 40000, dailyTasks: 4, earningsPerTask: 2700, order: 6 },
];

export default function PlanManagement() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Partial<InvestmentPlan> | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "investment_plans"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestmentPlan)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSeedPlans = async () => {
    if (!confirm("This will REPLACE all current plans with the official T1-T6 plans. Continue?")) return;
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      
      // Delete existing
      const existingSnap = await getDocs(collection(db, "investment_plans"));
      existingSnap.docs.forEach(d => batch.delete(d.ref));

      // Add new
      OFFICIAL_PLANS.forEach(plan => {
        const dailyEarnings = plan.dailyTasks * plan.earningsPerTask;
        const monthlyEarnings = dailyEarnings * 30;
        const newDocRef = doc(collection(db, "investment_plans"));
        batch.set(newDocRef, {
          ...plan,
          dailyEarnings,
          monthlyEarnings,
          status: "Active"
        });
      });

      await batch.commit();
      alert("Official plans seeded successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to seed plans");
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async () => {
    if (!editingPlan?.name || !editingPlan.price) return;
    setSaving(true);
    try {
      const dailyEarnings = (editingPlan.dailyTasks || 0) * (editingPlan.earningsPerTask || 0);
      const monthlyEarnings = dailyEarnings * 30;
      
      const planData = {
        ...editingPlan,
        dailyEarnings,
        monthlyEarnings,
        status: editingPlan.status || "Active",
        order: editingPlan.order || plans.length + 1
      };

      if (editingPlan.id) {
        await setDoc(doc(db, "investment_plans", editingPlan.id), planData);
      } else {
        await addDoc(collection(db, "investment_plans"), planData);
      }
      setEditingPlan(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this plan?")) {
      await deleteDoc(doc(db, "investment_plans", id));
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Investment Plans</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Plan Management</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSeedPlans}
            disabled={seeding}
            className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100 flex items-center justify-center transition-all hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
            title="Seed Official Plans"
          >
            {seeding ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setEditingPlan({ status: "Active", order: plans.length + 1 })}
            className="w-12 h-12 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center transition-all hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      <div className="space-y-6">
        {plans.map((plan, idx) => (
          <motion.div 
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-6 group transition-all hover:shadow-md hover:border-blue-100 relative overflow-hidden"
          >
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1.5">
                <h4 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{plan.name}</h4>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <p className="text-xs font-bold text-emerald-600 tracking-tight">₦{plan.price.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setEditingPlan(plan)} 
                  className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100"
                >
                  <Edit2 className="w-4 h-4" />
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDelete(plan.id)} 
                  className="w-9 h-9 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all border border-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50 relative z-10">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Earnings Per Task</p>
                <p className="text-sm font-bold text-slate-900 tracking-tight">₦{plan.earningsPerTask.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Daily Tasks</p>
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-3.5 h-3.5 text-blue-500" />
                  <p className="text-sm font-bold text-slate-900 tracking-tight">{plan.dailyTasks} Tasks</p>
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">
              <span>Daily ROI: <span className="text-blue-600">₦{plan.dailyEarnings.toLocaleString()}</span></span>
              <span>Monthly: <span className="text-emerald-600">₦{plan.monthlyEarnings.toLocaleString()}</span></span>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editingPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 space-y-8 overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan Details</p>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                    {editingPlan.id ? "Edit Investment Plan" : "New Investment Plan"}
                  </h3>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setEditingPlan(null)} 
                  className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              <div className="space-y-6">
                {[
                  { label: "Plan Name", key: "name", type: "text", placeholder: "e.g. Bronze" },
                  { label: "Price (₦)", key: "price", type: "number", placeholder: "0.00" },
                  { label: "Daily Tasks", key: "dailyTasks", type: "number", placeholder: "0" },
                  { label: "Earnings Per Task (₦)", key: "earningsPerTask", type: "number", placeholder: "0.00" },
                  { label: "Display Order", key: "order", type: "number", placeholder: "1" },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">{field.label}</label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={(editingPlan as any)[field.key] || ""}
                      onChange={(e) => setEditingPlan({ ...editingPlan, [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                      className="w-full h-12 px-6 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                    />
                  </div>
                ))}

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Plan Status</span>
                  <div className="flex gap-3">
                    {["Active", "Inactive"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setEditingPlan({ ...editingPlan, status: status as any })}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                          (editingPlan.status || "Active") === status
                          ? "bg-white text-blue-600 shadow-sm border border-blue-50"
                          : "bg-transparent text-slate-400"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Plan</>}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
