import React from 'react';
import QRCode from 'qrcode.react';
import { saveAs } from 'file-saver';
import './QRCodeGenerator.css';

const QRCodeGenerator = ({ productId, productData }) => {
    const qrData = JSON.stringify({
        productId,
        name: productData.name,
        producer: productData.producerId,
        timestamp: new Date().toISOString()
    });

    const downloadQR = () => {
        const canvas = document.getElementById('qr-code');
        canvas.toBlob((blob) => {
            saveAs(blob, `product-${productId}.png`);
        });
    };

    return (
        <div className="qr-container">
            <QRCode
                id="qr-code"
                value={qrData}
                size={256}
                level="H"
                includeMargin={true}
            />
            <button onClick={downloadQR} className="download-btn">
                Download QR Code
            </button>
        </div>
    );
};

export default QRCodeGenerator; 