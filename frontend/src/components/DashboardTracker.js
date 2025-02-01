import React, { useState, useEffect } from 'react';
import TrackingService from '../services/TrackingService';

const DashboardTracker = ({ role, address }) => {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActions();
    }, [role, address]);

    const loadActions = async () => {
        try {
            const history = await TrackingService.getActionHistory(role, address);
            setActions(history);
        } catch (error) {
            console.error('Error loading actions:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-tracker">
            <h3>{role} Actions</h3>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="action-list">
                    {actions.map((action, index) => (
                        <div key={index} className="action-item">
                            <p><strong>Action:</strong> {action.action}</p>
                            <p><strong>Time:</strong> {action.timestamp}</p>
                            <p><strong>Data:</strong> {action.data}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardTracker; 