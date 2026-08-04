import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { AdminUser } from "../../types";
import { ShieldCheck, UserPlus, Trash2, X, Loader2, Save, UserCheck, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminManagement({ currentAdminId }: { currentAdminId: string }) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState<{ username: string, email: string, role: AdminUser["role"] } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      const docSnap = await getDoc(doc(db, "admins", currentAdminId));
      if (docSnap.exists() && docSnap.data().role === "Super Admin") {
        setIsSuperAdmin(true);
      }
    };
    fetchRole();

    const unsubscribe = onSnapshot(collection(db, "admins"), (snap) => {
      setAdmins(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminUser)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentAdminId]);

  const handleAddAdmin = async () => {
    if (!newAdmin?.username || !newAdmin.email) return;
    setSaving(true);
    try {
      // First ensure user exists in main users collection (optional, but good for linking)
      await setDoc(doc(db, "admins", newAdmin.username), {
        email: newAdmin.email,
        role: newAdmin.role,
        status: "Active"
      });
      // Also update the user document to set isAdmin flag
      await setDoc(doc(db, "users", newAdmin.username), { isAdmin: true }, { merge: true });
      
      setNewAdmin(null);
      alert("Admin added successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to add admin");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (adminId === currentAdminId) return alert("Cannot remove yourself");
    if (confirm("Are you sure you want to revoke admin privileges?")) {
      await deleteDoc(doc(db, "admins", adminId));
      await setDoc(doc(db, "users", adminId), { isAdmin: false }, { merge: true });
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    const newStatus = admin.status === "Active" ? "Inactive" : "Active";
    await setDoc(doc(db, "admins", admin.id), { status: newStatus }, { merge: true });
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1 px-10">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Access Restricted</h3>
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">Only Super Administrators can manage other admin accounts.</p>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrators</h3>
        <button
          onClick={() => setNewAdmin({ username: "", email: "", role: "Admin" })}
          className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {admins.map((admin) => (
          <div key={admin.id} className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${admin.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                {admin.id[0].toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">@{admin.id}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    admin.role === 'Super Admin' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {admin.role}
                  </span>
                  <span className={`text-[8px] font-bold uppercase tracking-widest ${admin.status === 'Active' ? 'text-emerald-500' : 'text-slate-300'}`}>
                    • {admin.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleToggleStatus(admin)} className="w-9 h-9 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-slate-100">
                <UserCheck className="w-4 h-4" />
              </button>
              {admin.role !== "Super Admin" && (
                <button onClick={() => handleRemoveAdmin(admin.id)} className="w-9 h-9 rounded-lg bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors border border-red-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {newAdmin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Onboard Personnel</p>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Add Administrator</h3>
                </div>
                <button onClick={() => setNewAdmin(null)} className="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Username</label>
                  <input
                    type="text"
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                    className="w-full h-12 px-5 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Email Address</label>
                  <input
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="w-full h-12 px-5 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Admin Role</label>
                  <div className="relative">
                    <select
                      value={newAdmin.role}
                      onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value as any })}
                      className="w-full h-12 px-5 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition-all appearance-none shadow-inner"
                    >
                      <option value="Support">Support</option>
                      <option value="Admin">Admin</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddAdmin}
                disabled={saving}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add Administrator"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
