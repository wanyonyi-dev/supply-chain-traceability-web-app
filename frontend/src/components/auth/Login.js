import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { trackUserActivity, createUserSession } from '../../firebase/auth';
import './Auth.css';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleNavigation = async (userCredential, role) => {
        try {
            // Update user role in Firestore
            const user = userCredential.user;
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                role: role,
                lastLogin: new Date().toISOString(),
                isOnline: true
            }, { merge: true });

            // Track login activity and create session
            user.role = role;
            await trackUserActivity(user, 'LOGIN', `${role} logged in`);
            const sessionId = await createUserSession(user);
            localStorage.setItem('sessionId', sessionId);
            localStorage.setItem('userRole', role);

            // Show loading state
            setLoading(true);

            // Small delay to ensure Firestore updates are complete
            setTimeout(() => {
                // Navigate to dashboard
                navigate(`/${role}/dashboard`, { replace: true });
                
                // Reload after navigation to ensure fresh data
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Navigation error:', error);
            setError('Error during login process');
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            console.log('Attempting login with:', formData.email);
            
            // Admin login
            if (formData.email === 'admin@gmail.com' && formData.password === '823Abt254@') {
                const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                console.log('Admin login successful');
                await handleNavigation(userCredential, 'admin');
                return;
            }

            // Producer login
            if (formData.email === 'producer@gmail.com' && formData.password === '823Abt254@') {
                const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                console.log('Producer login successful');
                await handleNavigation(userCredential, 'producer');
                return;
            }
            
            // Distributor login
            if (formData.email === 'distributor@gmail.com' && formData.password === '823Abt254@') {
                const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                console.log('Distributor login successful');
                await handleNavigation(userCredential, 'distributor');
                return;
            }

            // Regular customer login
            const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log('Customer login successful');
                await handleNavigation(userCredential, userData.role);
            } else {
                throw new Error('User data not found');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Invalid email or password');
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Login</h2>
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                            placeholder="Enter your email"
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                            placeholder="Enter your password"
                            disabled={loading}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="submit-btn"
                    >
                        {loading ? (
                            <div className="loading-spinner">
                                <span>Logging in...</span>
                            </div>
                        ) : (
                            'Login'
                        )}
                    </button>
                </form>
                <div className="auth-footer">
                    New customer? <Link to="/register">Register here</Link>
                </div>
            </div>
        </div>
    );
};

export default Login; 