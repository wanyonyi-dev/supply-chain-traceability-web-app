import Web3 from 'web3';
import SupplyChainABI from '../blockchain/SupplyChainABI.json';

class SupplyChainContract {
    constructor() {
        // Use local network in development
        const isDev = process.env.NODE_ENV === 'development';
        const provider = isDev ? 
            'http://127.0.0.1:8545' : 
            window.ethereum;
            
        this.web3 = new Web3(provider);
        this.initializeContract();
        this.subscriptions = [];
    }

    async initializeContract() {
        try {
            // Get test accounts if in development
            const accounts = await this.web3.eth.getAccounts();
            this.defaultAccount = accounts[0]; // First account with plenty of test ETH
            console.log('Connected account:', this.defaultAccount);
            console.log('Account balance:', await this.web3.eth.getBalance(this.defaultAccount));

            this.contract = new this.web3.eth.Contract(
                SupplyChainABI.abi,
                process.env.REACT_APP_CONTRACT_ADDRESS
            );

            // Log successful initialization
            console.log('Contract initialized at:', process.env.REACT_APP_CONTRACT_ADDRESS);
            console.log('Available methods:', Object.keys(this.contract.methods));

            if (!this.contract.methods) {
                throw new Error('Contract methods not initialized');
            }
        } catch (error) {
            console.error('Contract initialization error:', error);
            throw error;
        }
    }

    async addProduct(productData) {
        try {
            // Check if MetaMask is locked
            const accounts = await this.web3.eth.getAccounts();
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found. Please connect your wallet.');
            }

            console.log('Adding product with data:', productData);
            console.log('Using account:', accounts[0]);

            const priceInWei = this.web3.utils.toWei(productData.price.toString(), 'ether');
            
            // Log transaction details before sending
            console.log('Transaction details:', {
                from: accounts[0],
                productId: productData.productId,
                name: productData.name,
                price: priceInWei,
                quantity: parseInt(productData.quantity)
            });

            const tx = await this.contract.methods.addProduct(
                productData.productId,
                productData.name,
                accounts[0], // Use the connected account as producer
                priceInWei,
                parseInt(productData.quantity)
            ).send({ 
                from: accounts[0],
                gas: 3000000
            });

            console.log('Transaction successful:', tx);
            return tx;

        } catch (error) {
            console.error('Error in addProduct:', error);
            
            // Handle specific error cases
            if (error.message.includes('User denied')) {
                throw new Error('Transaction was rejected. Please confirm the transaction in MetaMask.');
            }
            if (error.message.includes('insufficient funds')) {
                throw new Error('Insufficient funds in your wallet to complete this transaction.');
            }
            if (error.message.includes('invalid address')) {
                throw new Error('Invalid Ethereum address. Please check your wallet connection.');
            }
            
            // Throw the original error if it's not a specific case
            throw error;
        }
    }

    async distributeProduct(productId, quantity) {
        try {
            const gasEstimate = await this.contract.estimateGas.distributeProduct(
                productId, 
                quantity
            );

            const tx = await this.contract.distributeProduct(
                productId,
                quantity,
                {
                    gasLimit: gasEstimate.mul(120).div(100)
                }
            );
            return tx;
        } catch (error) {
            console.error('Error in distributeProduct:', error);
            throw error;
        }
    }

    async receiveProduct(productId) {
        try {
            // Check if MetaMask is locked
            const accounts = await this.web3.eth.getAccounts();
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found. Please connect your wallet.');
            }

            console.log('Receiving product:', productId);
            console.log('Using account:', accounts[0]);

            const tx = await this.contract.methods.receiveProduct(productId)
                .send({ 
                    from: accounts[0],
                    gas: 3000000
                });

            console.log('Transaction successful:', tx);
            return tx;

        } catch (error) {
            console.error('Error in receiveProduct:', error);
            
            // Handle specific error cases
            if (error.message.includes('User denied')) {
                throw new Error('Transaction was rejected. Please confirm the transaction in MetaMask.');
            }
            if (error.message.includes('Product is not in transit')) {
                throw new Error('Product cannot be received because it is not in transit.');
            }
            if (error.message.includes('Producer cannot receive')) {
                throw new Error('Producers cannot receive their own products.');
            }
            
            throw error;
        }
    }

    async purchaseProducts(productIds, options = {}) {
        try {
            const gasEstimate = await this.contract.estimateGas.purchaseProducts(
                productIds,
                options
            );

            const tx = await this.contract.purchaseProducts(
                productIds,
                {
                    ...options,
                    gasLimit: gasEstimate.mul(120).div(100)
                }
            );
            return tx;
        } catch (error) {
            console.error('Error in purchaseProducts:', error);
            throw error;
        }
    }

    async getProductHistory(productId) {
        try {
            return await this.contract.getProductHistory(productId);
        } catch (error) {
            console.error('Error in getProductHistory:', error);
            throw error;
        }
    }

    subscribeToEvent(eventName, callback) {
        if (!this.contract || !this.contract.events) {
            console.error('Contract not properly initialized for events');
            return;
        }

        try {
            const subscription = this.contract.events[eventName]({}, callback);
            this.subscriptions.push({ name: eventName, subscription });
            return subscription;
        } catch (error) {
            console.error(`Failed to subscribe to ${eventName}:`, error);
        }
    }

    unsubscribeFromEvent(eventName) {
        const index = this.subscriptions.findIndex(sub => sub.name === eventName);
        if (index !== -1) {
            const { subscription } = this.subscriptions[index];
            if (subscription && subscription.unsubscribe) {
                subscription.unsubscribe();
            }
            this.subscriptions.splice(index, 1);
        }
    }

    unsubscribeAll() {
        this.subscriptions.forEach(({ subscription }) => {
            if (subscription && subscription.unsubscribe) {
                subscription.unsubscribe();
            }
        });
        this.subscriptions = [];
    }

    // Helper method to verify contract state
    async verifyContract() {
        try {
            const accounts = await this.web3.eth.getAccounts();
            const networkId = await this.web3.eth.net.getId();
            const contractAddress = this.contract._address;
            
            console.log('Contract verification:', {
                accounts,
                networkId,
                contractAddress,
                hasMethods: !!this.contract.methods,
                availableMethods: Object.keys(this.contract.methods || {})
            });
            
            return true;
        } catch (error) {
            console.error('Contract verification failed:', error);
            return false;
        }
    }

    // Helper method to check wallet connection
    async isWalletConnected() {
        try {
            const accounts = await this.web3.eth.getAccounts();
            return accounts && accounts.length > 0;
        } catch (error) {
            return false;
        }
    }

    // Helper method to get current wallet address
    async getCurrentAddress() {
        const accounts = await this.web3.eth.getAccounts();
        return accounts[0];
    }

    // Add method to check transaction status
    async getTransactionStatus(txHash) {
        try {
            const receipt = await this.web3.eth.getTransactionReceipt(txHash);
            console.log('Transaction receipt:', receipt);
            return receipt;
        } catch (error) {
            console.error('Error getting transaction status:', error);
            throw error;
        }
    }

    // Add method to get product details
    async getProduct(productId) {
        try {
            const product = await this.contract.methods.getProduct(productId).call();
            console.log('Product details:', product);
            return product;
        } catch (error) {
            console.error('Error getting product:', error);
            throw error;
        }
    }
}

const supplyChainContract = new SupplyChainContract();

// Verify contract initialization
supplyChainContract.verifyContract().then(isValid => {
    console.log('Contract initialization status:', isValid);
});

export default supplyChainContract; 