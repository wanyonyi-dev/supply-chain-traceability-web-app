import React, { useEffect, useState } from 'react';
import { Network } from 'vis-network/standalone';
import { ethers } from 'ethers';
import SupplyChain from '../contracts/SupplyChain.json';

const SupplyChainVisualization = () => {
    const [productId, setProductId] = useState('');
    const [network, setNetwork] = useState(null);

    const visualizeProduct = async () => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const contract = new ethers.Contract(
                process.env.REACT_APP_CONTRACT_ADDRESS,
                SupplyChain.abi,
                provider
            );

            const history = await contract.getTrackingHistory(productId);

            // Create nodes and edges for visualization
            const nodes = [];
            const edges = [];

            history.forEach((update, index) => {
                nodes.push({
                    id: index,
                    label: `${update.status}\n${update.location}`,
                    title: new Date(update.timestamp * 1000).toLocaleString()
                });

                if (index > 0) {
                    edges.push({
                        from: index - 1,
                        to: index,
                        arrows: 'to'
                    });
                }
            });

            // Create network
            const container = document.getElementById('network-container');
            const data = { nodes, edges };
            const options = {
                nodes: {
                    shape: 'box',
                    margin: 10,
                    font: {
                        size: 14
                    }
                },
                edges: {
                    width: 2
                },
                layout: {
                    hierarchical: {
                        direction: 'LR',
                        sortMethod: 'directed'
                    }
                }
            };

            const network = new Network(container, data, options);
            setNetwork(network);
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to visualize supply chain');
        }
    };

    return (
        <div className="container">
            <h2>Supply Chain Visualization</h2>
            <div className="form-group">
                <input
                    type="number"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    placeholder="Enter Product ID"
                />
                <button onClick={visualizeProduct}>Visualize</button>
            </div>
            <div id="network-container" style={{ height: '500px', border: '1px solid #ddd' }}></div>
        </div>
    );
};

export default SupplyChainVisualization; 