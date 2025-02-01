import Web3 from 'web3';

export const checkNetwork = async () => {
    if (window.ethereum) {
        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // Create Web3 instance
            const web3 = new Web3(window.ethereum);
            
            // Get network ID
            const networkId = await web3.eth.net.getId();
            
            // Check if we're on the correct network
            if (networkId !== parseInt(process.env.TESTNET_NETWORK_ID)) {
                throw new Error('Please connect to the correct network');
            }
            
            return true;
        } catch (error) {
            console.error('Error connecting to blockchain:', error);
            return false;
        }
    } else {
        console.error('Please install MetaMask!');
        return false;
    }
}; 