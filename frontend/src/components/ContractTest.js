import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { initContract } from '../utils/web3Setup';
import { setupLocalNetwork, setupWalletListeners } from '../utils/setupMetaMask';

const ContractTest = () => {
    const [status, setStatus] = useState('Not Connected');
    const [error, setError] = useState(null);
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [productId, setProductId] = useState('');
    const [productName, setProductName] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('');

    const initialize = async () => {
        if (isInitializing) return;
        
        try {
            setIsInitializing(true);
            setError(null);
            setStatus('Connecting...');
            
            // Setup network and get account
            const { provider, account } = await setupLocalNetwork();
            setAccount(account);

            // Initialize contract
            const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
            const SupplyChainABI = require('../contracts/SupplyChain.json');
            
            const supplyChainContract = new ethers.Contract(
                contractAddress,
                SupplyChainABI.abi,
                provider.getSigner()
            );
            
            setContract(supplyChainContract);
            setStatus('Connected');
            
        } catch (err) {
            console.error('Initialization error:', err);
            setError(err.message || 'Failed to initialize');
            setStatus('Failed');
        } finally {
            setIsInitializing(false);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            if (!contract || !account) {
                throw new Error('Please connect your wallet first');
            }

            setStatus('Adding product...');
            
            // Convert price to wei
            const priceInWei = ethers.utils.parseEther(price.toString());
            
            const tx = await contract.addProduct(
                productId,
                productName,
                account,
                priceInWei,
                parseInt(quantity)
            );

            await tx.wait();
            
            console.log('Transaction successful:', tx.hash);
            setStatus('Connected');
            alert('Product added successfully!');
            
            // Clear form
            setProductId('');
            setProductName('');
            setPrice('');
            setQuantity('');
            
        } catch (err) {
            console.error('Add product error:', err);
            setError(err.message || 'Failed to add product');
            setStatus('Failed');
        }
    };

    useEffect(() => {
        initialize();

        // Add useEffect for wallet listeners
        const handleAccountsChanged = (accounts) => {
            if (accounts.length > 0) {
                setAccount(accounts[0]);
            } else {
                setAccount(null);
                setStatus('Not Connected');
            }
        };

        const handleChainChanged = () => {
            // Reload the page when network changes
            window.location.reload();
        };

        const cleanup = setupWalletListeners(handleAccountsChanged, handleChainChanged);

        return () => {
            if (cleanup) cleanup();
        };
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h2>Supply Chain Contract Test</h2>
            <p>Status: <span style={{ 
                color: status === 'Connected' ? 'green' : 
                       status === 'Failed' ? 'red' : 'orange'
            }}>{status}</span></p>
            
            {error && (
                <div style={{ 
                    color: 'red', 
                    padding: '10px', 
                    border: '1px solid red',
                    borderRadius: '4px',
                    marginBottom: '10px'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}
            
            {account && (
                <p>Connected Account: <code>{account}</code></p>
            )}

            {status === 'Connected' && (
                <form onSubmit={handleAddProduct} style={{ marginTop: '20px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>
                            Product ID:
                        </label>
                        <input
                            type="text"
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>
                            Product Name:
                        </label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>
                            Price (ETH):
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>
                            Quantity:
                        </label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isInitializing}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Add Product
                    </button>
                </form>
            )}
        </div>
    );
};

export default ContractTest; 