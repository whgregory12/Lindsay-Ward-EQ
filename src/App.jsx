import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { UserPlus, Search, Briefcase, User, Loader2, Database, Users, Trash2 } from 'lucide-react';

const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG;
let firebaseConfig = {};
try {
  firebaseConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : (rawConfig || {});
} catch (e) {
  console.error("Firebase Config Error", e);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'talent-directory-app';

export default function App() {
    const [user, setUser] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [formData, setFormData] = useState({ name: '', profession: '', skills: '' });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const initAuth = async () => {
            try { await signInAnonymously(auth); } catch (error) { console.error("Auth error:", error); }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const profilesRef = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
        const unsubscribe = onSnapshot(query(profilesRef), (snapshot) => {
            const profileData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProfiles(profileData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
            setLoading(false);
        }, () => setLoading(false));
        return () => unsubscribe();
    }, [user]);

    const filterStats = useMemo(() => {
        const professions = {};
        const skills = {};
        profiles.forEach(p => {
            if (p.profession) professions[p.profession] = (professions[p.profession] || 0) + 1;
            if (p.skills && Array.isArray(p.skills)) {
                p.skills.forEach(s => { skills[s] = (skills[s] || 0) + 1; });
            }
        });
        return { 
            professions: Object.entries(professions).sort((a, b) => b[1] - a[1]), 
            skills: Object.entries(skills).sort((a, b) => b[1] - a[1]) 
        };
    }, [profiles]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.profession || !formData.skills || !user) return;
        setSubmitting(true);
        try {
            const profilesRef = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
            await addDoc(profilesRef, { 
                name: formData.name, 
                profession: formData.profession.trim(), 
                skills: formData.skills.split(',').map(s => s.trim()).filter(s => s !== ''), 
                createdAt: Date.now(), 
                userId: user.uid 
            });
            setFormData({ name: '', profession: '', skills: '' });
        } catch (error) { console.error(error); } finally { setSubmitting(false); }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', deleteId));
            setDeleteId(null);
        } catch (error) { console.error(error); }
    };

    const filteredProfiles = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return profiles.filter(p => 
            p.name?.toLowerCase().includes(q) || 
            p.profession?.toLowerCase().includes(q) || 
            p.skills?.some(s => s.toLowerCase().includes(q))
        );
    }, [profiles, searchQuery]);

    if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {deleteId && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                            <h3 className="text-lg font-bold text-red-600 mb-4">Confirm Deletion</h3>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-lg bg-slate-100">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 py-2 rounded-lg bg-red-600 text-white">Delete</button>
                            </div>
                        </div>
                    </div>
                )}
                
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tight">Lindsay Ward EQ</h1>
                        <p className="text-slate-500 font-medium flex items-center gap-2 mt-2"><Users size={18} /> {profiles.length} Profiles</p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input type="text" placeholder="Search professions or skills..." className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT: FORM */}
                    <div className="lg:col-span-3">
                        <div className="bg-white p-6 rounded-2xl border shadow-sm sticky top-8">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800"><UserPlus size={20} /> Add Profile</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <input required className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                                <input required className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Profession" value={formData.profession} onChange={(e) => setFormData({...formData, profession: e.target.value})} />
                                <textarea required className="w-full p-2.5 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Skills (comma separated)" value={formData.skills} onChange={(e) => setFormData({...formData, skills: e.target.value})} />
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-100">
                                    {submitting ? "Publishing..." : "Publish Profile"}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* MIDDLE: CARDS */}
                    <div className="lg:col-span-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredProfiles.map((profile) => (
                                <div key={profile.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative hover:shadow-md transition-all">
                                    <button onClick={() => setDeleteId(profile.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                                    <h3 className="text-xl font-bold text-slate-800">{profile.name}</h3>
                                    <p className="text-blue-600 text-sm font-bold mb-4">{profile.profession}</p>
                                    <div className="flex flex-wrap gap-1.5 border-t border-slate-50 pt-4">
                                        {profile.skills?.map((skill, idx) => (
                                            <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold uppercase tracking-wider">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: TALLIES */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border shadow-sm">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Briefcase size={14} /> Professions</h2>
                            <div className="space-y-2">
                                {filterStats.professions.map(([name, count]) => (
                                    <div key={name} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                        <span className="text-sm font-bold text-slate-700">{name}</span>
                                        <span className="bg-blue-600 px-2 py-0.5 rounded text-[10px] font-black text-white">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border shadow-sm">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Database size={14} /> Skills</h2>
                            <div className="flex flex-wrap gap-2">
                                {filterStats.skills.map(([name, count]) => (
                                    <div key={name} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100">
                                        {name} <span className="opacity-50">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
