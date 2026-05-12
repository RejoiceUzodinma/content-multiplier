"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PostCard from "@/components/PostCard";
import { History, Star, Settings, Zap } from "lucide-react";

import { supabase } from "../../lib/supabaseClient"; 
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false); 
  const [type, setType] = useState("Individual");
  const [history, setHistory] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "saved">("history");
  
  const [userName, setUserName] = useState("");
  const [userTitle, setUserTitle] = useState("");
  const [brandVoice, setBrandVoice] = useState(""); 

  useEffect(() => {
    // Listen for auth changes to update UI instantly
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const savedHistory = localStorage.getItem("content_vault");
    const savedBangers = localStorage.getItem("saved_bangers");
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedBangers) setSavedPosts(JSON.parse(savedBangers));

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      setUserName(data.full_name || "");
      setUserTitle(data.professional_title || "");
      setBrandVoice(data.brand_voice || "");
    }
  };

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("Please sign in to save your progress.");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id, 
          full_name: userName, 
          professional_title: userTitle, 
          brand_voice: brandVoice,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      alert("Profile saved successfully! 🏆");
    } catch (error: any) {
      console.error('Error saving:', error.message);
      alert("Error saving profile: " + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!transcript.trim()) return alert("Please provide a transcript to begin.");
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, type, userName, userTitle, brandVoice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.content);
      const newEntry = {
        id: Date.now(),
        type: type,
        content: data.content,
        preview: transcript.substring(0, 40) + "..."
      };
      const updatedHistory = [newEntry, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem("content_vault", JSON.stringify(updatedHistory));
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSavePost = (editedContent: string) => {
    const isAlreadySaved = savedPosts.some(p => p.content === editedContent);
    let updated = isAlreadySaved 
      ? savedPosts.filter(p => p.content !== editedContent)
      : [{ id: Date.now(), content: editedContent }, ...savedPosts];
    setSavedPosts(updated);
    localStorage.setItem("saved_bangers", JSON.stringify(updated));
  };

  const posts = result
    ? result.split(/(?=\[LINKEDIN|\[INSTAGRAM|\[X POST|\[THREADS|\[CAROUSEL|\[REEL|### \*\*LinkedIn|### \*\*Instagram)/gi)
        .filter(p => p.trim().length > 20) 
    : [];

  // --- RENDER LOGIC ---
  return (
    <main className="min-h-screen bg-slate-50 overflow-x-hidden text-slate-900 font-sans">
      {!session ? (
        /* LOGIN VIEW: Shown if user is NOT logged in */
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase mb-2">
              Content <span className="text-blue-600">Multiplier</span>
            </h1>
            <p className="mb-8 text-slate-500 font-medium">Sign in to access your Brand Bible and generate content.</p>
            <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
              <AuthModal />
            </div>
          </motion.div>
        </div>
      ) : (
        /* APP VIEW: Shown only when session exists */
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 lg:px-8">
          
          <section aria-label="Brand Settings" className="mb-10 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm transition-all hover:shadow-md">
            <header className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-blue-200 shadow-lg">
                    <Settings size={20} />
                  </div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Personal Brand Bible</h2>
               </div>
              
               <button 
                 onClick={handleSaveProfile}
                 disabled={saveLoading}
                 className="text-[10px] font-bold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-all disabled:opacity-50"
               >
                 {saveLoading ? "SAVING..." : "SAVE CHANGES"}
               </button>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <input 
                  value={userName} onChange={(e) => setUserName(e.target.value)} 
                  placeholder="Your Full Name" 
                  className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-medium border-2 border-transparent focus:border-blue-600 focus:bg-white outline-none transition-all shadow-inner" 
                />
                <input 
                  value={userTitle} onChange={(e) => setUserTitle(e.target.value)} 
                  placeholder="Professional Title (e.g. Founder & CEO)" 
                  className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-medium border-2 border-transparent focus:border-blue-600 focus:bg-white outline-none transition-all shadow-inner" 
                />
              </div>
              <textarea 
                value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} 
                placeholder="Describe your brand voice..." 
                className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-medium border-2 border-transparent focus:border-blue-600 focus:bg-white outline-none h-full min-h-[110px] resize-none transition-all shadow-inner" 
              />
            </div>
          </section>

          <header className="mb-12 text-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85] uppercase italic">
                Content <br /> <span className="text-blue-600 not-italic">Multiplier</span>
              </h1>
            </motion.div>
            
            <div className="mt-8 inline-flex bg-slate-200/50 p-1.5 rounded-2xl w-full max-w-sm backdrop-blur-sm">
              <button onClick={() => setType("Individual")} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${type === "Individual" ? "bg-white shadow-xl text-blue-600 scale-[1.02]" : "text-slate-500 hover:text-slate-700"}`}>Individual 👑</button>
              <button onClick={() => setType("Business")} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${type === "Business" ? "bg-white shadow-xl text-amber-600 scale-[1.02]" : "text-slate-500 hover:text-slate-700"}`}>Business 💼</button>
            </div>
          </header>

          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-10">
            <section className="lg:col-span-8 space-y-6">
              <div className="group relative">
                <textarea
                  className="w-full min-h-[350px] md:min-h-[500px] p-6 md:p-8 border-2 border-slate-200 rounded-[2.5rem] shadow-2xl bg-white/50 backdrop-blur-md focus:bg-white focus:border-blue-600 outline-none text-base md:text-lg text-slate-800 transition-all leading-relaxed"
                  placeholder="Paste your raw transcript or thoughts here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                <button 
                  onClick={handleGenerate} 
                  disabled={loading} 
                  className="group w-full mt-6 py-5 rounded-[1.5rem] font-black text-white bg-slate-900 hover:bg-blue-600 shadow-2xl text-lg uppercase tracking-[0.1em] transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? "Processing..." : (
                    <>
                      <Zap size={20} className="fill-current" />
                      Multiply My Influence
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-8 pt-6">
                <AnimatePresence mode="popLayout">
                  {posts.map((post, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                      <PostCard 
                        content={post} 
                        isSaved={savedPosts.some(p => p.content === post)} 
                        onSave={(edited: string) => toggleSavePost(edited)} 
                        onDelete={() => setResult(result.replace(post, ""))} 
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            <aside className="lg:col-span-4 space-y-8 order-last lg:order-none">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm sticky top-8">
                <nav className="flex gap-8 mb-8 border-b border-slate-100 pb-4">
                  <button onClick={() => setActiveTab("history")} className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest pb-2 transition-all relative ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`}>
                      Vault {activeTab === 'history' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600" />}
                  </button>
                  <button onClick={() => setActiveTab("saved")} className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest pb-2 transition-all relative ${activeTab === 'saved' ? 'text-amber-600' : 'text-slate-400'}`}>
                      Curated {activeTab === 'saved' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-amber-600" />}
                  </button>
                </nav>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {activeTab === "history" ? (
                    history.length > 0 ? (
                      history.map((item) => (
                        <button key={item.id} onClick={() => setResult(item.content)} className="w-full text-left p-5 bg-slate-50 hover:bg-white hover:shadow-md rounded-2xl transition-all border border-transparent hover:border-slate-100">
                          <p className="text-[11px] leading-relaxed text-slate-500 line-clamp-2 italic font-medium">"{item.preview}"</p>
                        </button>
                      ))
                    ) : <div className="text-center py-12 opacity-30 italic text-xs uppercase tracking-widest">Vault Empty</div>
                  ) : (
                    savedPosts.length > 0 ? savedPosts.map((post) => (
                      <div key={post.id} className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl flex flex-col gap-3">
                        <p className="text-[11px] text-slate-600 line-clamp-2 font-medium leading-relaxed">{post.content}</p>
                        <button onClick={() => setResult(post.content)} className="w-fit text-[9px] font-black text-amber-700 px-4 py-2 bg-white rounded-lg shadow-sm hover:bg-amber-100 transition-all uppercase">Load Draft</button>
                      </div>
                    )) : <div className="text-center py-12 opacity-30 italic text-xs uppercase tracking-widest">No Saved Gems</div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.reload(); 
                }} 
                className="w-full py-4 text-[12px] font-black text-slate-400 hover:text-red-500 transition-all uppercase tracking-[0.2em] border-t border-slate-100 mt-4"
              >
                Sign Out of Multiplier
              </button>
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}