"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PostCard from "@/components/PostCard";
import { History, Star, Settings, Zap, MessageSquare, Target } from "lucide-react";

import { supabase } from "../../lib/supabaseClient"; 
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [dailyStory, setDailyStory] = useState(""); 
  const [postGoal, setPostGoal] = useState("I want them to feel inspired"); 
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false); 
  const [history, setHistory] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "saved">("history");
  
  const [userName, setUserName] = useState("");
  const [userTitle, setUserTitle] = useState("");
  const [brandVoice, setBrandVoice] = useState(""); 

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

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
    const { data } = await supabase
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
      
    } catch (error: any) {
      console.error("Error saving:", error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!dailyStory.trim()) return alert("What's the story today? Share a small detail first.");
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          transcript: dailyStory, 
          type: "Content Multiplier", 
          postGoal, 
          userName, 
          userTitle, 
          brandVoice 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setResult(data.content);
      const newEntry = {
        id: Date.now(),
        content: data.content,
        preview: dailyStory.substring(0, 40) + "..."
      };
      const updatedHistory = [newEntry, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem("content_vault", JSON.stringify(updatedHistory));

      if (session?.user?.id) {
        await supabase.from('usage_logs').insert([
          { 
            user_id: session.user.id, 
            action_type: 'content_multiplier_gen', 
            input_word_count: dailyStory.trim().split(/\s+/).length,
            platform_type: postGoal 
          }
        ]);
      }
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

  return (
    <main className="min-h-screen bg-slate-50 overflow-x-hidden text-slate-900 font-sans">
      {!session ? (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase mb-2">
              Content <span className="text-blue-600">Multiplier</span>
            </h1>
            <p className="mb-8 text-slate-500 font-medium">Original content powered by your daily grit.</p>
            <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
              <AuthModal />
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 lg:px-8">
          <section className="mb-10 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <header className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white">
                    <Settings size={20} />
                  </div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Brand Bible</h2>
               </div>
               <button onClick={handleSaveProfile} disabled={saveLoading} className="text-[10px] font-bold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-blue-600 disabled:opacity-50 transition-colors">
                 {saveLoading ? "SAVING..." : "SAVE CHANGES"}
               </button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Full Name" className="w-full bg-slate-50 rounded-2xl p-4 text-sm outline-none focus:bg-white border-2 border-transparent focus:border-blue-600 transition-all" />
                <input value={userTitle} onChange={(e) => setUserTitle(e.target.value)} placeholder="What do you do? (e.g. Designer, Coach)" className="w-full bg-slate-50 rounded-2xl p-4 text-sm outline-none focus:bg-white border-2 border-transparent focus:border-blue-600 transition-all" />
              </div>
              <textarea value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} placeholder="Describe your voice (e.g. Relatable, Bold, High-energy)..." className="w-full bg-slate-50 rounded-2xl p-4 text-sm outline-none focus:bg-white border-2 border-transparent focus:border-blue-600 h-full min-h-[110px] resize-none transition-all" />
            </div>
          </section>

          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-10">
            <section className="lg:col-span-8 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-100">
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                   <MessageSquare size={18} />
                   <label className="text-xs font-black uppercase tracking-widest">What's the story today?</label>
                </div>
                <textarea
                  className="w-full min-h-[150px] p-0 border-none outline-none text-lg text-slate-800 placeholder:text-slate-300 resize-none font-medium"
                  placeholder="e.g. Finally finished a big project I've been working on, had a really deep conversation that changed my perspective or struggled with a client today..."
                  value={dailyStory}
                  onChange={(e) => setDailyStory(e.target.value)}
                />
                
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-4 text-amber-600">
                    <Target size={18} />
                    <label className="text-xs font-black uppercase tracking-widest">Choose one:</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'I want them to feel inspired', 
                      'I want them to learn a lesson', 
                      'I just want to rant', 
                      'I want to sell'
                    ].map((goal) => (
                      <button
                        key={goal}
                        onClick={() => setPostGoal(goal)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${postGoal === goal ? 'bg-slate-900 text-white scale-105' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                      >
                        {goal}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleGenerate} disabled={loading} className="w-full mt-8 py-5 rounded-2xl font-black text-white bg-blue-600 hover:bg-slate-900 shadow-xl uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3">
                  {loading ? "Multiplication in progress..." : <><Zap size={20} /> Multiply My Influence</>}
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

            <aside className="lg:col-span-4 space-y-8">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm sticky top-8">
                <nav className="flex gap-8 mb-8 border-b border-slate-100 pb-4">
                  <button onClick={() => setActiveTab("history")} className={`text-xs font-black uppercase tracking-widest pb-2 relative ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`}>
                    Vault {activeTab === 'history' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600" />}
                  </button>
                  <button onClick={() => setActiveTab("saved")} className={`text-xs font-black uppercase tracking-widest pb-2 relative ${activeTab === 'saved' ? 'text-amber-600' : 'text-slate-400'}`}>
                    Saved {activeTab === 'saved' && <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-amber-600" />}
                  </button>
                </nav>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {activeTab === "history" ? (
                    history.map((item) => (
                      <button key={item.id} onClick={() => setResult(item.content)} className="w-full text-left p-4 bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
                        <p className="text-[10px] text-slate-500 line-clamp-2 italic italic">"{item.preview}"</p>
                      </button>
                    ))
                  ) : (
                    savedPosts.map((post) => (
                      <div key={post.id} className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2">
                        <p className="text-[10px] text-slate-600 line-clamp-2">{post.content}</p>
                        <button onClick={() => setResult(post.content)} className="text-[8px] font-black text-amber-700 uppercase">Load Draft</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="w-full py-4 text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest border-t border-slate-100 mt-4">
                Sign Out
              </button>
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}