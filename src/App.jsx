import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously 
} from 'firebase/auth';
import { 
  UserPlus, 
  Search, 
  Briefcase, 
  Wrench, 
  User, 
  Loader2,
  Database,
  Users,
  Trash2,
  Filter,
  AlertCircle,
  MapPin,
  GraduationCap,
  ChevronRight
} from 'lucide-react';

// --- DATABASE & AUTH CONFIGURATION ---
const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG;
let firebaseConfig = {};

try {
  firebaseConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
} catch (e) {
  console.error("Firebase Config Error: Ensure VITE_FIREBASE_CONFIG is set in Vercel", e);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'talent-directory-app';
const ADMIN_PASSWORD = "0212"; 

export default function App() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null); 
  
  const [formData, setFormData] = useState({
    name: '',
    profession: '',
    hometown: '',
    college: '',
    skills: ''
  });
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth).catch(console.error);
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

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

  // Generate Filter Tally Stats
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
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s !== ''),
        createdAt: Date.now(),
        userId: user.uid
      });
      setFormData({ name: '', profession: '', hometown: '', college: '', skills: '' });
    } catch (error) { console.error("Error adding profile:", error);
    } finally { setSubmitting(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId || !user) return;
    const userInput = prompt("Please enter the Admin Password to delete this profile:");
    if (userInput === ADMIN_PASSWORD) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', deleteId));
        setDeleteId(null);
      } catch (error) { alert("Error deleting profile."); }
    } else if (userInput !== null) { alert("Incorrect password."); }
  };

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const queryLower = searchQuery.toLowerCase();
    return profiles.filter(p => 
      p.name?.toLowerCase().includes(queryLower) || 
      p.profession?.toLowerCase().includes(queryLower) || 
      p.hometown?.toLowerCase().includes(queryLower) || 
      p.college?.toLowerCase().includes(queryLower) || 
      p.skills?.some(s => s.toLowerCase().includes(queryLower))
    );
  }, [profiles, searchQuery]);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {deleteId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-3 text-red-600 mb-4"><AlertCircle size={24} /><h3 className="text-lg font-bold">Confirm Deletion</h3></div>
              <p className="text-slate-600 mb-6">Password required to delete profile.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-lg bg-slate-100 font-semibold">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold">Delete</button>
              </div>
            </div>
          </div>
        )}

        <header className="mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold tracking-tight text-slate-800 mb-2">Lindsay Ward EQ Profiles</h1>
            <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2"><Database size={16} /> {profiles.length} Profiles</p>
          </div>
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={20} />
            <input type="text" placeholder="Search profiles..." className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar: Form + Tally Board */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-blue-600"><UserPlus size={20} /><h2 className="text-xl font-bold text-slate-800">Add Profile</h2></div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {['Name', 'Profession', 'Hometown', 'College'].map(f => (
                  <div key={f}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{f}</label>
                    <input required={f !== 'Hometown' && f !== 'College'} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder={f === 'Name' ? "Joseph Smith" : f === 'Profession' ? "Prophet" : f === 'Hometown' ? "Sharon, Vermont" : "School of the Prophets"} value={formData[f.toLowerCase()]} onChange={(e) => setFormData({...formData, [f.toLowerCase()]: e.target.value})} />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hobbies & Skills</label>
                  <textarea required rows="2" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Revelation, Stick Pull, Translation" value={formData.skills} onChange={(e) => setFormData({...formData, skills: e.target.value})} />
                </div>
                <button disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Publish Profile'}
                </button>
              </form>
            </div>

            {/* Quick-Filter Tally Board */}
            <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg border border-slate-700">
              <div className="flex items-center gap-2 mb-4 text-blue-400"><Filter size={18} /><h3 className="font-bold">Quick Filter</h3></div>
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">By Profession</p>
                  {filterStats.professions.map(([name, count]) => (
                    <button key={name} onClick={() => setSearchQuery(name)} className="flex items-center justify-between w-full text-left text-sm py-1.5 hover:text-blue-400 transition-colors group">
                      <span className="truncate">{name}</span>
                      <span className="bg-slate-700 px-2 py-0.5 rounded text-[10px] font-mono group-hover:bg-blue-900 transition-colors">{count}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">By Skill/Hobby</p>
                  <div className="flex flex-wrap gap-2">
                    {filterStats.skills.map(([name, count]) => (
                      <button key={name} onClick={() => setSearchQuery(name)} className="text-[10px] bg-slate-700 hover:bg-blue-600 px-2 py-1 rounded transition-colors">
                        {name} ({count})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {searchQuery && <button onClick={() => setSearchQuery('')} className="mt-6 w-full py-2 border border-slate-600 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors">Clear Filter</button>}
            </div>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProfiles.map((p) => (
                <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col relative">
                  <button onClick={() => setDeleteId(p.id)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 size={16} /></button>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{p.name}</h3>
                  <div className="flex items-center gap-2 text-blue-600 text-sm font-bold mb-3"><Briefcase size={14} />{p.profession}</div>
                  <div className="space-y-1 mb-4 text-slate-500 text-xs font-medium">
                    {p.hometown && <div className="flex items-center gap-2"><MapPin size={12} />{p.hometown}</div>}
                    {p.college && <div className="flex items-center gap-2"><GraduationCap size={12} />{p.college}</div>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-50 mt-auto">
                    {p.skills?.map((s, idx) => (<span key={idx} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 font-bold">{s}</span>))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
