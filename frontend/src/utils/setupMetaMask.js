import { ethers } from 'ethers';

let isConnecting = false;

export const setupLocalNetwork = async () => {
    try {
        // Check if MetaMask is installed
        if (!window.ethereum) {
            throw new Error('Please install MetaMask to use this application');
        }

        // Try to switch to local network
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x539' }], // Chain ID 1337 in hex
            });
        } catch (switchError) {
            // Add local network if it doesn't exist
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x539',
                        chainName: 'Local Network',
                        nativeCurrency: {
                            name: 'ETH',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: ['http://127.0.0.1:8545'],
                        blockExplorerUrls: null
                    }]
                });
            } else {
                throw switchError;
            }
        }

        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });

        return accounts[0];
    } catch (error) {
        console.error('Failed to setup local network:', error);
        throw error;
    }
};

// Add event listeners for account and network changes
export const setupWalletListeners = (handleAccountsChanged, handleChainChanged) => {
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        // Return cleanup function
        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        };
    }
};

// Helper function to check if MetaMask is connected
export const checkWalletConnection = async () => {
    if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.listAccounts();
    
    return {
        isConnected: accounts.length > 0,
        account: accounts[0] || null
    };
};

export const connectWallet = async () => {
    if (isConnecting) {
        throw new Error('Connection already in progress. Please wait.');
    }
    
    try {
        isConnecting = true;
        const accounts = await window.ethereum.request({
            method: 'eth_accounts'
        });
        
        if (accounts.length > 0) {
            return accounts[0];
        }
        
        const newAccounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        
        return newAccounts[0];
    } catch (error) {
        console.error('Error connecting wallet:', error);
        throw error;
    } finally {
        isConnecting = false;
    }
};

export const importGanacheAccount = async (privateKey) => {
    try {
        await window.ethereum.request({
            method: 'wallet_importRawKey',
            params: [privateKey, ''],
        });
        return true;
    } catch (error) {
        console.error('Error importing account:', error);
        return false;
    }
};

export const getCurrentNetwork = async () => {
    try {
        const chainId = await window.ethereum.request({ 
            method: 'eth_chainId' 
        });
        console.log('Current network chainId:', chainId);
        return chainId;
    } catch (error) {
        console.error('Failed to get current network:', error);
        throw error;
    }
}; 