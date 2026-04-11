import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { UserPlus, Search, Briefcase, Wrench, User, Loader2, Database, Users, Trash2, Filter, AlertCircle } from 'lucide-react';

// --- 1. FIREBASE INITIALIZATION ---
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

// --- 2. MAIN APP COMPONENT ---
export default function App() {
    const [user, setUser] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [formData, setFormData] = useState({ name: '', profession: '', skills: '' });
    const [searchQuery, setSearchQuery] = useState('');

   // Simplified Authentication Setup
    useEffect(() => {
        const initAuth = async () => {
            try {
                // Just sign in anonymously - no extra tokens needed
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Auth error:", error);
            }
        };
        initAuth();

        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });

        return () => unsubscribe();
    }, []);

        return () => unsubscribe();
    }, []);

    // Database Sync
    useEffect(() => {
        if (!user) return;
        const profilesRef = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
        const q = query(profilesRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const profileData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProfiles(profileData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
            setLoading(false);
        }, (error) => {
            console.error("Firestore error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // Derived Data for Filters
    const filterStats = useMemo(() => {
        const professions = {};
        const skills = {};
        profiles.forEach(p => {
            if (p.profession) {
                professions[p.profession] = (professions[p.profession] || 0) + 1;
            }
            if (p.skills && Array.isArray(p.skills)) {
                p.skills.forEach(s => {
                    skills[s] = (skills[s] || 0) + 1;
                });
            }
        });
        return { 
            professions: Object.entries(professions).sort((a, b) => b[1] - a[1]), 
            skills: Object.entries(skills).sort((a, b) => b[1] - a[1]) 
        };
    }, [profiles]);

    // Handle Form Submission
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
        } catch (error) {
            console.error("Error adding profile:", error);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Deletion
    const confirmDelete = async () => {
        if (!deleteId || !user) return;
        try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', deleteId);
            await deleteDoc(docRef);
            setDeleteId(null);
        } catch (error) {
            console.error("Error deleting profile:", error);
        }
    };

    // Search Filtering
    const filteredProfiles = useMemo(() => {
        if (!searchQuery.trim()) return profiles;
        const queryLower = searchQuery.toLowerCase();
        return profiles.filter(profile => {
            const nameMatch = profile.name?.toLowerCase().includes(queryLower);
            const profMatch = profile.profession?.toLowerCase().includes(queryLower);
            const skillMatch = profile.skills?.some(skill => skill.toLowerCase().includes(queryLower));
            return nameMatch || profMatch || skillMatch;
        });
    }, [profiles, searchQuery]);

    if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                {/* Delete Modal */}
                {deleteId && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                            <div className="flex items-center gap-3 text-red-600 mb-4">
                                <AlertCircle size={24} />
                                <h3 className="text-lg font-bold">Confirm Deletion</h3>
                            </div>
                            <p className="text-slate-600 mb-6">Are you sure you want to remove this profile?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-lg bg-slate-100 font-semibold">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold">Delete</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header Section */}
                <header className="mb-10 flex flex-col md:flex-row justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Lindsay Ward EQ</h1>
                        <p className="text-slate-500 flex items-center gap-2 mt-2 font-medium">
                            <Users size={18} className="text-blue-500" /> {profiles.length} Brother Profiles
                        </p>
                    </div>
                    
                    <div className="flex flex-col gap-3 w-full md:w-96">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="text" 
                                placeholder="Search by name, profession, or skill..." 
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                            />
                        </div>
                        <select 
                            className="w-full p-2 bg-slate-100 rounded-lg text-sm border-transparent focus:border-slate-300 focus:ring-0 cursor-pointer" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)}
                        >
                            <option value="">Quick Filter...</option>
                            <optgroup label="Professions">
                                {filterStats.professions.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
                            </optgroup>
                            <optgroup label="Skills">
                                {filterStats.skills.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
                            </optgroup>
                        </select>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Input Form Column */}
                    <div className="lg:col-span-4">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-8">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                                <UserPlus size={20} className="text-blue-600" /> Add Profile
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                                    <input required className="w-full p-2.5 mt-1 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., John Doe" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Profession</label>
                                    <input required className="w-full p-2.5 mt-1 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Carpenter" value={formData.profession} onChange={(e) => setFormData({...formData, profession: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Skills (comma separated)</label>
                                    <textarea required className="w-full p-2.5 mt-1 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24" placeholder="e.g., Woodworking, Plumbing, First Aid" value={formData.skills} onChange={(e) => setFormData({...formData, skills: e.target.value})} />
                                </div>
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]">
                                    {submitting ? <Loader2 className="animate-spin mx-auto" size={24} /> : "Publish Profile"}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Profiles Grid Column */}
                    <div className="lg:col-span-8">
                        {filteredProfiles.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
                                <Search size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-medium">No profiles match your search.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredProfiles.map((profile) => (
                                    <div key={profile.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group hover:border-blue-300 transition-colors">
                                        <button 
                                            onClick={() => setDeleteId(profile.id)} 
                                            className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        
                                        <h3 className="text-xl font-bold text-slate-800 mb-1">{profile.name}</h3>
                                        <div className="text-blue-600 text-sm font-semibold mb-4 flex items-center gap-1.5">
                                            <Briefcase size={14} /> {profile.profession}
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-1.5 border-t border-slate-50 pt-4">
                                            {profile.skills?.map((skill, idx) => (
                                                <span key={idx} className="text-[11px] bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-md">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
