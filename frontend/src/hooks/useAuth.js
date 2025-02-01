import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    console.log('User authenticated:', user.email);
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        console.log('User role:', userData.role);
                        setUser({ ...user, role: userData.role });
                        localStorage.setItem('userRole', userData.role);
                    } else {
                        console.log('No user document found');
                        setUser(user);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUser(user);
                }
            } else {
                console.log('No user authenticated');
                setUser(null);
                localStorage.removeItem('userRole');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, loading };
}; 