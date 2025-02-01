import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import '../styles/ActivityViewer.css';

const ActivityViewer = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchActivities = async () => {
        try {
            const activitiesRef = collection(db, 'activities');
            const q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(10));
            const querySnapshot = await getDocs(q);
            
            const activitiesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate()
            }));
            
            setActivities(activitiesData);
            setError(null);
        } catch (err) {
            console.error('Error fetching activities:', err);
            setError('Failed to load activities');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
        // Set up real-time listener
        const interval = setInterval(fetchActivities, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="loading">Loading activities...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="activity-viewer">
            <h2>Supply Chain Activities</h2>
            <button onClick={fetchActivities} className="refresh-button">
                Refresh Activities
            </button>
            <div className="activity-list">
                {activities.map((activity, index) => (
                    <div key={index} className="activity-item">
                        <div className="activity-header">
                            <span className={`role ${activity.role.toLowerCase()}`}>
                                {activity.role}
                            </span>
                            <span className="activity-time">
                                {activity.timestamp?.toLocaleString()}
                            </span>
                        </div>
                        <div className="activity-body">
                            <p className="action">{activity.action}</p>
                            <p className="details">{activity.details}</p>
                        </div>
                        <div className="activity-footer">
                            <small>By: {activity.user}</small>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityViewer; 