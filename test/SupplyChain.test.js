const SupplyChain = artifacts.require("SupplyChain");
const { expect } = require('chai');
const truffleAssert = require('truffle-assertions');

contract("SupplyChain", accounts => {
    let supplyChain;
    const owner = accounts[0];
    const producer = accounts[1];
    const distributor = accounts[2];

    beforeEach(async () => {
        supplyChain = await SupplyChain.new({ from: owner });
    });

    describe("Product Management", () => {
        it("should add a new product", async () => {
            const tx = await supplyChain.addProduct(
                "PROD001",
                "Test Product",
                producer,
                100,
                50,
                { from: owner }
            );

            truffleAssert.eventEmitted(tx, 'ProductAdded', (ev) => {
                return ev.productId === "PROD001" && 
                       ev.name === "Test Product" && 
                       ev.producerId === producer;
            });
        });

        it("should update product status", async () => {
            await supplyChain.addProduct("PROD001", "Test Product", producer, 100, 50, { from: owner });
            
            const tx = await supplyChain.updateProductStatus(
                "PROD001",
                1, // IN_TRANSIT
                "Warehouse A",
                { from: producer }
            );

            truffleAssert.eventEmitted(tx, 'StatusUpdated');
        });
    });
}); 