import React, { useState } from 'react';
import QrScanner from 'react-qr-scanner';

const QRScanner = ({ onScan, onError }) => {
    const [facingMode, setFacingMode] = useState('environment');

    const handleScan = (data) => {
        if (data) {
            onScan(data.text);
        }
    };

    const handleError = (err) => {
        console.error(err);
        onError(err);
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    return (
        <div className="qr-scanner-container">
            <QrScanner
                delay={300}
                onError={handleError}
                onScan={handleScan}
                constraints={{
                    video: { facingMode }
                }}
                style={{ width: '100%', maxWidth: '400px' }}
            />
            <button onClick={toggleCamera} className="camera-toggle">
                Switch Camera
            </button>
        </div>
    );
};

export default QRScanner; 