import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Tracking.css';

const TrackingHistory = ({ productId }) => {
    const [trackingData, setTrackingData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrackingData = async () => {
            try {
                const q = query(
                    collection(db, 'trackingHistory'),
                    where('productId', '==', productId),
                    orderBy('timestamp', 'desc')
                );
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setTrackingData(data);
            } catch (error) {
                console.error('Error fetching tracking data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrackingData();
    }, [productId]);

    return (
        <div className="tracking-history">
            <h3>Tracking History</h3>
            {loading ? (
                <div className="loading">Loading tracking data...</div>
            ) : (
                <div className="timeline">
                    {trackingData.map((entry, index) => (
                        <div key={entry.id} className="timeline-item">
                            <div className="timeline-marker"></div>
                            <div className="timeline-content">
                                <p>Location: {entry.location.latitude}, {entry.location.longitude}</p>
                                <p>Time: {new Date(entry.timestamp).toLocaleString()}</p>
                                {index < trackingData.length - 1 && (
                                    <div className="timeline-connector"></div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TrackingHistory; 