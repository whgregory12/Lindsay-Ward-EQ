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
  GraduationCap
} from 'lucide-react';

// --- DATABASE & AUTH CONFIGURATION ---
const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG;
let firebaseConfig = {};

try {
  firebaseConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
} catch (e) {
  console.error("Firebase Config Error", e);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'talent-directory-app';
const ADMIN_PASSWORD = "0212"; 

const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

// Helper to clean up text (Title Case)
const clean = (str) => {
  if (!str) return "";
  return str.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

export default function App() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null); 
  
  const [formData, setFormData] = useState({
    name: '',
    profession: '',
    homeCity: '',
    homeState: '',
    college: '',
    skill1: '',
    skill2: '',
    skill3: '',
    skill4: '',
    skill5: '',
    skill6: ''
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
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Generate Filter Tally Stats
  const filterStats = useMemo(() => {
    const stats = { professions: {}, skills: {}, hometowns: {}, colleges: {} };
    
    profiles.forEach(p => {
      const prof = clean(p.profession);
      const coll = clean(p.college);
      const city = clean(p.homeCity);
      const state = p.homeState;

      if (prof) stats.professions[prof] = (stats.professions[prof] || 0) + 1;
      if (coll) stats.colleges[coll] = (stats.colleges[coll] || 0) + 1;
      if (city && state) {
        const h = `${city}, ${state}`;
        stats.hometowns[h] = (stats.hometowns[h] || 0) + 1;
      }
      
      // Collect skills from the array
      if (p.skills && Array.isArray(p.skills)) {
        p.skills.forEach(s => { 
          const cleanedSkill = clean(s);
          if (cleanedSkill) stats.skills[cleanedSkill] = (stats.skills[cleanedSkill] || 0) + 1; 
        });
      }
    });

    const sort = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
    return {
      professions: sort(stats.professions),
      skills: sort(stats.skills),
      hometowns: sort(stats.hometowns),
      colleges: sort(stats.colleges)
    };
  }, [profiles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.profession || !user) return;
    setSubmitting(true);
    
    // Combine individual skills into one array
    const skillList = [
      formData.skill1, formData.skill2, formData.skill3, 
      formData.skill4, formData.skill5, formData.skill6
    ].map(s => s.trim()).filter(s => s !== '');

    try {
      const profilesRef = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
      await addDoc(profilesRef, {
        name: formData.name,
        profession: formData.profession,
        homeCity: formData.homeCity,
        homeState: formData.homeState,
        college: formData.college,
        skills: skillList,
        createdAt: Date.now(),
        userId: user.uid
      });
      setFormData({ 
        name: '', profession: '', homeCity: '', homeState: '', college: '',
        skill1: '', skill2: '', skill3: '', skill4: '', skill5: '', skill6: '' 
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId || !user) return;
    const userInput = prompt("Admin Password:");
    if (userInput === ADMIN_PASSWORD) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', deleteId));
      setDeleteId(null);
    } else if (userInput !== null) alert("Incorrect password.");
  };

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.profession?.toLowerCase().includes(q) || 
      p.homeCity?.toLowerCase().includes(q) || 
      p.homeState?.toLowerCase().includes(q) || 
      p.college?.toLowerCase().includes(q) || 
      p.skills?.some(s => s.toLowerCase().includes(q))
    );
  }, [profiles, searchQuery]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {deleteId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
              <AlertCircle size={48} className="text-red-600 mx-auto mb-4" />
              <h3 className="font-bold mb-4">Delete Profile?</h3>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-lg bg-slate-100 font-semibold">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold">Delete</button>
              </div>
            </div>
          </div>
        )}

        <header className="mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Lindsay Ward EQ Profiles</h1>
            <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2"><Database size={16} /> {profiles.length} Profiles</p>
          </div>
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="Search profiles..." className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-blue-600"><UserPlus size={20} /><h2 className="text-xl font-bold text-slate-800">Add Profile</h2></div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Full Name</label>
                  <input required className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Joseph Smith" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Profession</label>
                  <input required className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Prophet" value={formData.profession} onChange={(e) => setFormData({...formData, profession: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">City</label>
                    <input className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Sharon" value={formData.homeCity} onChange={(e) => setFormData({...formData, homeCity: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">State</label>
                    <select className="w-full px-1 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" value={formData.homeState} onChange={(e) => setFormData({...formData, homeState: e.target.value})}>
                      <option value="">--</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">College</label>
                  <input className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="School of the Prophets" value={formData.college} onChange={(e) => setFormData({...formData, college: e.target.value})} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Hobbies & Skills (Fill any)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <input 
                        key={num}
                        className="w-full px-3 py-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs" 
                        placeholder={`Skill ${num}`}
                        value={formData[`skill${num}`]} 
                        onChange={(e) => setFormData({...formData, [`skill${num}`]: e.target.value})} 
                      />
                    ))}
                  </div>
                </div>

                <button disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Publish Profile'}
                </button>
              </form>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-700">
              <div className="flex items-center gap-2 mb-6 text-blue-400 font-bold"><Filter size={18} /> Quick Filter</div>
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                
                {[
                  { label: 'Professions', data: filterStats.professions },
                  { label: 'Hometowns', data: filterStats.hometowns },
                  { label: 'Colleges', data: filterStats.colleges }
                ].map(sec => (
                  <div key={sec.label} className="mb-4">
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-3 tracking-widest">{sec.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {sec.data.map(([name, count]) => (
                        <button 
                          key={name} 
                          onClick={() => setSearchQuery(name)} 
                          className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all ${searchQuery.toLowerCase() === name.toLowerCase() ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400'}`}
                        >
                          {name} <span className="ml-1 opacity-50 font-mono">({count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <p className="text-[10px] text-slate-500 font-black uppercase mb-3 tracking-widest">Skills & Hobbies</p>
                  <div className="flex flex-wrap gap-2">
                    {filterStats.skills.map(([name, count]) => (
                      <button 
                        key={name} 
                        onClick={() => setSearchQuery(name)} 
                        className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all ${searchQuery.toLowerCase() === name.toLowerCase() ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400'}`}
                      >
                        {name} <span className="ml-1 opacity-50 font-mono">({count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="mt-6 w-full text-[10px] border border-blue-500/30 text-blue-400 py-3 rounded-lg font-bold hover:bg-blue-500/10 transition-all uppercase tracking-widest"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProfiles.map((p) => (
                <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-200 transition-all flex flex-col relative group">
                  <button onClick={() => setDeleteId(p.id)} className="absolute top-4 right-4 text-slate-100 group-hover:text-red-300 hover:!text-red-500 transition-colors"><Trash2 size={16} /></button>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{p.name}</h3>
                  <div className="text-blue-600 text-sm font-bold mb-3 flex items-center gap-2"><Briefcase size={14} />{p.profession}</div>
                  <div className="space-y-1 mb-4 text-slate-500 text-[11px] font-bold uppercase tracking-tight">
                    {(p.homeCity || p.homeState) && <div className="flex items-center gap-2"><MapPin size={12} className="text-slate-400" />{p.homeCity}{p.homeCity && p.homeState ? ', ' : ''}{p.homeState}</div>}
                    {p.college && <div className="flex items-center gap-2"><GraduationCap size={12} className="text-slate-400" />{p.college}</div>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-50 mt-auto">
                    {p.skills?.map((s, idx) => (<span key={idx} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold border border-blue-100">{s}</span>))}
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
