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

  // 1. Initialize Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        signInAnonymously(auth).catch(console.error);
      }
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Profiles
  useEffect(() => {
    if (!user) return;

    const profilesRef = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
    const q = query(profilesRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profileData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProfiles(profileData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Generate Filter Stats
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
        hometown: formData.hometown.trim(),
        college: formData.college.trim(),
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s !== ''),
        createdAt: Date.now(),
        userId: user.uid
      });
      
      setFormData({ name: '', profession: '', hometown: '', college: '', skills: '' });
    } catch (error) {
      console.error("Error adding profile:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete with Password Check
  const confirmDelete = async () => {
    if (!deleteId || !user) return;
    
    const userInput = prompt("Please enter the Admin Password to delete this profile:");
    
    if (userInput === ADMIN_PASSWORD) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', deleteId);
        await deleteDoc(docRef);
        setDeleteId(null);
      } catch (error) {
        alert("Error deleting profile.");
        console.error("Error deleting profile:", error);
      }
    } else if (userInput !== null) {
      alert("Incorrect password. Access denied.");
    }
  };

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const queryLower = searchQuery.toLowerCase();
    return profiles.filter(profile => {
      const nameMatch = profile.name?.toLowerCase().includes(queryLower);
      const profMatch = profile.profession?.toLowerCase().includes(queryLower);
      const skillMatch = profile.skills?.some(skill => skill.toLowerCase().includes(queryLower));
      const homeMatch = profile.hometown?.toLowerCase().includes(queryLower);
      const collegeMatch = profile.college?.toLowerCase().includes(queryLower);
      return nameMatch || profMatch || skillMatch || homeMatch || collegeMatch;
    });
  }, [profiles, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold">Confirm Deletion</h3>
              </div>
              <p className="text-slate-600 mb-6">Are you sure you want to remove this profile? Password required.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-lg bg-slate-100 font-semibold">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold">Delete</button>
              </div>
            </div>
          </div>
        )}

        <header className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-800 mb-2">Lindsay Ward EQ Profiles</h1>
            <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2">
              <Database size={16} /> 
              {profiles.length} Profiles • Public Directory
            </p>
          </div>
          
          <div className="flex flex-col gap-3 w-full md:w-96">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="text"
                placeholder="Search name, job, hometown, or skills..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Registration Form */}
          <div className="lg:col-span-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8">
              <div className="flex items-center gap-2 mb-6 text-blue-600">
                <UserPlus size={20} />
                <h2 className="text-xl font-bold text-slate-800">Add Your Profile</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                  <input required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Joseph Smith" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Profession</label>
                  <input required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Prophet" value={formData.profession} onChange={(e) => setFormData({...formData, profession: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hometown</label>
                  <input className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Sharon, Vermont" value={formData.hometown} onChange={(e) => setFormData({...formData, hometown: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">College</label>
                  <input className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="School of the Prophets" value={formData.college} onChange={(e) => setFormData({...formData, college: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hobbies & Skills</label>
                  <textarea required rows="3" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Revelation, Stick Pull, Translation" value={formData.skills} onChange={(e) => setFormData({...formData, skills: e.target.value})} />
                </div>

                <button disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Publish Profile'}
                </button>
              </form>
            </div>
          </div>

          {/* Directory Display */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProfiles.map((profile) => (
                <div key={profile.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group flex flex-col h-full relative">
                  <button onClick={() => setDeleteId(profile.id)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{profile.name}</h3>
                  
                  <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold mb-2">
                    <Briefcase size={14} />
                    {profile.profession}
                  </div>

                  <div className="space-y-1 mb-4">
                    {profile.hometown && (
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <MapPin size={12} />
                        {profile.hometown}
                      </div>
                    )}
                    {profile.college && (
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <GraduationCap size={12} />
                        {profile.college}
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2 pt-4 border-t border-slate-50 mt-auto">
                    <Wrench size={14} className="text-slate-400 mt-1 flex-shrink-0" />
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills?.map((skill, idx) => (
                        <span key={idx} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-medium">{skill}</span>
                      ))}
                    </div>
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
