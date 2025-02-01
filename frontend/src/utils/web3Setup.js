import Web3 from 'web3';
import SupplyChainABI from '../contracts/SupplyChain.json';

const getWeb3 = async () => {
    // First try local network
    try {
        const provider = new Web3.providers.HttpProvider('http://127.0.0.1:8545');  // Correct URL format
        const web3 = new Web3(provider);
        // Test connection
        await web3.eth.net.isListening();
        console.log('Connected to local network');
        return web3;
    } catch (error) {
        console.error('Local network connection failed:', error);
        // Fallback to MetaMask
        if (window.ethereum) {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            return new Web3(window.ethereum);
        }
        throw new Error("No Web3 provider found");
    }
};

export const initContract = async () => {
    try {
        const web3 = await getWeb3();
        const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
        
        if (!contractAddress) {
            throw new Error("Contract address not found in environment variables");
        }

        const contract = new web3.eth.Contract(
            SupplyChainABI.abi,
            contractAddress
        );

        return { web3, contract };
    } catch (error) {
        console.error("Failed to initialize contract:", error);
        throw error;
    }
};

export default getWeb3;

export const checkNetwork = async () => {
    try {
        const web3 = await getWeb3();
        const networkId = await web3.eth.net.getId();
        const requiredNetworkId = parseInt(process.env.REACT_APP_NETWORK_ID || "1337");
        
        if (networkId !== requiredNetworkId) {
            throw new Error(`Please connect to network ID: ${requiredNetworkId}`);
        }
        return true;
    } catch (error) {
        console.error("Network check failed:", error);
        throw error;
    }
}; 