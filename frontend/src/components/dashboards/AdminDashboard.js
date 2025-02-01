import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import ActivityViewer from '../ActivityViewer';
import DashboardMonitor from '../DashboardMonitor';
import BlockchainMonitor from '../BlockchainMonitor';
import UserActivityMonitor from '../UserActivityMonitor';
import SupplyChain from '../../contracts/SupplyChain.json';
import '../../styles/AdminDashboard.css';
import { trackUserActivity, endUserSession } from '../../firebase/auth';

const AdminDashboard = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userActivities, setUserActivities] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [systemSettings, setSystemSettings] = useState({
        maintenanceMode: false,
        notificationSettings: {
            emailNotifications: true,
            pushNotifications: true
        }
    });
    const [systemStats, setSystemStats] = useState({
        totalUsers: 0,
        activeSessions: 0,
        totalProducts: 0,
        activeDistributions: 0
    });
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Request account access if needed
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    if (user && user.email === 'admin@gmail.com') {
                        setIsAuthenticated(true);
                    } else {
                        setIsAuthenticated(false);
                    }
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error checking authentication:', error);
                setError('Please install MetaMask to use this dashboard');
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    // Monitor user sessions
    useEffect(() => {
        const userSessionsRef = collection(db, 'userSessions');
        const q = query(userSessionsRef, orderBy('loginTime', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                loginTime: doc.data().loginTime?.toDate(),
                logoutTime: doc.data().logoutTime?.toDate()
            }));
            setUserActivities(sessions);
        });

        return () => unsubscribe();
    }, []);

    // Monitor active users
    useEffect(() => {
        const activeUsersRef = collection(db, 'users');
        const q = query(activeUsersRef, where('isOnline', '==', true));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                lastActive: doc.data().lastActive?.toDate()
            }));
            setActiveUsers(users);
        });

        return () => unsubscribe();
    }, []);

    // Monitor system statistics
    useEffect(() => {
        const productsRef = collection(db, 'products');
        const distributionsRef = collection(db, 'distributions');
        
        const unsubProducts = onSnapshot(productsRef, (snapshot) => {
            setSystemStats(prev => ({
                ...prev,
                totalProducts: snapshot.size
            }));
        });

        const unsubDistributions = onSnapshot(query(distributionsRef, where('status', '==', 'IN_TRANSIT')), (snapshot) => {
            setSystemStats(prev => ({
                ...prev,
                activeDistributions: snapshot.size
            }));
        });

        return () => {
            unsubProducts();
            unsubDistributions();
        };
    }, []);

    // Fetch all users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef);
                const querySnapshot = await getDocs(q);
                const usersData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setUsers(usersData);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };
        fetchUsers();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            setError(null);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (userCredential.user.email !== 'admin@gmail.com') {
                await auth.signOut();
                throw new Error('Unauthorized access');
            }
            setIsAuthenticated(true);
            navigate('/admin/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            setError('Invalid credentials or unauthorized access');
        }
    };

    const handleBlockchainEvent = (event) => {
        console.log('Blockchain event:', event);
    };

    const handleLogout = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            await trackUserActivity(auth.currentUser, 'LOGOUT', 'User logged out');
            await endUserSession(auth.currentUser, sessionId);
            localStorage.removeItem('sessionId');
            await auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            setError(error.message);
        }
    };

    // User management functions
    const handleEditUser = (user) => {
        setSelectedUser(user);
        setShowUserModal(true);
    };

    const handleSaveUser = async (updatedUser) => {
        try {
            const userRef = doc(db, 'users', updatedUser.id);
            await updateDoc(userRef, updatedUser);
            setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
            setShowUserModal(false);
            addNotification('User updated successfully');
        } catch (error) {
            console.error('Error updating user:', error);
            setError('Failed to update user');
        }
    };

    // System settings functions
    const toggleMaintenanceMode = async () => {
        try {
            const newMode = !systemSettings.maintenanceMode;
            // Update in database
            const settingsRef = doc(db, 'systemSettings', 'main');
            await updateDoc(settingsRef, { maintenanceMode: newMode });
            setSystemSettings(prev => ({ ...prev, maintenanceMode: newMode }));
            addNotification(`Maintenance mode ${newMode ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling maintenance mode:', error);
            setError('Failed to update maintenance mode');
        }
    };

    // New components to render
    const renderUserManagement = () => (
        <div className="user-management-section">
            <h2>User Management</h2>
            <div className="users-grid">
                {users.map(user => (
                    <div key={user.id} className="user-card">
                        <div className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-email">{user.email}</span>
                            <span className="user-role">{user.role}</span>
                        </div>
                        <div className="user-actions">
                            <button 
                                onClick={() => handleEditUser(user)}
                                className="edit-btn"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderSystemSettings = () => (
        <div className="system-settings-section">
            <h2>System Settings</h2>
            <div className="settings-grid">
                <div className="setting-card">
                    <h3>Maintenance Mode</h3>
                    <label className="switch">
                        <input 
                            type="checkbox" 
                            checked={systemSettings.maintenanceMode}
                            onChange={toggleMaintenanceMode}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="setting-card">
                    <h3>Notification Settings</h3>
                    <div className="notification-options">
                        <label>
                            <input 
                                type="checkbox"
                                checked={systemSettings.notificationSettings.emailNotifications}
                                onChange={(e) => setSystemSettings(prev => ({
                                    ...prev,
                                    notificationSettings: {
                                        ...prev.notificationSettings,
                                        emailNotifications: e.target.checked
                                    }
                                }))}
                            />
                            Email Notifications
                        </label>
                        <label>
                            <input 
                                type="checkbox"
                                checked={systemSettings.notificationSettings.pushNotifications}
                                onChange={(e) => setSystemSettings(prev => ({
                                    ...prev,
                                    notificationSettings: {
                                        ...prev.notificationSettings,
                                        pushNotifications: e.target.checked
                                    }
                                }))}
                            />
                            Push Notifications
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderUserModal = () => (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Edit User</h3>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveUser(selectedUser);
                }}>
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            type="text"
                            value={selectedUser.name}
                            onChange={(e) => setSelectedUser(prev => ({
                                ...prev,
                                name: e.target.value
                            }))}
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={selectedUser.email}
                            onChange={(e) => setSelectedUser(prev => ({
                                ...prev,
                                email: e.target.value
                            }))}
                        />
                    </div>
                    <div className="form-group">
                        <label>Role</label>
                        <select
                            value={selectedUser.role}
                            onChange={(e) => setSelectedUser(prev => ({
                                ...prev,
                                role: e.target.value
                            }))}
                        >
                            <option value="ADMIN">Admin</option>
                            <option value="USER">User</option>
                            <option value="MANAGER">Manager</option>
                        </select>
                    </div>
                    <div className="form-actions">
                        <button type="submit">Save</button>
                        <button 
                            type="button" 
                            onClick={() => setShowUserModal(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="admin-login">
                <h2>Admin Login</h2>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@gmail.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="login-button">Login</button>
                </form>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <div className="header-content">
                    <h1>Supply Chain Admin</h1>
                    <button onClick={handleLogout} className="logout-button">
                        Logout
                    </button>
                </div>
            </header>
            
            <main className="admin-content">
                <div className="dashboard-grid">
                    <div className="activity-section">
                        <h2>Recent Activities</h2>
                        <ActivityViewer />
                    </div>
                    
                    <div className="monitor-section">
                        <h2>System Monitor</h2>
                        <DashboardMonitor />
                    </div>

                    <div className="users-section">
                        <h2>Active Users</h2>
                        <div className="active-users">
                            {activeUsers.map(user => (
                                <div key={user.id} className="user-card">
                                    <div className="user-info">
                                        <span className="user-name">{user.name}</span>
                                        <span className="user-role">{user.role}</span>
                                        <span className="user-status">Online</span>
                                    </div>
                                    <div className="user-activity">
                                        <p>Last Active: {user.lastActive?.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="user-sessions">
                        <h2>User Sessions</h2>
                        <div className="sessions-list">
                            {userActivities.map(session => (
                                <div key={session.id} className="session-card">
                                    <div className="session-header">
                                        <span className="user-email">{session.userEmail}</span>
                                        <span className="session-status">
                                            {session.logoutTime ? 'Completed' : 'Active'}
                                        </span>
                                    </div>
                                    <div className="session-details">
                                        <p>Login: {session.loginTime?.toLocaleString()}</p>
                                        {session.logoutTime && (
                                            <p>Logout: {session.logoutTime?.toLocaleString()}</p>
                                        )}
                                        <p>Duration: {session.logoutTime ? 
                                            calculateDuration(session.loginTime, session.logoutTime) :
                                            'Ongoing'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="user-activity-section">
                        <h2>User Activities</h2>
                        <UserActivityMonitor />
                    </div>

                    {renderUserManagement()}
                    {renderSystemSettings()}
                </div>
                
                <BlockchainMonitor onEvent={handleBlockchainEvent} />
            </main>

            <div className="admin-monitoring">
                <div className="stats-section">
                    <h3>System Statistics</h3>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <h4>Total Users</h4>
                            <p>{systemStats.totalUsers}</p>
                        </div>
                        <div className="stat-card">
                            <h4>Active Sessions</h4>
                            <p>{activeUsers.length}</p>
                        </div>
                        <div className="stat-card">
                            <h4>Total Products</h4>
                            <p>{systemStats.totalProducts}</p>
                        </div>
                        <div className="stat-card">
                            <h4>Active Distributions</h4>
                            <p>{systemStats.activeDistributions}</p>
                        </div>
                    </div>
                </div>

                <div className="activity-section">
                    <h3>User Activity</h3>
                    <div className="activity-list">
                        {userActivities.map(activity => (
                            <div key={activity.id} className="activity-item">
                                <p>User: {activity.userId}</p>
                                <p>Login: {activity.loginTime?.toLocaleString()}</p>
                                <p>Duration: {activity.duration ? `${activity.duration} seconds` : 'Active'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showUserModal && renderUserModal()}
        </div>
    );
};

const calculateDuration = (start, end) => {
    const diff = end - start;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? 
        `${hours}h ${minutes % 60}m` : 
        `${minutes}m`;
};

export default AdminDashboard; 