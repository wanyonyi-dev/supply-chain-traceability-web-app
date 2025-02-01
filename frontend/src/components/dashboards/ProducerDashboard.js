import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import './Dashboard.css';
import TrackingService from '../../services/TrackingService';
import DashboardTracker from '../DashboardTracker';
import { ethers } from 'ethers';
import SupplyChainContract from '../../contracts/SupplyChainContract';
import TransactionService from '../../services/TransactionService';
import BlockchainMonitor from '../BlockchainMonitor';
import TransactionMonitor from '../TransactionMonitor';

const ProducerDashboard = () => {
    const [products, setProducts] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState('KSH');
    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        location: '',
        price: '',
        quantity: '',
        image: '',
        currency: 'KSH'
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [analytics, setAnalytics] = useState({
        totalProducts: 0,
        availableProducts: 0,
        inTransit: 0,
        delivered: 0,
        totalValue: 0
    });
    const [currentTransaction, setCurrentTransaction] = useState(null);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const modalRef = useRef(null);

    const currencies = [
        { code: 'KSH', symbol: 'KSh' },
        { code: 'USD', symbol: '$' },
        { code: 'EUR', symbol: '€' },
        { code: 'GBP', symbol: '£' }
    ];

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        const calculateAnalytics = () => {
            const stats = products.reduce((acc, product) => ({
                totalProducts: acc.totalProducts + 1,
                availableProducts: acc.availableProducts + (product.status === 'AVAILABLE' ? 1 : 0),
                inTransit: acc.inTransit + (product.status === 'IN_TRANSIT' ? 1 : 0),
                delivered: acc.delivered + (product.status === 'DELIVERED' ? 1 : 0),
                totalValue: acc.totalValue + (product.price * product.quantity)
            }), {
                totalProducts: 0,
                availableProducts: 0,
                inTransit: 0,
                delivered: 0,
                totalValue: 0
            });
            setAnalytics(stats);
        };

        calculateAnalytics();
    }, [products]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'products'),
                where('producerId', '==', auth.currentUser.uid)
            );
            const querySnapshot = await getDocs(q);
            const productsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                _id: doc.id,
                productId: doc.id,
                ...doc.data()
            }));
            setProducts(productsData);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const productId = `PROD-${Date.now()}`;
            
            const productData = {
                id: productId,
                productId: productId,
                name: newProduct.name,
                description: newProduct.description,
                producerId: auth.currentUser.uid,
                price: parseFloat(newProduct.price),
                quantity: parseInt(newProduct.quantity),
                location: newProduct.location,
                status: 'AVAILABLE',
                currency: selectedCurrency
            };

            console.log('Adding product:', productData);

            const tx = await SupplyChainContract.addProduct(productData);
            setCurrentTransaction({
                hash: tx.transactionHash,
                wait: async () => tx
            });

            if (tx.status) {
                await addDoc(collection(db, 'products'), {
                    ...productData,
                    createdAt: new Date().toISOString(),
                    blockchainTxHash: tx.transactionHash,
                    trackingHistory: [{
                        status: 'AVAILABLE',
                        timestamp: new Date().toISOString(),
                        location: productData.location,
                        updatedBy: auth.currentUser.uid,
                        txHash: tx.transactionHash
                    }]
                });

                setNewProduct({ 
                    name: '', 
                    description: '', 
                    location: '', 
                    price: '', 
                    quantity: '' 
                });
                
                addNotification('Product added successfully!');
                fetchProducts();
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error) {
            console.error('Error adding product:', error);
            setError(error.message);
            addNotification('Failed to add product: ' + error.message);
        } finally {
            setLoading(false);
            setCurrentTransaction(null);
        }
    };

    const updateProductStatus = async (productId, newStatus) => {
        setLoading(true);
        try {
            const productRef = doc(db, 'products', productId);
            const product = products.find(p => p._id === productId);
            
            const updatedHistory = [...product.trackingHistory, {
                status: newStatus,
                timestamp: new Date().toISOString(),
                location: product.location,
                updatedBy: auth.currentUser.uid
            }];

            await updateDoc(productRef, {
                status: newStatus,
                trackingHistory: updatedHistory,
                updatedAt: new Date().toISOString()
            });

            fetchProducts();
            addNotification(`Product status updated to ${newStatus}`);
        } catch (error) {
            console.error('Error updating product status:', error);
            addNotification('Failed to update product status');
        } finally {
            setLoading(false);
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

    // Format price with currency symbol
    const formatPrice = (price, currency) => {
        const currencyObj = currencies.find(c => c.code === currency);
        return `${currencyObj?.symbol || ''}${price}`;
    };

    // Add notification system
    const addNotification = (message) => {
        setNotifications(prev => [...prev, {
            message,
            time: new Date().toISOString()
        }]);
    };

    // Add filtered products
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || product.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleEditProduct = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const productRef = doc(db, 'products', editingProduct._id);
            await updateDoc(productRef, {
                ...editingProduct,
                updatedAt: new Date().toISOString()
            });
            
            fetchProducts();
            addNotification('Product updated successfully!');
            setEditingProduct(null);
        } catch (error) {
            console.error('Error updating product:', error);
            addNotification('Failed to update product');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            setLoading(true);
            try {
                await deleteDoc(doc(db, 'products', productId));
                fetchProducts();
                addNotification('Product deleted successfully!');
            } catch (error) {
                console.error('Error deleting product:', error);
                addNotification('Failed to delete product');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBlockchainEvent = (event) => {
        if (event.type === 'ProductAdded' && event.producer === auth.currentUser.uid) {
            fetchProducts(); // Refresh products list
            addNotification(`Product ${event.productId} added to blockchain`);
        }
    };

    const handleTransactionComplete = (result) => {
        const { status, receipt, details } = result;
        if (status === 'success') {
            addNotification('Transaction completed successfully!');
        } else {
            setError('Transaction failed. Please try again.');
        }
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        const rect = modalRef.current.getBoundingClientRect();
        setPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleMouseMove = (e) => {
        if (isDragging && modalRef.current) {
            modalRef.current.style.left = `${e.clientX - position.x}px`;
            modalRef.current.style.top = `${e.clientY - position.y}px`;
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div className="producer-dashboard">
            <header className="dashboard-header">
                <h2>Producer Dashboard</h2>
                <div className="header-actions">
                    <div className="currency-selector">
                        <select
                            value={selectedCurrency}
                            onChange={(e) => setSelectedCurrency(e.target.value)}
                            className="currency-select"
                        >
                            {currencies.map(currency => (
                                <option key={currency.code} value={currency.code}>
                                    {currency.code} ({currency.symbol})
                                </option>
                            ))}
                        </select>
                    </div>
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
            
            <div className="dashboard-content">
                <div className="dashboard-section">
                    <div className="section-header">
                        <h3>My Products</h3>
                        <button 
                            onClick={() => setShowProductForm(true)} 
                            className="add-product-btn"
                        >
                            Add New Product
                        </button>
                    </div>

                    <div className="filters-section">
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="status-filter"
                        >
                            <option value="ALL">All Products</option>
                            <option value="CREATED">Created</option>
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="AVAILABLE">Available</option>
                        </select>
                    </div>

                    {/* Add Product Form Modal */}
                    {showProductForm && (
                        <div className="modal-overlay" onClick={() => setShowProductForm(false)}>
                            <div 
                                className="draggable-modal"
                                ref={modalRef}
                                onMouseDown={handleMouseDown}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="modal-header">
                                    <h3>Add New Product</h3>
                                    <button 
                                        className="close-btn"
                                        onClick={() => setShowProductForm(false)}
                                    >
                                        &times;
                                    </button>
                                </div>
                                <form onSubmit={handleProductSubmit} className="product-form">
                                    <div className="form-group">
                                        <label>Product Name</label>
                                        <input
                                            type="text"
                                            value={newProduct.name}
                                            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                                            required
                                            placeholder="Enter product name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea
                                            value={newProduct.description}
                                            onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                                            required
                                            placeholder="Enter product description"
                                            rows="3"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Location</label>
                                        <input
                                            type="text"
                                            value={newProduct.location}
                                            onChange={(e) => setNewProduct({...newProduct, location: e.target.value})}
                                            required
                                            placeholder="Enter product location"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Price ({selectedCurrency})</label>
                                            <input
                                                type="number"
                                                value={newProduct.price}
                                                onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                                                required
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Quantity</label>
                                            <input
                                                type="number"
                                                value={newProduct.quantity}
                                                onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})}
                                                required
                                                min="1"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Image URL</label>
                                        <input
                                            type="url"
                                            value={newProduct.image}
                                            onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                                            placeholder="Enter image URL (optional)"
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" disabled={loading}>
                                            {loading ? 'Adding...' : 'Add Product'}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowProductForm(false)}
                                            className="cancel-btn"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                <div className="dashboard-section products-section">
                    <h3>My Products</h3>
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : (
                        <div className="products-grid">
                            {filteredProducts.map(product => (
                                <div key={product._id} className="product-card">
                                    {product.image && (
                                        <img src={product.image} alt={product.name} className="product-image" />
                                    )}
                                    <div className="product-header">
                                        <h4>{product.name}</h4>
                                        <span className={`status-badge ${product.status.toLowerCase()}`}>
                                            {product.status}
                                        </span>
                                    </div>
                                    <p className="description">{product.description}</p>
                                    <div className="product-details">
                                        <p>Location: {product.location}</p>
                                        <p>Price: {formatPrice(product.price, product.currency)}</p>
                                        <p>Quantity: {product.quantity}</p>
                                        <p>Created: {new Date(product.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="product-actions">
                                        <button 
                                            onClick={() => setEditingProduct(product)}
                                            className="edit-btn"
                                        >
                                            Edit
                                        </button>
                                        <select
                                            onChange={(e) => updateProductStatus(product._id, e.target.value)}
                                            value={product.status}
                                            className="status-select"
                                        >
                                            <option value="CREATED">Created</option>
                                            <option value="IN_TRANSIT">In Transit</option>
                                            <option value="DELIVERED">Delivered</option>
                                            <option value="AVAILABLE">Available</option>
                                        </select>
                                        <button 
                                            onClick={() => handleDeleteProduct(product._id)}
                                            className="delete-btn"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dashboard-section analytics-section">
                    <h3>Analytics Overview</h3>
                    <div className="analytics-grid">
                        <div className="analytics-card">
                            <h4>Total Products</h4>
                            <p>{analytics.totalProducts}</p>
                        </div>
                        <div className="analytics-card">
                            <h4>Available</h4>
                            <p>{analytics.availableProducts}</p>
                        </div>
                        <div className="analytics-card">
                            <h4>In Transit</h4>
                            <p>{analytics.inTransit}</p>
                        </div>
                        <div className="analytics-card">
                            <h4>Delivered</h4>
                            <p>{analytics.delivered}</p>
                        </div>
                        <div className="analytics-card">
                            <h4>Total Value</h4>
                            <p>{formatPrice(analytics.totalValue, selectedCurrency)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Product Modal */}
            {editingProduct && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Edit Product</h3>
                        <form onSubmit={handleEditProduct} className="product-form">
                            <div className="form-group">
                                <label>Product Name</label>
                                <input
                                    type="text"
                                    value={editingProduct.name}
                                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                                    required
                                    placeholder="Enter product name"
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={editingProduct.description}
                                    onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                                    required
                                    placeholder="Enter product description"
                                />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input
                                    type="text"
                                    value={editingProduct.location}
                                    onChange={(e) => setEditingProduct({...editingProduct, location: e.target.value})}
                                    required
                                    placeholder="Enter product location"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Price ({selectedCurrency})</label>
                                    <input
                                        type="number"
                                        value={editingProduct.price}
                                        onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                                        required
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Quantity</label>
                                    <input
                                        type="number"
                                        value={editingProduct.quantity}
                                        onChange={(e) => setEditingProduct({...editingProduct, quantity: e.target.value})}
                                        required
                                        min="1"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Image URL</label>
                                <input
                                    type="url"
                                    value={editingProduct.image}
                                    onChange={(e) => setEditingProduct({...editingProduct, image: e.target.value})}
                                    placeholder="Enter image URL (optional)"
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" disabled={loading}>
                                    {loading ? 'Updating...' : 'Update Product'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setEditingProduct(null)}
                                    className="cancel-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <DashboardTracker 
                role="PRODUCER" 
                address={auth.currentUser.uid} 
            />
            {error && (
                <div className="error-alert">
                    {error}
                </div>
            )}
            <div className="sidebar">
                <BlockchainMonitor onEvent={handleBlockchainEvent} />
            </div>
        </div>
    );
};

export default ProducerDashboard; 