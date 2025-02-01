import React, { useState, useEffect } from 'react';
import TransactionService from '../services/TransactionService';
import { ethers } from 'ethers';

const TransactionMonitor = ({ transaction, onComplete }) => {
    const [status, setStatus] = useState('pending');
    const [details, setDetails] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (transaction?.hash) {
            monitorTransaction(transaction.hash);
        }
    }, [transaction]);

    const monitorTransaction = async (txHash) => {
        try {
            setStatus('pending');
            setError(null);

            const { status: txStatus, receipt } = await TransactionService.waitForTransaction(txHash);
            const txDetails = await TransactionService.getTransactionDetails(txHash);

            setStatus(txStatus);
            setDetails(txDetails);

            if (onComplete) {
                onComplete({ status: txStatus, receipt, details: txDetails });
            }
        } catch (error) {
            console.error('Transaction monitoring error:', error);
            setStatus('failed');
            setError(error.message);
        }
    };

    return (
        <div className="transaction-monitor">
            <h4>Transaction Status</h4>
            <div className={`status-indicator ${status}`}>
                {status.toUpperCase()}
            </div>
            
            {error && (
                <div className="error-message">
                    Error: {error}
                </div>
            )}
            
            {details && (
                <div className="transaction-details">
                    <p><strong>Hash:</strong> {details.hash}</p>
                    <p><strong>Block:</strong> {details.blockNumber}</p>
                    <p><strong>Gas Used:</strong> {details.gasUsed}</p>
                    <p><strong>Gas Price:</strong> {details.gasPrice} Gwei</p>
                    <p><strong>Total Cost:</strong> {
                        ethers.utils.formatEther(
                            ethers.BigNumber.from(details.gasUsed)
                                .mul(ethers.utils.parseUnits(details.gasPrice, 'gwei'))
                        )
                    } ETH</p>
                </div>
            )}
        </div>
    );
};

export default TransactionMonitor; 