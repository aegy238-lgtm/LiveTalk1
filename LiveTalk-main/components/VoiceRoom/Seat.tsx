
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Lock } from 'lucide-react';
import { User } from '../../types';

interface SeatProps {
  index: number;
  speaker: User | null;
  onClick: (index: number) => void;
  currentUser: User;
  sizeClass: string;
  customSkin?: string;
  isHost?: boolean;
  isLocked?: boolean;
}

const Seat: React.FC<SeatProps> = ({ index, speaker, onClick, currentUser, sizeClass, customSkin, isHost, isLocked }) => {
  const isUrlEmoji = speaker?.activeEmoji?.startsWith('http') || speaker?.activeEmoji?.startsWith('data:');

  return (
    <div className={`relative flex items-center justify-center ${sizeClass} shrink-0 overflow-visible`}>
      <button 
        onClick={() => onClick(index)} 
        className="w-full h-full relative group transition-transform active:scale-90 flex items-center justify-center overflow-visible"
      >
        {speaker ? (
          <div className="relative w-full h-full p-0.5 flex flex-col items-center justify-center overflow-visible">
            
            {/* التوهج عند التحدث (Speaking Glow) */}
            {!speaker.isMuted && (
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1], 
                  opacity: [0.4, 0.7, 0.4],
                  boxShadow: [
                    "0 0 0px rgba(251,191,36,0)",
                    "0 0 25px rgba(251,191,36,0.5)",
                    "0 0 0px rgba(251,191,36,0)"
                  ]
                }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                className="absolute inset-0 z-0 rounded-full bg-amber-400/20"
              />
            )}

            {/* دائرة البروفايل */}
            <div className={`relative z-10 w-[88%] h-[88%] rounded-full overflow-hidden border bg-slate-900 shadow-2xl flex items-center justify-center ${isHost ? 'border-amber-500/60' : 'border-white/25'}`}>
              <img src={speaker.avatar} className="w-full h-full object-cover" alt={speaker.name} />
              <AnimatePresence mode="wait">
                {speaker.activeEmoji && (
                  <motion.div
                    key={`${speaker.id}-${speaker.activeEmoji}`}
                    initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1.1 }} exit={{ opacity: 0, scale: 1.3 }}
                    className="absolute inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-[0.5px]"
                  >
                    {isUrlEmoji ? <img src={speaker.activeEmoji} className="w-[90%] h-[90%] object-contain filter brightness-110" alt="" /> : <span className="text-4xl">{speaker.activeEmoji}</span>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* الإطارات */}
            {speaker.frame && (<img src={speaker.frame} className="absolute inset-0 w-full h-full object-contain z-20 scale-[1.18] pointer-events-none" />)}

            {/* شارة الاسم والكاريزما */}
            <div className="absolute -bottom-7 left-0 right-0 flex flex-col items-center gap-0.5 pointer-events-none">
               <span className={`text-[7px] font-black truncate drop-shadow-md px-2 py-0.5 rounded-full max-w-[52px] border leading-none shadow-sm ${isHost ? 'bg-amber-500 text-black border-amber-600' : 'bg-black/80 text-white border-white/10'}`}>
                  {speaker.name}
               </span>
               <div className="flex items-center gap-0.5 px-2 py-0.5 bg-black/70 border border-white/20 rounded-full shadow-xl">
                  <span className="text-white font-black text-[6px] leading-none">{(Number(speaker.charm || 0)).toLocaleString()}</span>
               </div>
            </div>
          </div>
        ) : (
          /* المقاعد الفارغة */
          <div className="w-full h-full relative flex items-center justify-center overflow-visible">
            {customSkin ? (
               <div className="relative w-full h-full flex items-center justify-center overflow-visible">
                  <img src={customSkin} className="w-full h-full object-contain opacity-90 transition-all group-hover:opacity-100" alt="Mic Skin" />
               </div>
            ) : (
              <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner group-hover:bg-white/20 transition-all">
                 <span className="text-lg filter grayscale opacity-40"> 🎙️ </span>
              </div>
            )}

            {/* طبقة القفل الصفراء فوق صورة المايك */}
            {isLocked && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
              >
                <div className="p-1.5 bg-yellow-500 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.6)] border border-white/40 flex items-center justify-center">
                   <Lock size={12} className="text-black" fill="currentColor" />
                </div>
              </motion.div>
            )}

            {!isLocked && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
                    <Mic size={12} className="text-white" />
                 </div>
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  );
};

export default Seat;
