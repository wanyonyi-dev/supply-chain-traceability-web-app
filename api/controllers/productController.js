const Product = require('../models/Product');
const ethers = require('ethers');
const SupplyChain = require('../contracts/SupplyChain.json');

exports.createProduct = async (req, res) => {
    try {
        const { name, description, location } = req.body;

        // Store in MongoDB
        const product = new Product({
            name,
            description,
            location,
            manufacturer: req.user.address,
            status: 'CREATED'
        });
        await product.save();

        // Store in Blockchain
        const provider = new ethers.providers.JsonRpcProvider(process.env.BLOCKCHAIN_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const contract = new ethers.Contract(
            process.env.CONTRACT_ADDRESS,
            SupplyChain.abi,
            wallet
        );

        const tx = await contract.createProduct(name, description, location);
        await tx.wait();

        res.status(201).json({ success: true, data: product });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
}; 