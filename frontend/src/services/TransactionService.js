import { ethers } from 'ethers';

class TransactionService {
    constructor() {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
    }

    async waitForTransaction(txHash) {
        try {
            const receipt = await this.provider.waitForTransaction(txHash);
            return {
                status: receipt.status === 1 ? 'success' : 'failed',
                receipt
            };
        } catch (error) {
            console.error('Transaction monitoring error:', error);
            throw error;
        }
    }

    async estimateGas(contract, methodName, args) {
        try {
            // Get the contract method
            const method = contract[methodName];
            if (!method) {
                throw new Error(`Method ${methodName} not found on contract`);
            }

            // Estimate gas using the contract method
            const gasEstimate = await method(...args, { 
                from: await this.signer.getAddress() 
            }).estimateGas();

            // Add 20% buffer to gas estimate
            return gasEstimate.mul(120).div(100);
        } catch (error) {
            console.error('Gas estimation error:', error);
            throw error;
        }
    }

    async getTransactionDetails(txHash) {
        try {
            const tx = await this.provider.getTransaction(txHash);
            const receipt = await this.provider.getTransactionReceipt(txHash);
            const block = await this.provider.getBlock(tx.blockNumber);

            return {
                hash: txHash,
                from: tx.from,
                to: tx.to,
                value: ethers.utils.formatEther(tx.value),
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: ethers.utils.formatUnits(tx.gasPrice, 'gwei'),
                timestamp: block.timestamp,
                status: receipt.status === 1 ? 'success' : 'failed',
                blockNumber: tx.blockNumber
            };
        } catch (error) {
            console.error('Error getting transaction details:', error);
            throw error;
        }
    }
}

export default new TransactionService(); 