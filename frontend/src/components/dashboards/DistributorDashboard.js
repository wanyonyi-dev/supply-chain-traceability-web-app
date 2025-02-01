import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, arrayUnion, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import './Dashboard.css';
import SupplyChainContract from '../../blockchain/SupplyChainContract';
import { monitorTransaction, getTransactionDetails } from '../../utils/transactionMonitor';
import { ethers } from 'ethers';
import TransactionService from '../../services/TransactionService';
import BlockchainMonitor from '../BlockchainMonitor';
import TransactionMonitor from '../TransactionMonitor';
import Papa from 'papaparse';
import { AnimatePresence, m as motion } from 'framer-motion';
import { FadeLoader } from 'react-spinners';
import { debounce } from 'lodash';
import TrackingHistory from '../TrackingHistory';
import ProductMap from '../ProductMap';

const DistributorDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [incomingProducts, setIncomingProducts] = useState([]);
    const [distributions, setDistributions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [distributionForm, setDistributionForm] = useState({
        destination: '',
        quantity: 1,
        transportMethod: '',
        estimatedDelivery: ''
    });
    const [notifications, setNotifications] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [currentTransaction, setCurrentTransaction] = useState(null);
    const [error, setError] = useState(null);
    const [shipments, setShipments] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [deliveryConfirmations, setDeliveryConfirmations] = useState([]);
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [shipmentStatus, setShipmentStatus] = useState({
        location: '',
        status: '',
        notes: ''
    });
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({
        start: '',
        end: ''
    });
    const [selectedDistribution, setSelectedDistribution] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [distributionStats, setDistributionStats] = useState({
        total: 0,
        pending: 0,
        inTransit: 0,
        delivered: 0,
        cancelled: 0
    });
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [filteredDistributions, setFilteredDistributions] = useState([]);
    const [analytics, setAnalytics] = useState({
        totalProducts: 0,
        totalValue: 0,
        statusBreakdown: {},
        monthlyDistribution: {},
        topDestinations: [],
        deliveryPerformance: {
            onTime: 0,
            delayed: 0,
            total: 0
        }
    });

    const navigate = useNavigate();

    useEffect(() => {
        console.log('Fetching orders...');
        fetchOrders();
        fetchInventory();
        fetchIncomingProducts();
        fetchDistributions();
        console.log('DistributorDashboard useEffect running');
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            console.log('Starting to fetch orders...');
            const ordersRef = collection(db, 'orders');
            const querySnapshot = await getDocs(ordersRef);
            console.log('Orders snapshot:', querySnapshot.docs.length, 'orders found');
            
            const ordersData = querySnapshot.docs.map(doc => {
                const order = { id: doc.id, ...doc.data() };
                console.log('Processing order:', order);
                
                return {
                    ...order,
                    status: order.status || 'PENDING',
                    customer: {
                        id: order.customerId,
                        name: order.customer?.name || 'Unknown Customer',
                        email: order.customer?.email || 'No email provided'
                    },
                    product: {
                        ...order.product,
                        name: order.product?.name || 'Unknown Product',
                        price: order.product?.price || 0,
                        quantity: order.quantity || 0
                    }
                };
            });
            
            console.log('Processed orders data:', ordersData);
            setOrders(ordersData);
            
        } catch (error) {
            console.error('Error fetching orders:', error);
            setError('Failed to load orders: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchInventory = async () => {
        setLoading(true);
        try {
            // Fetch distributor's inventory from Firebase
            const inventoryRef = collection(db, 'products');
            const q = query(
                inventoryRef,
                where('distributorId', '==', auth.currentUser.uid),
                where('status', 'in', ['RECEIVED', 'IN_TRANSIT'])
            );
            const querySnapshot = await getDocs(q);
            
            // Get blockchain data for inventory
            const inventoryData = await Promise.all(
                querySnapshot.docs.map(async (doc) => {
                    const product = { id: doc.id, ...doc.data() };
                    
                    try {
                        const blockchainData = await SupplyChainContract.contract.methods
                            .products(product.productId)
                            .call();
                        
                        return {
                            ...product,
                            blockchainStatus: blockchainData.status,
                            blockchainQuantity: blockchainData.quantity
                        };
                    } catch (error) {
                        console.error(`Error fetching blockchain data for product ${product.productId}:`, error);
                        return product;
                    }
                })
            );
            
            console.log('Fetched inventory:', inventoryData);
            setInventory(inventoryData);
            
        } catch (error) {
            console.error('Error fetching inventory:', error);
            setError('Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    const fetchIncomingProducts = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'products'),
                where('status', '==', 'IN_TRANSIT')
            );
            const querySnapshot = await getDocs(q);
            const productsData = querySnapshot.docs.map(doc => ({
                _id: doc.id,
                ...doc.data()
            }));
            setIncomingProducts(productsData);
        } catch (error) {
            console.error('Error fetching incoming products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDistributions = async () => {
        setLoading(true);
        try {
            console.log('Fetching distributions...');
            const distributionsRef = collection(db, 'distributions');
            const q = query(
                distributionsRef,
                where('distributorId', '==', auth.currentUser.uid)
            );
            
            const querySnapshot = await getDocs(q);
            const distributionsData = querySnapshot.docs.map(doc => ({
                _id: doc.id,
                ...doc.data()
            }));
            
            console.log('Fetched distributions:', distributionsData);
            setDistributions(distributionsData);
            calculateDistributionStats(distributionsData);
            calculateAnalytics();
        } catch (error) {
            console.error('Error fetching distributions:', error);
            setError('Failed to load distributions');
        } finally {
            setLoading(false);
        }
    };

    const calculateDistributionStats = (distributions) => {
        const stats = distributions.reduce((acc, dist) => ({
            total: acc.total + 1,
            pending: acc.pending + (dist.status === 'PENDING' ? 1 : 0),
            inTransit: acc.inTransit + (dist.status === 'IN_TRANSIT' ? 1 : 0),
            delivered: acc.delivered + (dist.status === 'DELIVERED' ? 1 : 0),
            cancelled: acc.cancelled + (dist.status === 'CANCELLED' ? 1 : 0)
        }), {
            total: 0,
            pending: 0,
            inTransit: 0,
            delivered: 0,
            cancelled: 0
        });
        setDistributionStats(stats);
    };

    const calculateAnalytics = () => {
        const statusCount = {};
        const monthlyCount = {};
        const destinationCount = {};
        let totalValue = 0;
        let onTimeDeliveries = 0;
        let delayedDeliveries = 0;

        distributions.forEach(dist => {
            if (!dist) return;

            // Status breakdown
            statusCount[dist.status] = (statusCount[dist.status] || 0) + 1;

            // Monthly distribution
            const month = new Date(dist.createdAt).toLocaleString('default', { month: 'long' });
            monthlyCount[month] = (monthlyCount[month] || 0) + 1;

            // Destination analysis
            if (dist.destination) {
                destinationCount[dist.destination] = (destinationCount[dist.destination] || 0) + 1;
            }

            // Calculate total value
            totalValue += (dist.quantity || 0) * (dist.product?.price || 0);

            // Delivery performance
            if (dist.status === 'DELIVERED') {
                const deliveryDate = new Date(dist.deliveredAt);
                const estimatedDate = new Date(dist.estimatedDelivery);
                if (deliveryDate <= estimatedDate) {
                    onTimeDeliveries++;
                } else {
                    delayedDeliveries++;
                }
            }
        });

        // Sort top destinations
        const topDestinations = Object.entries(destinationCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        setAnalytics({
            totalProducts: distributions.length,
            totalValue,
            statusBreakdown: statusCount,
            monthlyDistribution: monthlyCount,
            topDestinations,
            deliveryPerformance: {
                onTime: onTimeDeliveries,
                delayed: delayedDeliveries,
                total: onTimeDeliveries + delayedDeliveries
            }
        });
    };

    const addNotification = (message) => {
        setNotifications(prev => [...prev, {
            message,
            time: new Date().toISOString()
        }]);
    };

    const handleAcceptOrder = async (orderId) => {
        setLoading(true);
        setError(null);
        try {
            const orderRef = doc(db, 'orders', orderId);
            const orderDoc = await getDoc(orderRef);
            const orderData = orderDoc.data();

            // Update order status in Firebase
            await updateDoc(orderRef, {
                status: 'CONFIRMED',
                acceptedAt: new Date().toISOString(),
                distributorId: auth.currentUser.uid
            });

            // Create a new distribution record
            const distributionData = {
                orderId: orderId,
                productId: orderData.productId,
                distributorId: auth.currentUser.uid,
                quantity: orderData.quantity,
                status: 'PENDING_DISTRIBUTION',
                createdAt: new Date().toISOString(),
                customerDetails: orderData.deliveryDetails,
                product: orderData.product,
                destination: orderData.deliveryDetails.address,
                distributedAt: new Date().toISOString()
            };

            // Add to distributions collection
            await addDoc(collection(db, 'distributions'), distributionData);

            addNotification(`Order ${orderId} accepted and added to distribution`);
            fetchOrders();
            fetchDistributions();
        } catch (error) {
            console.error('Error accepting order:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDistribute = async (e) => {
        e.preventDefault();
        if (!selectedProduct) return;

        setLoading(true);
        setError(null);
        try {
            const { destination, quantity, transportMethod, estimatedDelivery } = distributionForm;

            // Create distribution record
            const distributionData = {
                productId: selectedProduct.id,
                distributorId: auth.currentUser.uid,
                destination,
                quantity: parseInt(quantity),
                transportMethod,
                estimatedDelivery,
                status: 'IN_TRANSIT',
                createdAt: new Date().toISOString(),
                trackingUpdates: [{
                    status: 'DISPATCHED',
                    location: selectedProduct.location || destination,
                    timestamp: new Date().toISOString(),
                    updatedBy: auth.currentUser.uid
                }]
            };

            // Add to Firebase
            const distributionRef = await addDoc(collection(db, 'distributions'), distributionData);

            // Update product status
            const productRef = doc(db, 'products', selectedProduct.id);
            await updateDoc(productRef, {
                status: 'IN_TRANSIT',
                quantity: increment(-quantity),
                currentLocation: destination
            });

            addNotification('Distribution created successfully');
            setSelectedProduct(null);
            setDistributionForm({
                destination: '',
                quantity: 1,
                transportMethod: '',
                estimatedDelivery: ''
            });
            
            fetchInventory();
            fetchDistributions();
        } catch (error) {
            console.error('Error distributing product:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBlockchainEvent = (event) => {
        switch (event.type) {
            case 'ProductReceived':
                if (event.receiver === auth.currentUser.uid) {
                    fetchInventory();
                    addNotification(`Product ${event.productId} received`);
                }
                break;
            case 'ProductDistributed':
                if (event.distributor === auth.currentUser.uid) {
                    fetchDistributions();
                    addNotification(`Product ${event.productId} distributed`);
                }
                break;
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('userRole');
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleTransactionComplete = (result) => {
        const { status, receipt, details } = result;
        if (status === 'success') {
            addNotification('Transaction completed successfully!');
            // Refresh data after successful transaction
            fetchInventory();
            fetchDistributions();
        } else {
            setError('Transaction failed. Please try again.');
        }
    };

    const updateShipmentStatus = async (shipmentId, newStatus) => {
        setLoading(true);
        try {
            const shipmentRef = doc(db, 'distributions', shipmentId);
            const timestamp = new Date().toISOString();
            
            await updateDoc(shipmentRef, {
                status: newStatus,
                lastUpdated: timestamp,
                trackingUpdates: arrayUnion({
                    status: newStatus,
                    location: shipmentStatus.location,
                    notes: shipmentStatus.notes,
                    timestamp: timestamp,
                    updatedBy: auth.currentUser.uid
                })
            });

            // Update blockchain status
            await SupplyChainContract.updateShipmentStatus(
                shipmentId,
                newStatus,
                shipmentStatus.location
            );

            addNotification(`Shipment ${shipmentId} status updated to ${newStatus}`);
            fetchDistributions();
        } catch (error) {
            console.error('Error updating shipment status:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelivery = async (shipmentId) => {
        setLoading(true);
        try {
            const shipmentRef = doc(db, 'distributions', shipmentId);
            const shipmentDoc = await getDoc(shipmentRef);
            const shipmentData = shipmentDoc.data();
            const timestamp = new Date().toISOString();

            if (!shipmentData) {
                throw new Error('Shipment not found');
            }

            // Update order status if this is linked to an order
            if (shipmentData.orderId) {
                const orderRef = doc(db, 'orders', shipmentData.orderId);
                await updateDoc(orderRef, {
                    status: 'DELIVERED',
                    deliveredAt: timestamp,
                    deliveryConfirmation: {
                        confirmedBy: auth.currentUser.uid,
                        timestamp: timestamp,
                        location: shipmentStatus.location || shipmentData.destination
                    }
                });
            }

            // Update product status
            const productRef = doc(db, 'products', shipmentData.productId);
            await updateDoc(productRef, {
                status: 'DELIVERED',
                currentLocation: shipmentStatus.location || shipmentData.destination,
                lastUpdated: timestamp
            });

            // Update distribution/shipment status
            await updateDoc(shipmentRef, {
                status: 'DELIVERED',
                deliveredAt: timestamp,
                deliveryConfirmation: {
                    confirmedBy: auth.currentUser.uid,
                    timestamp: timestamp,
                    location: shipmentStatus.location || shipmentData.destination,
                    notes: shipmentStatus.notes || 'Delivery confirmed'
                },
                trackingUpdates: arrayUnion({
                    status: 'DELIVERED',
                    location: shipmentStatus.location || shipmentData.destination,
                    timestamp: timestamp,
                    updatedBy: auth.currentUser.uid,
                    notes: shipmentStatus.notes || 'Delivery confirmed'
                })
            });

            // Update blockchain status
            try {
                const tx = await SupplyChainContract.confirmDelivery(
                    shipmentId,
                    timestamp,
                    shipmentStatus.location || shipmentData.destination
                );
                setCurrentTransaction(tx);
            } catch (blockchainError) {
                console.error('Blockchain update failed:', blockchainError);
                // Continue with the function as the database updates were successful
            }

            addNotification(`Delivery confirmed for shipment ${shipmentId}`);
            fetchDistributions();
            
            // Reset shipment status form
            setShipmentStatus({
                status: '',
                location: '',
                notes: ''
            });

        } catch (error) {
            console.error('Error confirming delivery:', error);
            setError(`Failed to confirm delivery: ${error.message}`);
            addNotification(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const updateDistributionStatus = async (distributionId, newStatus) => {
        setLoading(true);
        try {
            const distributionRef = doc(db, 'distributions', distributionId);
            await updateDoc(distributionRef, {
                status: newStatus,
                distributedAt: newStatus === 'IN_TRANSIT' ? new Date().toISOString() : null
            });
            
            addNotification(`Distribution status updated to ${newStatus}`);
            fetchDistributions();
        } catch (error) {
            console.error('Error updating distribution status:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkStatusUpdate = async (selectedIds, newStatus) => {
        setLoading(true);
        try {
            const timestamp = new Date().toISOString();
            const updatePromises = selectedIds.map(async (id) => {
                const distributionRef = doc(db, 'distributions', id);
                await updateDoc(distributionRef, {
                    status: newStatus,
                    lastUpdated: timestamp,
                    trackingUpdates: arrayUnion({
                        status: newStatus,
                        timestamp: timestamp,
                        updatedBy: auth.currentUser.uid
                    })
                });
            });
            await Promise.all(updatePromises);
            addNotification(`Updated status for ${selectedIds.length} distributions`);
            fetchDistributions();
        } catch (error) {
            setError(`Failed to update distributions: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const exportDistributionData = () => {
        const data = distributions.map(dist => ({
            ID: dist._id,
            Product: dist.product?.name || 'N/A',
            Status: dist.status,
            Destination: dist.destination,
            'Created At': new Date(dist.createdAt).toLocaleString(),
            'Last Updated': new Date(dist.lastUpdated).toLocaleString(),
            Quantity: dist.quantity
        }));

        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `distributions_${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handlePrintLabel = (distribution) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Shipping Label</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .label { border: 1px solid #000; padding: 15px; max-width: 400px; }
                        .qr-code { text-align: center; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="label">
                        <h2>Shipping Label</h2>
                        <p><strong>ID:</strong> ${distribution._id}</p>
                        <p><strong>Product:</strong> ${distribution.product?.name}</p>
                        <p><strong>Quantity:</strong> ${distribution.quantity}</p>
                        <p><strong>Destination:</strong> ${distribution.destination}</p>
                        <div class="qr-code">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${distribution._id}" />
                        </div>
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `);
    };

    const handleSearch = debounce((query) => {
        setSearchQuery(query);
        
        // Filter orders with null checks
        const matchedOrders = orders.filter(order => {
            if (!order) return false;
            
            return (
                (order.id && order.id.toLowerCase().includes(query.toLowerCase())) ||
                (order.product?.name && order.product.name.toLowerCase().includes(query.toLowerCase())) ||
                (order.customer?.name && order.customer.name.toLowerCase().includes(query.toLowerCase())) ||
                (order.status && order.status.toLowerCase().includes(query.toLowerCase()))
            );
        });
        setFilteredOrders(matchedOrders);

        // Filter distributions with null checks
        const matchedDistributions = distributions.filter(dist => {
            if (!dist) return false;
            
            return (
                (dist.product?.name && dist.product.name.toLowerCase().includes(query.toLowerCase())) ||
                (dist.status && dist.status.toLowerCase().includes(query.toLowerCase())) ||
                (dist.destination && dist.destination.toLowerCase().includes(query.toLowerCase()))
            );
        });
        setFilteredDistributions(matchedDistributions);
    }, 300);

    const filterByDateRange = (items) => {
        if (!items || !Array.isArray(items)) return [];
        if (!dateRange.start && !dateRange.end) return items;
        
        return items.filter(item => {
            if (!item || !item.createdAt) return false;
            
            const itemDate = new Date(item.createdAt);
            const startDate = dateRange.start ? new Date(dateRange.start) : null;
            const endDate = dateRange.end ? new Date(dateRange.end) : null;
            
            if (startDate && endDate) {
                return itemDate >= startDate && itemDate <= endDate;
            } else if (startDate) {
                return itemDate >= startDate;
            } else if (endDate) {
                return itemDate <= endDate;
            }
            return true;
        });
    };

    const trackProductLocation = async (productId) => {
        try {
            const productRef = doc(db, 'products', productId);
            const productDoc = await getDoc(productRef);
            
            if (productDoc.exists()) {
                const productData = productDoc.data();
                const location = await getCurrentLocation();
                
                await updateDoc(productRef, {
                    location: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        timestamp: new Date().toISOString()
                    },
                    status: 'IN_TRANSIT'
                });
                
                await addDoc(collection(db, 'trackingHistory'), {
                    productId,
                    location,
                    timestamp: new Date().toISOString(),
                    distributorId: auth.currentUser.uid
                });
            }
        } catch (error) {
            console.error('Error tracking product:', error);
        }
    };

    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        });
                    },
                    (error) => reject(error)
                );
            } else {
                reject(new Error('Geolocation is not supported by this browser.'));
            }
        });
    };

    const updateProductStatus = async (productId, status) => {
        try {
            const productRef = doc(db, 'products', productId);
            await updateDoc(productRef, {
                status,
                lastUpdated: new Date().toISOString()
            });

            await addDoc(collection(db, 'statusHistory'), {
                productId,
                status,
                timestamp: new Date().toISOString(),
                distributorId: auth.currentUser.uid
            });

            await sendNotification(productId, `Status updated to: ${status}`);
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const sendNotification = async (productId, message) => {
        try {
            const productRef = doc(db, 'products', productId);
            const productDoc = await getDoc(productRef);
            
            if (productDoc.exists()) {
                const productData = productDoc.data();
                await addDoc(collection(db, 'notifications'), {
                    userId: productData.producerId,
                    message,
                    timestamp: new Date().toISOString(),
                    read: false
                });
            }
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    };

    return (
        <div className="distributor-dashboard">
            <header className="dashboard-header">
                <h2>Distributor Dashboard</h2>
                <div className="header-actions">
                    <div className="notifications-dropdown">
                        <button className="notifications-btn">
                            <i className="fas fa-bell"></i>
                            {notifications.length > 0 && (
                                <span className="notification-badge">{notifications.length}</span>
                            )}
                        </button>
                        {notifications.length > 0 && (
                            <div className="notifications-list">
                                {notifications.map((notification, index) => (
                                    <div key={index} className="notification-item">
                                        <p>{notification.message}</p>
                                        <span className="notification-time">
                                            {new Date(notification.time).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={handleSignOut} className="sign-out-btn">
                        Sign Out
                    </button>
                </div>
            </header>
            
            <div className="dashboard-content animate-slide-in">
                <div className="dashboard-controls">
                    <div className="search-filters hover-scale">
                        <input
                            type="text"
                            placeholder="Search orders, products, or distributions..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="search-input"
                        />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="filter-select"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="PENDING">Pending</option>
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="DELIVERED">Delivered</option>
                        </select>
                        <div className="date-range">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                            />
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button onClick={exportDistributionData} className="export-btn">
                            Export Data
                        </button>
                    </div>
                </div>

                <div className="dashboard-stats animate-scale-in">
                    <div className="stat-card">
                        <h3>Total Distributions</h3>
                        <p>{distributionStats.total}</p>
                    </div>
                    <div className="stat-card">
                        <h3>In Transit</h3>
                        <p>{distributionStats.inTransit}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Delivered</h3>
                        <p>{distributionStats.delivered}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Pending</h3>
                        <p>{distributionStats.pending}</p>
                    </div>
                </div>

                <div className="analytics-section animate-slide-in">
                    <h3>Distribution Analytics</h3>
                    
                    <div className="analytics-grid">
                        <div className="analytics-card">
                            <h4>Status Breakdown</h4>
                            <div className="status-chart">
                                {Object.entries(analytics.statusBreakdown).map(([status, count]) => (
                                    <div key={status} className="status-bar">
                                        <div className="status-label">{status}</div>
                                        <div 
                                            className="status-value"
                                            style={{ 
                                                width: `${(count / analytics.totalProducts) * 100}%`,
                                                backgroundColor: `var(--${status.toLowerCase()}-color)`
                                            }}
                                        >
                                            {count}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="analytics-card">
                            <h4>Monthly Distribution</h4>
                            <div className="monthly-chart">
                                {Object.entries(analytics.monthlyDistribution).map(([month, count]) => (
                                    <div key={month} className="month-bar">
                                        <div className="month-label">{month}</div>
                                        <div 
                                            className="month-value"
                                            style={{ 
                                                height: `${(count / Math.max(...Object.values(analytics.monthlyDistribution))) * 100}%`
                                            }}
                                        >
                                            {count}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="analytics-card">
                            <h4>Top Destinations</h4>
                            <div className="destinations-list">
                                {analytics.topDestinations.map((dest, index) => (
                                    <div key={dest.name} className="destination-item">
                                        <span className="destination-rank">{index + 1}</span>
                                        <span className="destination-name">{dest.name}</span>
                                        <span className="destination-count">{dest.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="analytics-card">
                            <h4>Delivery Performance</h4>
                            <div className="performance-stats">
                                <div className="performance-item">
                                    <span>On-Time Deliveries</span>
                                    <span className="performance-value success">
                                        {((analytics.deliveryPerformance.onTime / analytics.deliveryPerformance.total) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="performance-item">
                                    <span>Delayed Deliveries</span>
                                    <span className="performance-value warning">
                                        {((analytics.deliveryPerformance.delayed / analytics.deliveryPerformance.total) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-section animate-slide-in">
                    <h3>Customer Orders</h3>
                    {loading ? (
                        <div className="loading-spinner"></div>
                    ) : (
                        <div className="orders-grid">
                            {filterByDateRange(filteredOrders.length > 0 ? filteredOrders : orders)
                                .filter(order => order !== null && order !== undefined)
                                .map(order => (
                                    <div
                                        key={order?.id || Math.random()}
                                        className="order-card hover-scale animate-fade-in"
                                    >
                                        <div className="order-header">
                                            <h4>{order?.product?.name || 'Unnamed Product'}</h4>
                                            <span className={`status-badge ${(order?.status || 'pending').toLowerCase()}`}>
                                                {order?.status || 'PENDING'}
                                            </span>
                                        </div>
                                        
                                        <div className="customer-info">
                                            <h5>Customer Details</h5>
                                            <p>Name: {order?.customer?.name || 'Unknown Customer'}</p>
                                            <p>Email: {order?.customer?.email || 'No email provided'}</p>
                                        </div>

                                        <div className="product-info">
                                            <h5>Product Details</h5>
                                            <p>Name: {order?.product?.name || 'Unknown Product'}</p>
                                            <p>Quantity: {order?.quantity || 0}</p>
                                            <p>Total Price: ${order?.totalPrice || 0}</p>
                                        </div>

                                        <div className="delivery-info">
                                            <h5>Delivery Details</h5>
                                            <p>Address: {order?.deliveryDetails?.address || 'No address provided'}</p>
                                            <p>City: {order?.deliveryDetails?.city || 'No city provided'}</p>
                                            <p>Phone: {order?.deliveryDetails?.phone || 'No phone provided'}</p>
                                        </div>

                                        <div className="action-buttons">
                                            {(!order?.distributorId || order?.status === 'PENDING') && (
                                                <button
                                                    onClick={() => handleAcceptOrder(order?.id)}
                                                    className="accept-btn"
                                                    disabled={loading}
                                                >
                                                    Accept Order
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                {selectedProduct && (
                    <div className="distribution-form-container">
                        <h3>Distribute Product: {selectedProduct.product.name}</h3>
                        <form onSubmit={handleDistribute} className="distribution-form">
                            <div className="form-group">
                                <label>Destination</label>
                                <input
                                    type="text"
                                    value={distributionForm.destination}
                                    onChange={(e) => setDistributionForm({
                                        ...distributionForm,
                                        destination: e.target.value
                                    })}
                                    required
                                    placeholder="Enter destination"
                                />
                            </div>
                            <div className="form-group">
                                <label>Quantity</label>
                                <input
                                    type="number"
                                    value={distributionForm.quantity}
                                    onChange={(e) => setDistributionForm({
                                        ...distributionForm,
                                        quantity: parseInt(e.target.value)
                                    })}
                                    required
                                    min="1"
                                    max={selectedProduct.quantity}
                                />
                            </div>
                            <div className="form-group">
                                <label>Transport Method</label>
                                <select
                                    value={distributionForm.transportMethod}
                                    onChange={(e) => setDistributionForm({
                                        ...distributionForm,
                                        transportMethod: e.target.value
                                    })}
                                    required
                                >
                                    <option value="">Select transport method</option>
                                    <option value="ROAD">Road</option>
                                    <option value="AIR">Air</option>
                                    <option value="SEA">Sea</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Estimated Delivery Date</label>
                                <input
                                    type="date"
                                    value={distributionForm.estimatedDelivery}
                                    onChange={(e) => setDistributionForm({
                                        ...distributionForm,
                                        estimatedDelivery: e.target.value
                                    })}
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" disabled={loading}>
                                    {loading ? 'Processing...' : 'Confirm Distribution'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedProduct(null)}
                                    className="cancel-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="dashboard-section">
                    <h3>Distribution History</h3>
                    {loading ? (
                        <div className="loading">Loading distributions...</div>
                    ) : (
                        <div className="distributions-list">
                            {distributions.length === 0 ? (
                                <div className="no-distributions">No distributions available</div>
                            ) : (
                                distributions.map(dist => (
                                    <div key={dist._id} className="distribution-card">
                                        <div className="distribution-header">
                                            <h4>{dist.product?.name || 'Unknown Product'}</h4>
                                            <span className={`status-badge ${dist.status?.toLowerCase()}`}>
                                                {dist.status}
                                            </span>
                                        </div>
                                        <div className="distribution-details">
                                            <div className="customer-info">
                                                <h5>Customer Details</h5>
                                                <p>Address: {dist.customerDetails?.address || 'N/A'}</p>
                                                <p>City: {dist.customerDetails?.city || 'N/A'}</p>
                                                <p>Phone: {dist.customerDetails?.phone || 'N/A'}</p>
                                            </div>
                                            <div className="order-info">
                                                <h5>Order Details</h5>
                                                <p>Order ID: {dist.orderId}</p>
                                                <p>Quantity: {dist.quantity}</p>
                                                <p>Status: {dist.status}</p>
                                                <p>Accepted Date: {new Date(dist.createdAt).toLocaleDateString()}</p>
                                                <p>Distribution Date: {dist.distributedAt ? 
                                                    new Date(dist.distributedAt).toLocaleDateString() : 'Pending'}</p>
                                            </div>
                                            {dist.status === 'PENDING_DISTRIBUTION' && (
                                                <div className="distribution-actions">
                                                    <button 
                                                        onClick={() => updateDistributionStatus(dist._id, 'IN_TRANSIT')}
                                                        className="action-btn"
                                                        disabled={loading}
                                                    >
                                                        Start Distribution
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="dashboard-section">
                    <h3>Shipment Tracking</h3>
                    <div className="shipments-grid">
                        {distributions
                            .filter(dist => ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(dist.status))
                            .map(shipment => (
                                <div key={shipment._id} className="shipment-card">
                                    <div className="shipment-header">
                                        <h4>{shipment.product?.name || 'Unnamed Product'}</h4>
                                        <span className={`status-badge ${shipment.status.toLowerCase()}`}>
                                            {shipment.status}
                                        </span>
                                    </div>
                                    <div className="shipment-details">
                                        <p>Destination: {shipment.destination}</p>
                                        <p>Current Location: {shipment.location || 'Not updated'}</p>
                                        <div className="status-update-form">
                                            <select
                                                value={shipmentStatus.status}
                                                onChange={(e) => setShipmentStatus({
                                                    ...shipmentStatus,
                                                    status: e.target.value
                                                })}
                                                className="status-select"
                                            >
                                                <option value="">Select Status</option>
                                                <option value="IN_TRANSIT">In Transit</option>
                                                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                                                <option value="ARRIVED_AT_DESTINATION">Arrived at Destination</option>
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Current Location"
                                                value={shipmentStatus.location}
                                                onChange={(e) => setShipmentStatus({
                                                    ...shipmentStatus,
                                                    location: e.target.value
                                                })}
                                                className="location-input"
                                            />
                                            <textarea
                                                placeholder="Add notes (optional)"
                                                value={shipmentStatus.notes}
                                                onChange={(e) => setShipmentStatus({
                                                    ...shipmentStatus,
                                                    notes: e.target.value
                                                })}
                                                className="notes-input"
                                            />
                                            <div className="button-group">
                                                <button
                                                    onClick={() => updateShipmentStatus(shipment._id, shipmentStatus.status)}
                                                    disabled={loading || !shipmentStatus.status || !shipmentStatus.location}
                                                    className="update-status-btn"
                                                >
                                                    Update Status
                                                </button>
                                                {(shipment.status === 'OUT_FOR_DELIVERY' || 
                                                  shipment.status === 'ARRIVED_AT_DESTINATION') && (
                                                    <button
                                                        onClick={() => confirmDelivery(shipment._id)}
                                                        disabled={loading || !shipmentStatus.location}
                                                        className="confirm-delivery-btn"
                                                        style={{ 
                                                            backgroundColor: 'var(--success-color)',
                                                            color: 'var(--text-light)'
                                                        }}
                                                    >
                                                        Confirm Delivery
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Add blockchain monitoring */}
                <div className="blockchain-section">
                    <BlockchainMonitor onEvent={handleBlockchainEvent} />
                    {currentTransaction && (
                        <TransactionMonitor 
                            transaction={currentTransaction}
                            onComplete={handleTransactionComplete}
                        />
                    )}
                </div>

                {/* Distribution Details Modal */}
                {showDetailsModal && selectedDistribution && (
                    <div className="modal">
                        <div className="modal-content">
                            <h3>Distribution Details</h3>
                            <div className="distribution-details">
                                <p><strong>ID:</strong> {selectedDistribution._id}</p>
                                <p><strong>Product:</strong> {selectedDistribution.product?.name}</p>
                                <p><strong>Status:</strong> {selectedDistribution.status}</p>
                                <p><strong>Destination:</strong> {selectedDistribution.destination}</p>
                                <p><strong>Quantity:</strong> {selectedDistribution.quantity}</p>
                                
                                <h4>Tracking History</h4>
                                <div className="tracking-timeline">
                                    {selectedDistribution.trackingUpdates?.map((update, index) => (
                                        <div key={index} className="timeline-item">
                                            <div className="timeline-date">
                                                {new Date(update.timestamp).toLocaleString()}
                                            </div>
                                            <div className="timeline-status">
                                                {update.status}
                                            </div>
                                            <div className="timeline-location">
                                                {update.location}
                                            </div>
                                            {update.notes && (
                                                <div className="timeline-notes">
                                                    {update.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="modal-actions">
                                    <button onClick={() => handlePrintLabel(selectedDistribution)}>
                                        Print Label
                                    </button>
                                    <button onClick={() => setShowDetailsModal(false)}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add the ProductMap component */}
                <div className="map-section">
                    <h3>Product Location</h3>
                    {selectedProduct && (
                        <ProductMap productId={selectedProduct.id} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DistributorDashboard; 