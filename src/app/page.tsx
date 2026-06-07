"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PostCard from "@/components/PostCard";
import { History, Star, Settings, Zap, MessageSquare, Target, Video, Mic, Square, Trash2, FileAudio, AlertTriangle } from "lucide-react";

import { supabase } from "../../lib/supabaseClient"; 
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [dailyStory, setDailyStory] = useState(""); 
  const [postGoal, setPostGoal] = useState("I want them to feel inspired"); 
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false); 
  const [isSaved, setIsSaved] = useState(false); 
  const [history, setHistory] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "saved">("history");
  
  const [userName, setUserName] = useState("");
  const [userTitle, setUserTitle] = useState("");
  const [brandVoice, setBrandVoice] = useState(""); 

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    return () => {
      subscription.unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const triggerToastError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => {
      setErrorMessage(null);
    }, 7000);
  };

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

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        triggerToastError("Please sign in to save your profile configuration.");
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

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      
    } catch (error: any) {
      console.error("Error saving:", error.message);
      triggerToastError("Error saving profile options: " + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const generatedFile = new File([audioBlob], `live_record_${Date.now()}.wav`, { type: "audio/wav" });
        setMediaFile(generatedFile);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      triggerToastError("Microphone access was denied or is completely unsupported on this browser platform.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, delay = 1500): Promise<Response> => {
    const response = await fetch(url, options);
    
    if (response.status === 503 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    
    return response;
  };

  const handleGenerate = async () => {
    setErrorMessage(null);

    if (!dailyStory.trim() && !mediaFile) {
      return triggerToastError("Please enter a text observation or upload/record a media file first!");
    }

    if (mediaFile) {
      const MAX_PAYLOAD_LIMIT = 4.5 * 1024 * 1024; 
      if (mediaFile.size > MAX_PAYLOAD_LIMIT) {
        triggerToastError("⚠️ Attached file size exceeds the 4.5MB server limit. Please upload a compressed asset or smaller file.");
        return; 
      }
    }

    setLoading(true);
    try {
      let res: Response;
      
      if (mediaFile) {
        const formData = new FormData();
        formData.append("file", mediaFile);
        formData.append("brandVoice", brandVoice);
        formData.append("userTitle", userTitle);
        formData.append("userName", userName);
        formData.append("postGoal", postGoal);

        if (dailyStory.trim()) formData.append("textContext", dailyStory);

        res = await fetchWithRetry("/api/repurpose", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetchWithRetry("/api/generate", {
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
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("The cluster backend encountered an unexpected crash. Please tap 'Multiply My Influence' to retry again.");
      }

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503 || (data.error && data.error.includes("demand"))) {
          throw new Error("The processing clusters are heavily populated right now. Please press process again in a few seconds.");
        }
        throw new Error(data.error || "Generation endpoint configuration failure");
      }
      
      setResult(data.content);
      
      const previewText = mediaFile 
        ? `[Media] ${mediaFile.name}` 
        : dailyStory.substring(0, 40) + "...";

      const newEntry = {
        id: Date.now(),
        content: data.content,
        preview: previewText
      };
      
      const updatedHistory = [newEntry, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem("content_vault", JSON.stringify(updatedHistory));

      if (session?.user?.id) {
        await supabase.from('usage_logs').insert([
          { 
            user_id: session.user.id, 
            action_type: mediaFile ? 'media_multiplier_gen' : 'content_multiplier_gen', 
            input_word_count: dailyStory.trim() ? dailyStory.trim().split(/\s+/).length : 0,
            platform_type: postGoal
          }
        ]);
      }
    } catch (err: any) {
      triggerToastError(err.message || "An unexpected dynamic error occurred. Please tap process again.");
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

  const handleDeleteFromVault = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem("content_vault", JSON.stringify(updated));
  };

  const handleDeleteFromSaved = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedPosts.filter(post => post.id !== id);
    setSavedPosts(updated);
    localStorage.setItem("saved_bangers", JSON.stringify(updated));
  };

  const posts = result
    ? result.split(/(?=\[LINKEDIN|\[INSTAGRAM|\[X\s+POST|###\s+\*\*LinkedIn|###\s+\*\*Instagram)/gi)
        .filter(p => p.trim().length > 20) 
    : [];

  return (
    <main className="min-h-screen bg-slate-50 overflow-x-hidden text-slate-900 font-sans relative">
      
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 w-full max-w-md bg-white border-2 border-red-100 shadow-2xl p-4 rounded-2xl flex items-start gap-3"
          >
            <div className="p-2 rounded-xl bg-red-50 text-red-600 shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-0.5">System Notification</h4>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-slate-900 font-bold text-xs px-1 uppercase tracking-tighter">Close</button>
          </motion.div>
        )}
      </AnimatePresence>

      {!session ? (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase mb-2">
              Content <span className="text-blue-600">Multiplier</span>
            </h1>
            <p className="mb-8 text-slate-500 font-medium tracking-tight">
              Your insights, multiplied.
            </p>
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
               <button 
                onClick={handleSave} 
                disabled={saveLoading}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSaved ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
               >
                {saveLoading ? "SAVING..." : isSaved ? "SAVED ✅" : "SAVE"}
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
                   <label className="text-xs font-black uppercase tracking-widest">What's on your mind?</label>
                </div>
                <textarea
                  className="w-full min-h-[150px] p-0 border-none outline-none text-lg text-slate-800 placeholder:text-slate-300 resize-none font-medium mb-4"
                  placeholder="Paste a thought, a transcript, what happened today, or an observation..."
                  value={dailyStory}
                  onChange={(e) => setDailyStory(e.target.value)}
                />
                <div className="flex flex-wrap items-center gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 hover:text-blue-600 transition-all text-xs font-bold text-slate-600">
                    <FileAudio size={16} className="text-blue-600" />
                    <span>Upload Audio Note</span>
                    <input 
                      type="file" 
                      accept="audio/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files?.[0]) setMediaFile(e.target.files[0]);
                      }} 
                    />
                  </label>

                  {!isRecording ? (
                    <button 
                      type="button"
                      onClick={startRecording}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl hover:bg-red-100 transition-all text-xs font-bold"
                    >
                      <Mic size={16} />
                      <span>Tap Mic to Speak</span>
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl animate-pulse transition-all text-xs font-bold"
                    >
                      <Square size={16} />
                      <span>Stop ({formatDuration(recordingDuration)})</span>
                    </button>
                  )}
                </div>

                {mediaFile && (
                  <div className="w-full flex items-center justify-between gap-2 p-4 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold mb-6 border border-blue-100 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileAudio size={16} className="shrink-0" />
                      <span className="truncate">Attached: {mediaFile.name} ({(mediaFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </div>
                    <button 
                      onClick={() => setMediaFile(null)} 
                      className="text-slate-400 hover:text-red-500 transition-all shrink-0 p-1"
                      title="Remove media file attachment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-4 text-amber-600">
                    <Target size={18} />
                    <label className="text-xs font-black uppercase tracking-widest">Choose your vibe:</label>
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
                        type="button"
                        onClick={() => setPostGoal(goal)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${postGoal === goal ? 'bg-slate-900 text-white scale-105' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                      >
                        {goal}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleGenerate} disabled={loading || isRecording} className="w-full mt-8 py-5 rounded-2xl font-black text-white bg-blue-600 hover:bg-slate-900 shadow-xl uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3">
                  {loading ? "Multiplication in progress..." : <><Zap size={20} /> Multiply My Influence</>}
                </button>
              </div>
              <div className="space-y-8 pt-6">
                <AnimatePresence mode="popLayout">
                  {posts.map((post, i) => (
                    <motion.div key={post.substring(0, 30) + i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                      <PostCard 
                        content={post} 
                        index={i} 
                        isSaved={savedPosts.some(p => p.content === post)} 
                        onSave={(edited: string) => toggleSavePost(edited)} 
                        onDelete={() => {
                          const remainingPosts = posts.filter((_, idx) => idx !== i);
                          setResult(remainingPosts.join("\n\n"));
                        }} 
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
                  <AnimatePresence mode="popLayout">
                    {activeTab === "history" ? (
                      history.length === 0 ? (
                        <p className="text-xs font-medium text-slate-400 text-center py-4">Vault is empty</p>
                      ) : (
                        history.map((item) => (
                          <motion.div 
                            key={item.id}
                            initial={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: 50, scale: 0.9 }}
                            className="group w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                            onClick={() => setResult(item.content)}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="text-[10px] text-slate-500 line-clamp-2 italic">"{item.preview}"</p>
                            </div>
                            <button 
                              onClick={(e) => handleDeleteFromVault(item.id, e)}
                              className="text-slate-300 hover:text-red-500 p-1 rounded-lg transition-colors shrink-0"
                              title="Delete from Vault"
                            >
                              <Trash2 size={14} />
                            </button>
                          </motion.div>
                        ))
                      )
                    ) : (
                      savedPosts.length === 0 ? (
                        <p className="text-xs font-medium text-slate-400 text-center py-4">No saved posts yet</p>
                      ) : (
                        savedPosts.map((post) => (
                          <motion.div 
                            key={post.id}
                            initial={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: 50, scale: 0.9 }}
                            className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2 flex flex-col relative group"
                          >
                            <div className="absolute top-3 right-3 opacity-60 hover:opacity-100">
                              <button 
                                onClick={(e) => handleDeleteFromSaved(post.id, e)}
                                className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                title="Delete saved post"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="pr-6">
                              <p className="text-[10px] text-slate-600 line-clamp-2">{post.content}</p>
                            </div>
                            <div>
                              <button onClick={() => setResult(post.content)} className="text-[8px] font-black text-amber-700 uppercase tracking-wider bg-white border border-amber-200 px-2.5 py-1 rounded-md hover:bg-amber-100 transition-all">Load Draft</button>
                            </div>
                          </motion.div>
                        ))
                      )
                    )}
                  </AnimatePresence>
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




