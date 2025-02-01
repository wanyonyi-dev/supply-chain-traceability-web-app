import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const AuditService = {
    logAction: async (userId, action, details) => {
        try {
            await addDoc(collection(db, 'audit_logs'), {
                userId,
                action,
                details,
                timestamp: new Date().toISOString(),
                ipAddress: window.sessionStorage.getItem('userIP'),
                userAgent: navigator.userAgent
            });
        } catch (error) {
            console.error('Audit logging failed:', error);
        }
    },

    getAuditLogs: async (filters = {}) => {
        try {
            let q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
            
            if (filters.userId) {
                q = query(q, where('userId', '==', filters.userId));
            }
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            return [];
        }
    }
};

export default AuditService; 