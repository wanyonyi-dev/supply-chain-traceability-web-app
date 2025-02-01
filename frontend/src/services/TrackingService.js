import Web3 from 'web3';
import { ethers } from 'ethers';
import SupplyChain from '../contracts/SupplyChain.json';

class TrackingService {
    constructor() {
        this.web3 = new Web3(window.ethereum);
        this.contract = new this.web3.eth.Contract(
            SupplyChain.abi,
            process.env.REACT_APP_CONTRACT_ADDRESS
        );
    }

    async trackProducerAction(action, productData) {
        const accounts = await this.web3.eth.getAccounts();
        return this.contract.methods.trackProducerAction(
            action,
            JSON.stringify(productData),
            new Date().toISOString()
        ).send({ from: accounts[0] });
    }

    async trackDistributorAction(action, distributionData) {
        const accounts = await this.web3.eth.getAccounts();
        return this.contract.methods.trackDistributorAction(
            action,
            JSON.stringify(distributionData),
            new Date().toISOString()
        ).send({ from: accounts[0] });
    }

    async trackRetailerAction(action, retailData) {
        const accounts = await this.web3.eth.getAccounts();
        return this.contract.methods.trackRetailerAction(
            action,
            JSON.stringify(retailData),
            new Date().toISOString()
        ).send({ from: accounts[0] });
    }

    async getActionHistory(role, address) {
        return this.contract.methods.getActionHistory(role, address).call();
    }

    async getAllActivities(limit = 20) {
        try {
            const activities = await this.contract.methods.getAllActivities(limit).call();
            return activities.map(activity => ({
                user: activity.user,
                role: ['PRODUCER', 'DISTRIBUTOR', 'RETAILER'][activity.role],
                action: activity.action,
                timestamp: new Date(Number(activity.timestamp) * 1000),
                details: activity.details
            }));
        } catch (error) {
            console.error('Error getting activities:', error);
            throw error;
        }
    }

    async getActivityHistoryForUser(userAddress) {
        try {
            const history = await this.contract.methods.getActivityHistory(userAddress).call();
            return history.map(item => ({
                action: item.action,
                data: item.data,
                timestamp: new Date(item.timestamp),
                actor: item.actor,
                role: ['PRODUCER', 'DISTRIBUTOR', 'RETAILER'][item.role]
            }));
        } catch (error) {
            console.error('Error getting user history:', error);
            throw error;
        }
    }
}

export default new TrackingService(); 