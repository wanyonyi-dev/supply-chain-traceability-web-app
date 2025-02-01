import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const DashboardMonitor = () => {
    const [stats, setStats] = useState({
        totalOrders: 0,
        pendingOrders: 0,
        activeDistributions: 0,
        totalProducts: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Orders listener
                const ordersQuery = query(collection(db, 'orders'));
                const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
                    const total = snapshot.size;
                    const pending = snapshot.docs.filter(doc => 
                        doc.data().status === 'PENDING'
                    ).length;
                    
                    setStats(prev => ({
                        ...prev,
                        totalOrders: total,
                        pendingOrders: pending
                    }));
                });

                // Distributions listener
                const distributionsQuery = query(
                    collection(db, 'distributions'),
                    where('status', '==', 'IN_TRANSIT')
                );
                const unsubDistributions = onSnapshot(distributionsQuery, (snapshot) => {
                    setStats(prev => ({
                        ...prev,
                        activeDistributions: snapshot.size
                    }));
                });

                // Products listener
                const productsQuery = query(collection(db, 'products'));
                const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
                    setStats(prev => ({
                        ...prev,
                        totalProducts: snapshot.size
                    }));
                });

                setLoading(false);

                return () => {
                    unsubOrders();
                    unsubDistributions();
                    unsubProducts();
                };
            } catch (error) {
                console.error('Error setting up monitors:', error);
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div>Loading statistics...</div>;

    return (
        <div className="dashboard-monitor">
            <div className="stat-card">
                <h3>Total Orders</h3>
                <p className="stat-value">{stats.totalOrders}</p>
            </div>
            <div className="stat-card">
                <h3>Pending Orders</h3>
                <p className="stat-value">{stats.pendingOrders}</p>
            </div>
            <div className="stat-card">
                <h3>Active Distributions</h3>
                <p className="stat-value">{stats.activeDistributions}</p>
            </div>
            <div className="stat-card">
                <h3>Total Products</h3>
                <p className="stat-value">{stats.totalProducts}</p>
            </div>
        </div>
    );
};

export default DashboardMonitor; 