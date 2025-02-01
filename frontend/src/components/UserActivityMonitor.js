import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const UserActivityMonitor = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            const activitiesRef = collection(db, 'userActivities');
            const q = query(
                activitiesRef,
                orderBy('timestamp', 'desc'),
                limit(20)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const activityData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate()
                }));
                setActivities(activityData);
                setLoading(false);
            }, (error) => {
                console.error('Error fetching user activities:', error);
                setError('Failed to load user activities');
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error('Error setting up user activity monitor:', error);
            setError('Failed to initialize user activity monitor');
            setLoading(false);
        }
    }, []);

    if (loading) return <div className="loading">Loading user activities...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="user-activity-monitor">
            <div className="activity-list">
                {activities.map(activity => (
                    <div key={activity.id} className="activity-item">
                        <div className="activity-header">
                            <span className="user-info">
                                {activity.userEmail} ({activity.userRole})
                            </span>
                            <span className="timestamp">
                                {activity.timestamp?.toLocaleString()}
                            </span>
                        </div>
                        <div className="activity-content">
                            <span className="activity-type">{activity.type}</span>
                            <p className="activity-description">{activity.description}</p>
                        </div>
                        {activity.details && (
                            <div className="activity-details">
                                <pre>{JSON.stringify(activity.details, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserActivityMonitor; 