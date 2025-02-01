import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import QRCode from 'qrcode.react';

const ProductVerification = () => {
    const [productId, setProductId] = useState('');
    const [product, setProduct] = useState(null);
    const [error, setError] = useState('');

    const verifyProduct = async () => {
        try {
            const productRef = doc(db, 'products', productId);
            const productDoc = await getDoc(productRef);
            
            if (productDoc.exists()) {
                const productData = productDoc.data();
                setProduct({
                    id: productId,
                    name: productData.name,
                    description: productData.description,
                    manufacturer: productData.manufacturer,
                    productionDate: productData.productionDate,
                    status: productData.status,
                    blockchainId: productData.blockchainId
                });
                setError('');
            } else {
                setError('Product not found');
                setProduct(null);
            }
        } catch (err) {
            setError('Error verifying product');
            console.error(err);
        }
    };

    return (
        <div className="verification-container">
            <h2>Product Verification</h2>
            <div className="verification-input">
                <input
                    type="text"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    placeholder="Enter Product ID or Scan QR Code"
                />
                <button onClick={verifyProduct}>Verify</button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {product && (
                <div className="verification-result">
                    <h3>Product Details</h3>
                    <div className="qr-code">
                        <QRCode value={JSON.stringify(product)} />
                    </div>
                    <div className="product-details">
                        <p><strong>Name:</strong> {product.name}</p>
                        <p><strong>Description:</strong> {product.description}</p>
                        <p><strong>Manufacturer:</strong> {product.manufacturer}</p>
                        <p><strong>Production Date:</strong> {product.productionDate}</p>
                        <p><strong>Status:</strong> {product.status}</p>
                        <p><strong>Blockchain ID:</strong> {product.blockchainId}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductVerification; 