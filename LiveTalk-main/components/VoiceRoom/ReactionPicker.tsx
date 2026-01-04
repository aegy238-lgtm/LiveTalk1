
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_REACTIONS } from '../../constants/emojis';

interface ReactionPickerProps {
  isOpen: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  emojis?: string[]; 
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({ isOpen, onSelect, onClose, emojis = [] }) => {
  const listToRender = emojis.length > 0 ? emojis : DEFAULT_REACTIONS;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={onClose} />
          <motion.div 
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="absolute bottom-24 left-4 right-4 bg-[#0a0a0c]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 z-[110] shadow-[0_25px_60px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-center justify-between mb-4 px-2">
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تفاعلات متحركة</span>
               </div>
               <div className="h-px flex-1 mx-4 bg-white/5"></div>
            </div>

            <div className="grid grid-cols-4 gap-4 overflow-y-auto max-h-[45vh] scrollbar-hide p-1">
              {listToRender.map((emoji, idx) => {
                const isUrl = emoji.startsWith('http') || emoji.startsWith('data:');
                return (
                  <motion.button 
                    key={idx}
                    whileHover={{ scale: 1.12, y: -5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { onSelect(emoji); onClose(); }}
                    className="aspect-square flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl transition-all p-2 border border-white/5 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    {isUrl ? (
                      <img 
                        src={emoji} 
                        className="w-full h-full object-contain filter drop-shadow-md z-10 transition-transform group-hover:rotate-6" 
                        alt="emoji" 
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-3xl z-10">{emoji}</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
            
            <div className="mt-5 pt-3 border-t border-white/5 text-center">
              <p className="text-[8px] text-amber-500/50 font-black uppercase tracking-[0.4em]">Vivo Royal Animated Engine</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReactionPicker;
