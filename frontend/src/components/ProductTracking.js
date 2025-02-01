import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import QRCode from 'qrcode.react';
import SupplyChain from '../contracts/SupplyChain.json';

const ProductTracking = () => {
    const [productId, setProductId] = useState('');
    const [product, setProduct] = useState(null);
    const [history, setHistory] = useState([]);

    const fetchProduct = async () => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const contract = new ethers.Contract(
                process.env.REACT_APP_CONTRACT_ADDRESS,
                SupplyChain.abi,
                provider
            );

            const productData = await contract.getProduct(productId);
            const trackingHistory = await contract.getTrackingHistory(productId);

            setProduct({
                id: productData.id.toString(),
                name: productData.name,
                description: productData.description,
                manufacturer: productData.manufacturer,
                currentOwner: productData.currentOwner,
                currentLocation: productData.currentLocation,
                status: productData.status,
                timestamp: new Date(productData.timestamp * 1000).toLocaleString()
            });

            setHistory(trackingHistory.map(update => ({
                updatedBy: update.updatedBy,
                location: update.location,
                status: update.status,
                timestamp: new Date(update.timestamp * 1000).toLocaleString()
            })));
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to fetch product data');
        }
    };

    return (
        <div className="container">
            <h2>Product Tracking</h2>
            <div className="search-section">
                <input
                    type="number"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    placeholder="Enter Product ID"
                />
                <button onClick={fetchProduct}>Track Product</button>
            </div>

            {product && (
                <div className="product-details">
                    <h3>Product Details</h3>
                    <div className="qr-code">
                        <QRCode value={`${window.location.origin}/track/${product.id}`} />
                    </div>
                    <div className="details">
                        <p><strong>Name:</strong> {product.name}</p>
                        <p><strong>Description:</strong> {product.description}</p>
                        <p><strong>Current Location:</strong> {product.currentLocation}</p>
                        <p><strong>Status:</strong> {product.status}</p>
                        <p><strong>Last Updated:</strong> {product.timestamp}</p>
                    </div>

                    <h4>Tracking History</h4>
                    <div className="tracking-history">
                        {history.map((update, index) => (
                            <div key={index} className="history-item">
                                <p><strong>Status:</strong> {update.status}</p>
                                <p><strong>Location:</strong> {update.location}</p>
                                <p><strong>Updated By:</strong> {update.updatedBy}</p>
                                <p><strong>Timestamp:</strong> {update.timestamp}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductTracking; 