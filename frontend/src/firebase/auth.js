import { auth, db } from './config';
import { doc, setDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

export const trackUserActivity = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            lastActive: new Date(),
            isOnline: true
        });
        
        // Add to session history
        await addDoc(collection(db, 'userSessions'), {
            userId,
            loginTime: new Date(),
            isActive: true
        });
    } catch (error) {
        console.error('Error tracking user activity:', error);
    }
};

export const createUserSession = async (user) => {
    try {
        const sessionRef = await addDoc(collection(db, 'userSessions'), {
            userId: user.uid,
            userEmail: user.email,
            loginTime: serverTimestamp(),
            isActive: true,
            userRole: user.role || 'user'
        });

        // Update user's online status
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            isOnline: true,
            lastActive: serverTimestamp(),
            currentSessionId: sessionRef.id
        });

        return sessionRef.id;
    } catch (error) {
        console.error('Error creating user session:', error);
    }
};

export const endUserSession = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            isOnline: false
        });
        
        // Update session history
        const sessionsRef = collection(db, 'userSessions');
        const q = query(sessionsRef, where('userId', '==', userId), where('isActive', '==', true));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(async (doc) => {
            await updateDoc(doc.ref, {
                logoutTime: new Date(),
                isActive: false,
                duration: (new Date() - doc.data().loginTime.toDate()) / 1000
            });
        });
    } catch (error) {
        console.error('Error ending user session:', error);
    }
}; 