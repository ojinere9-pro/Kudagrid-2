import React from "react";
import { motion } from "motion/react";

export default function FloatingSupport() {
  const whatsappNumber = "6285863067526";
  const whatsappLink = `https://wa.me/${whatsappNumber}`;

  return (
    <div className="fixed bottom-[110px] right-[20px] z-[9999] pointer-events-none">
      <motion.div
        initial={{ scale: 0, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20
        }}
        className="pointer-events-auto group relative"
      >
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-xl pointer-events-none border border-white/10">
          WhatsApp Support
        </span>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg shadow-emerald-500/20 flex items-center justify-center hover:bg-[#128C7E] transition-all duration-300 border-4 border-white/20 backdrop-blur-sm"
        >
          <svg 
            viewBox="0 0 24 24" 
            className="w-7 h-7 fill-current"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 4.754a8.117 8.117 0 01-3.876-.984l-.278-.165-2.88.756.77-2.805-.18-.287c-1.087-1.733-1.66-3.742-1.66-5.804 0-5.96 4.847-10.807 10.807-10.807 2.894 0 5.613 1.127 7.66 3.174 2.048 2.047 3.175 4.766 3.175 7.66 0 5.961-4.847 10.807-10.807 10.807m8.44-17.651A12.185 12.185 0 0012.65 0C5.674 0 0 5.674 0 12.65c0 2.23.58 4.4 1.688 6.313L0 25.3l6.513-1.708a12.599 12.599 0 005.9 1.458h.005c6.976 0 12.65-5.674 12.65-12.651 0-3.414-1.33-6.623-3.746-9.039" />
          </svg>
        </a>
      </motion.div>
    </div>
  );
}
