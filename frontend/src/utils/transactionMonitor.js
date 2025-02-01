import Web3 from 'web3';

export const monitorTransaction = async (txHash) => {
    const web3 = new Web3(Web3.givenProvider);
    
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    if (!receipt) {
        // Transaction pending
        return new Promise((resolve) => {
            const checkReceipt = setInterval(async () => {
                const receipt = await web3.eth.getTransactionReceipt(txHash);
                if (receipt) {
                    clearInterval(checkReceipt);
                    resolve(receipt);
                }
            }, 1000);
        });
    }
    return receipt;
};

export const getTransactionDetails = async (txHash) => {
    const web3 = new Web3(Web3.givenProvider);
    const tx = await web3.eth.getTransaction(txHash);
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    
    return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: web3.utils.fromWei(tx.value, 'ether'),
        gasUsed: receipt.gasUsed,
        status: receipt.status ? 'Success' : 'Failed',
        blockNumber: tx.blockNumber,
        timestamp: (await web3.eth.getBlock(tx.blockNumber)).timestamp
    };
}; 