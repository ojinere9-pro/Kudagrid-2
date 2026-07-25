import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Megaphone, X, ExternalLink, UserPlus, Shield } from "lucide-react";

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TelegramModal({ isOpen, onClose }: TelegramModalProps) {
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      setCanClose(false);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanClose(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative border border-slate-100 dark:border-slate-800"
          >
            {/* Header / Close Button Area */}
            <div className="absolute top-4 right-4 z-10">
              {canClose ? (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              ) : (
                <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">
                  Wait {countdown}s
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                <Megaphone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Claim Your ₦5,000 Bonus
              </h3>
              
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Join our official Telegram channel now and get a <span className="font-bold text-blue-600 dark:text-blue-400">₦5,000 instant, withdrawable bonus</span> added to your account!
              </p>

              <div className="grid grid-cols-1 gap-3 w-full">
                <a
                  href="https://t.me/kudagridofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="w-full py-3.5 px-6 bg-[#0088cc] hover:bg-[#007bb5] text-white rounded-xl font-bold flex items-center justify-between group transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-lg">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <span className="text-sm">👥 Community</span>
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                </a>

                <a
                  href="https://t.me/kudagridofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="w-full py-3.5 px-6 bg-[#0088cc] hover:bg-[#007bb5] text-white rounded-xl font-bold flex items-center justify-between group transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-lg">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <span className="text-sm">👨‍👩‍👧‍👦 Group</span>
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                </a>

                <a
                  href="https://t.me/kudagriddiscussiongroup"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="w-full py-3.5 px-6 bg-[#0088cc] hover:bg-[#007bb5] text-white rounded-xl font-bold flex items-center justify-between group transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-lg">
                      <Shield className="w-4 h-4" />
                    </div>
                    <span className="text-sm">💬 Chat</span>
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                </a>
              </div>

              <p className="mt-6 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                Join before continuing to dashboard
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
