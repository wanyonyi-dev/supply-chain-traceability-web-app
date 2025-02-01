import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SplashScreen.css';

const SplashScreen = () => {
    const navigate = useNavigate();
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        // Start fade out after 4.5 seconds
        const fadeTimer = setTimeout(() => setFadeOut(true), 4500);
        
        // Navigate after 5 seconds
        const navTimer = setTimeout(() => {
            navigate('/login');
        }, 5000);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(navTimer);
        };
    }, [navigate]);

    return (
        <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
            <div className="splash-content">
                <div className="logo-container">
                    <div className="chain-icon">
                        <span className="link"></span>
                        <span className="link"></span>
                        <span className="link"></span>
                    </div>
                    <h1 className="app-title">
                        Supply Chain
                        <span className="subtitle">Traceability System</span>
                    </h1>
                </div>
                <div className="loading-bar">
                    <div className="loading-progress"></div>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen; 