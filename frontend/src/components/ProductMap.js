import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Map.css';

const mapContainerStyle = {
    width: '100%',
    height: '400px'
};

const center = {
    lat: -1.2921,
    lng: 36.8219
};

const ProductMap = ({ productId }) => {
    const [productLocation, setProductLocation] = useState(null);
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY
    });

    useEffect(() => {
        const productRef = doc(db, 'products', productId);
        const unsubscribe = onSnapshot(productRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.location) {
                    setProductLocation({
                        lat: data.location.latitude,
                        lng: data.location.longitude
                    });
                }
            }
        });

        return () => unsubscribe();
    }, [productId]);

    if (loadError) return <div>Error loading maps</div>;
    if (!isLoaded) return <div>Loading Maps...</div>;

    return (
        <div className="product-map">
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={productLocation || center}
            >
                {productLocation && (
                    <Marker position={productLocation} />
                )}
            </GoogleMap>
        </div>
    );
};

export default ProductMap; 