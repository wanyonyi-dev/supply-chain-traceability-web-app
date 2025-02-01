import React from 'react';
import { Link } from 'react-router-dom';
import ActivityViewer from './ActivityViewer';

const Dashboard = () => {
    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <Link to="/activities" className="nav-link">
                    View Supply Chain Activities
                </Link>
            </nav>
            <div className="dashboard-content">
                <ActivityViewer />
            </div>
        </div>
    );
};

export default Dashboard; 