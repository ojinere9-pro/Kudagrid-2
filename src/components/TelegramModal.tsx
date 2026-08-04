import React from "react";
import { X, Send, Bell, ShieldCheck, Users, Headset, MessageCircle, Megaphone, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TelegramModal({ isOpen, onClose }: TelegramModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-[340px] bg-white rounded-[48px] p-8 space-y-8 shadow-premium text-center"
          >
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full text-slate-300 hover:text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 bg-blue-50 rounded-[28px] flex items-center justify-center mx-auto border border-blue-100 shadow-sm">
              <Send className="w-8 h-8 text-blue-600" />
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">🎉 Welcome to KudaGrid!</h3>
              <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                Join our official communities and receive a <span className="text-blue-600 font-bold">₦5,000 Welcome Reward</span> after meeting the promotion requirements.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { window.open("https://t.me/kudagridofficial", "_blank"); }}
                className="w-full py-4 bg-blue-600 text-white rounded-[20px] font-bold text-xs uppercase tracking-widest shadow-blue-light active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Megaphone className="w-4 h-4" /> Official Telegram Channel
              </button>

              <button
                onClick={() => { window.open("https://t.me/kudagriddiscussiongroup", "_blank"); }}
                className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-bold text-xs uppercase tracking-widest shadow-premium active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Users className="w-4 h-4" /> KudaGrid Community
              </button>

              <button
                onClick={() => { window.open("https://wa.me/6285863067526", "_blank"); }}
                className="w-full py-4 bg-emerald-500 text-white rounded-[20px] font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp Support
              </button>
            </div>

            <div className="pt-2">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-50 text-slate-900 rounded-[20px] font-bold text-xs uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Continue to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5" /> Official Protocol Channel
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

