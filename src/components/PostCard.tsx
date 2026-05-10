"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Smile, ChevronDown, ChevronUp, Trash2, Calendar } from "lucide-react";

export default function PostCard({ content: initialContent, isSaved, onSave, onDelete, index }: any) {
  const [content, setContent] = useState(initialContent);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const commonEmojis = [
    "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "0️⃣",
    "👉", "➡️", "📍", "✅", "👍", "✊", "💯", "🔥", "🚀", "✨",
    "😂", "😭", "😍", "🎉", "👏", "🙌", "💰", "📲", "🥂", "🧡"
  ];

  useEffect(() => { setContent(initialContent); }, [initialContent]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = isExpanded 
        ? `${textareaRef.current.scrollHeight}px` 
        : "140px"; 
    }
  }, [content, isExpanded]);

  const addEmoji = (emoji: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newText = content.substring(0, start) + emoji + content.substring(end);
    setContent(newText);
    setShowEmojiPicker(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSchedule = () => {
    const eventText = encodeURIComponent(`Post Generation: ${content.substring(0, 40)}...`);
    const eventDetails = encodeURIComponent(content);
    const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventText}&details=${eventDetails}`;
    window.open(gCalUrl, '_blank');
  };

  return (
    <article className="bg-white border border-slate-200 rounded-[2rem] p-5 md:p-8 shadow-sm hover:shadow-xl transition-all duration-500 group overflow-hidden">
      <header className="flex justify-between items-center mb-5">
        <span className="text-[10px] font-black tracking-[0.2em] text-blue-600 bg-blue-50 px-4 py-2 rounded-full uppercase">
          Production Draft {index + 1}
        </span>

        <div className="flex gap-2">
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
            <Smile size={18} />
          </button>
          <button onClick={handleCopy} className="p-2.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all">
            {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
          </button>
          <button onClick={onDelete} aria-label="Delete Draft" className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <section className="relative">
        <textarea
          id={`post-editor-${index}`}
          name={`post-content-${index}`}
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={`w-full bg-slate-50/50 p-4 md:p-6 rounded-2xl text-slate-700 text-sm md:text-base leading-relaxed outline-none border-2 border-transparent focus:border-blue-100 focus:bg-white transition-all resize-none overflow-hidden ${!isExpanded ? 'max-h-[140px]' : ''}`}
        />
        
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-0 right-0 z-50 bg-white border border-slate-100 shadow-2xl rounded-2xl p-3 grid grid-cols-5 gap-2">
              {commonEmojis.map(e => (
                <button key={e} onClick={() => addEmoji(e)} className="text-xl p-1 hover:bg-slate-50 rounded-lg transition-transform hover:scale-125">{e}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full mt-2 py-3 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
        {isExpanded ? <>Collapse Content <ChevronUp size={14} /></> : <>Expand Content <ChevronDown size={14} /></>}
      </button>

      <footer className="grid grid-cols-2 gap-4 mt-4 border-t border-slate-50 pt-6">
        <button 
          onClick={() => onSave(content)} 
          className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isSaved ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          {isSaved ? "★ Curated" : "☆ Save to Vault"}
        </button>
        <button 
          onClick={handleSchedule}
          className="py-4 rounded-2xl font-black text-[10px] bg-blue-600 hover:bg-blue-700 text-white uppercase tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Calendar size={14} /> Schedule
        </button>
      </footer>
    </article>
  );
}