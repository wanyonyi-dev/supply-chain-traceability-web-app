import React, { useEffect } from 'react';
import { ethers } from 'ethers';
import SupplyChain from '../contracts/SupplyChain.json';

const BlockchainMonitor = ({ onEvent }) => {
    useEffect(() => {
        const setupMonitor = async () => {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const contract = new ethers.Contract(
                    process.env.REACT_APP_CONTRACT_ADDRESS,
                    SupplyChain.abi,
                    provider
                );

                contract.on('ActionTracked', (user, role, action, timestamp) => {
                    onEvent({
                        type: 'ActionTracked',
                        user,
                        role,
                        action,
                        timestamp: timestamp.toString()
                    });
                });

                return () => {
                    contract.removeAllListeners('ActionTracked');
                };
            } catch (error) {
                console.error('Error setting up blockchain monitor:', error);
            }
        };

        setupMonitor();
    }, [onEvent]);

    return null; // This component doesn't render anything
};

export default BlockchainMonitor; 