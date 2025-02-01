import React, { useState } from 'react';
import { ethers } from 'ethers';
import SupplyChain from '../contracts/SupplyChain.json';

const ProductRegistration = () => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(
                process.env.REACT_APP_CONTRACT_ADDRESS,
                SupplyChain.abi,
                signer
            );

            const tx = await contract.createProduct(
                formData.name,
                formData.description,
                formData.location
            );
            await tx.wait();
            alert('Product registered successfully!');
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to register product');
        }
    };

    return (
        <div className="container">
            <h2>Register New Product</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Product Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Description</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Location</label>
                    <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        required
                    />
                </div>
                <button type="submit">Register Product</button>
            </form>
        </div>
    );
};

export default ProductRegistration; 