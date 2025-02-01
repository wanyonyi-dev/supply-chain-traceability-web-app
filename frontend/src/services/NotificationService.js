import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const NotificationService = {
    sendNotification: async (userId, message, type) => {
        try {
            await addDoc(collection(db, 'notifications'), {
                userId,
                message,
                type,
                timestamp: new Date(),
                read: false
            });
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    },

    getUnreadNotifications: async (userId) => {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('read', '==', false)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    },

    markAsRead: async (notificationId) => {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, {
            read: true
        });
    }
};

export default NotificationService; 