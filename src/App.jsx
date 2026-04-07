import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const App = () => {
  const [talents, setTalents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchTalents = async () => {
      const q = query(collection(db, 'talents'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      setTalents(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchTalents();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const filteredTalents = talents.filter(talent =>
    talent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h1>Talent Directory</h1>
      <input
        type="text"
        placeholder="Search talents..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      <ul>
        {filteredTalents.map(talent => (
          <li key={talent.id}>{talent.name}</li>
        ))}
      </ul>
      {user ? <p>Welcome, {user.email}</p> : <p>Please log in</p>}
    </div>
  );
};

export default App;