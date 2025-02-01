import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, increment, deleteDoc, orderBy, setDoc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import './Dashboard.css';
import emailjs from 'emailjs-com';
import { ethers } from 'ethers';
import supplyChainContract from '../../blockchain/SupplyChainContract';
import TransactionService from '../../services/TransactionService';
import BlockchainMonitor from '../BlockchainMonitor';
import TransactionMonitor from '../TransactionMonitor';
import ProductVerification from '../ProductVerification';

const CustomerDashboard = () => {
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState('USD');
    const [orderDetails, setOrderDetails] = useState({
        address: '',
        city: '',
        phone: '',
        email: ''
    });
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [notifications, setNotifications] = useState([]);
    const [selectedOrderRating, setSelectedOrderRating] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [currentTransaction, setCurrentTransaction] = useState(null);
    const [error, setError] = useState(null);
    const [productHistory, setProductHistory] = useState({});
    const [userCart, setUserCart] = useState([]);
    const navigate = useNavigate();

    const currencies = [
        { code: 'KSH', symbol: 'KSh' },
        { code: 'USD', symbol: '$' },
        { code: 'EUR', symbol: '€' },
        { code: 'GBP', symbol: '£' }
    ];

    const orderStatuses = {
        PENDING: 'Pending',
        PROCESSING: 'Processing',
        SHIPPED: 'Shipped',
        DELIVERED: 'Delivered',
        CANCELLED: 'Cancelled'
    };

    useEffect(() => {
        if (auth.currentUser) {
            fetchAvailableProducts();
            fetchOrders();
            fetchUserCart();
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        if (auth.currentUser) {
            const cartRef = doc(db, 'carts', auth.currentUser.uid);
            const unsubscribe = onSnapshot(cartRef, (doc) => {
                if (doc.exists()) {
                    setCart(doc.data().items || []);
                }
            });

            return () => unsubscribe();
        }
    }, []);

    const fetchAvailableProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching available products...');
            
            const productsRef = collection(db, 'products');
            const q = query(
                productsRef,
                where('status', '==', 'AVAILABLE')
            );
            
            const querySnapshot = await getDocs(q);
            const availableProducts = querySnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    const cleanId = doc.id;
                    return {
                        id: cleanId, // Store clean ID
                        productId: cleanId, // Store clean ID
                        ...data
                    };
                })
                .filter(product => parseInt(product.quantity) > 0);

            console.log('Available products:', availableProducts);
            setProducts(availableProducts);

        } catch (error) {
            console.error('Error fetching products:', error);
            setError('Failed to load products: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Simplified query without ordering
            const ordersQuery = query(
                collection(db, 'orders'),
                where('customerId', '==', auth.currentUser.uid)
            );

            const querySnapshot = await getDocs(ordersQuery);
            const ordersData = await Promise.all(
                querySnapshot.docs.map(async (doc) => {
                    const orderData = doc.data();
                    
                    // Get product data if it exists
                    let productData = orderData.product || {};
                    if (orderData.productRef) {
                        try {
                            const productDoc = await getDoc(orderData.productRef);
                            if (productDoc.exists()) {
                                productData = {
                                    ...productData,
                                    ...productDoc.data(),
                                    id: productDoc.id
                                };
                            }
                        } catch (error) {
                            console.error('Error fetching product data:', error);
                        }
                    }

                    return {
                        _id: doc.id,
                        ...orderData,
                        product: productData
                    };
                })
            );

            // Sort orders by createdAt client-side
            ordersData.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );

            console.log('Fetched orders:', ordersData);
            setOrders(ordersData);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setError('Failed to fetch orders: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchProductHistory = async (productId) => {
        try {
            const history = await supplyChainContract.getProductHistory(productId);
            setProductHistory(prev => ({
                ...prev,
                [productId]: history
            }));
        } catch (error) {
            console.error('Error fetching product history:', error);
        }
    };

    const fetchUserCart = async () => {
        if (!auth.currentUser) return;

        try {
            console.log('Fetching cart for user:', auth.currentUser.uid);
            const cartRef = doc(db, 'carts', auth.currentUser.uid);
            const cartDoc = await getDoc(cartRef);
            
            if (cartDoc.exists()) {
                const cartData = cartDoc.data();
                console.log('Fetched cart data:', cartData);
                setCart(cartData.items || []);
            } else {
                console.log('No existing cart, creating new one');
                const newCart = { 
                    items: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    userId: auth.currentUser.uid
                };
                await setDoc(cartRef, newCart);
                setCart([]);
            }
        } catch (error) {
            console.error('Error fetching cart:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            addNotification('Failed to load cart items: ' + error.message);
        }
    };

    const addToCart = async (product) => {
        if (!auth.currentUser) {
            addNotification('Please login to add items to cart');
            return;
        }

        try {
            console.log('Adding to cart, raw product:', product);
            
            const cartItem = {
                id: product.id || '',
                productId: product.id || '',
                name: product.name || '',
                price: parseFloat(product.price) || 0,
                quantity: 1,
                maxQuantity: parseInt(product.quantity) || 0,
                image: product.image || '',
                currency: product.currency || 'USD',
                producerId: product.producerId || '',
                addedAt: new Date().toISOString()
            };
            
            console.log('Formatted cart item:', cartItem);

            const cartRef = doc(db, 'carts', auth.currentUser.uid);
            
            // Get current cart
            const cartDoc = await getDoc(cartRef);
            let currentCart = [];
            
            if (cartDoc.exists()) {
                currentCart = cartDoc.data().items || [];
                console.log('Existing cart:', currentCart);
            }
            
            // Check if item already exists
            const existingItemIndex = currentCart.findIndex(item => item.id === cartItem.id);
            
            if (existingItemIndex !== -1) {
                // Update quantity if item exists
                const updatedQuantity = Math.min(
                    currentCart[existingItemIndex].quantity + 1,
                    cartItem.maxQuantity
                );
                currentCart[existingItemIndex] = {
                    ...currentCart[existingItemIndex],
                    quantity: updatedQuantity,
                    updatedAt: new Date().toISOString()
                };
                console.log('Updated existing item quantity:', updatedQuantity);
            } else {
                // Add new item
                currentCart.push(cartItem);
                console.log('Added new item to cart');
            }
            
            const cartData = {
                items: currentCart,
                updatedAt: new Date().toISOString(),
                userId: auth.currentUser.uid
            };
            
            console.log('Saving cart data:', cartData);
            
            // Update Firebase
            await setDoc(cartRef, cartData);
            
            // Update local state
            setCart(currentCart);
            addNotification(`Added ${product.name} to cart`);
            
            // Fetch updated cart to ensure sync
            await fetchUserCart();
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            addNotification('Failed to add item to cart: ' + error.message);
        }
    };

    const removeFromCart = async (productId) => {
        try {
            const cartRef = doc(db, 'carts', auth.currentUser.uid);
            const cartDoc = await getDoc(cartRef);
            
            if (cartDoc.exists()) {
                const currentCart = cartDoc.data().items.filter(item => item.id !== productId);
                
                // Update Firebase
                await setDoc(cartRef, { 
                    items: currentCart,
                    updatedAt: new Date().toISOString()
                });
                
                // Update local state
                setCart(currentCart);
                addNotification('Item removed from cart');
            }
        } catch (error) {
            console.error('Error removing from cart:', error);
            addNotification('Failed to remove item from cart');
        }
    };

    const updateCartItemQuantity = async (productId, newQuantity) => {
        try {
            const cartRef = doc(db, 'carts', auth.currentUser.uid);
            const cartDoc = await getDoc(cartRef);
            
            if (cartDoc.exists()) {
                const currentCart = cartDoc.data().items.map(item =>
                    item.id === productId
                        ? { ...item, quantity: Math.min(Math.max(1, newQuantity), item.maxQuantity) }
                        : item
                );
                
                // Update Firebase
                await setDoc(cartRef, { 
                    items: currentCart,
                    updatedAt: new Date().toISOString()
                });
                
                // Update local state
                setCart(currentCart);
            }
        } catch (error) {
            console.error('Error updating cart quantity:', error);
            addNotification('Failed to update quantity');
        }
    };

    // Format price with currency symbol
    const formatPrice = (price, currency) => {
        const currencyObj = currencies.find(c => c.code === currency);
        return `${currencyObj?.symbol || ''}${price}`;
    };

    const handleCancelOrder = async (orderId) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await deleteDoc(orderRef);
            fetchOrders();
            addNotification('Order cancelled successfully!');
        } catch (error) {
            console.error('Error cancelling order:', error);
            addNotification('Failed to cancel order');
        }
    };

    const handleReorder = async (order) => {
        try {
            const product = order.product;
            addToCart(product);
            setShowOrderForm(true);
            setOrderDetails({
                address: order.address || '',
                city: order.city || '',
                phone: order.phone || '',
                email: order.email || ''
            });
        } catch (error) {
            console.error('Error reordering:', error);
            alert('Failed to reorder');
        }
    };

    const addNotification = (message) => {
        setNotifications(prev => [...prev, {
            message,
            time: new Date().toISOString()
        }]);
    };

    const handleRating = (orderId, rating) => {
        setSelectedOrderRating(rating);
    };

    const submitRating = async (orderId) => {
        if (!selectedOrderRating) return;

        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                rating: selectedOrderRating,
                feedback: feedback,
                ratedAt: new Date().toISOString()
            });

            addNotification('Rating submitted successfully!');
            setSelectedOrderRating(null);
            setFeedback('');
            fetchOrders(); // Refresh orders list
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert('Failed to submit rating');
        }
    };

    const placeOrder = async () => {
        if (cart.length === 0) return;
        
        setLoading(true);
        setError(null);
        
        try {
            console.log('Placing orders for cart items:', cart);
            
            const orderPromises = cart.map(async (item) => {
                // Get product from Firebase using the stored productId
                const productRef = doc(db, 'products', item.productId);
                const productDoc = await getDoc(productRef);
                
                if (!productDoc.exists()) {
                    console.error('Product not found:', item.productId);
                    throw new Error(`Product ${item.name} not found in database`);
                }

                const productData = productDoc.data();
                console.log('Found product data:', productData);

                if (parseInt(productData.quantity) < parseInt(item.quantity)) {
                    throw new Error(`Not enough stock for ${item.name}`);
                }

                const orderData = {
                    productId: item.productId,
                    customerId: auth.currentUser.uid,
                    producerId: productData.producerId,
                    quantity: parseInt(item.quantity),
                    totalPrice: parseFloat(item.price) * parseInt(item.quantity),
                    status: 'PENDING',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deliveryDetails: orderDetails,
                    product: {
                        id: item.productId,
                        name: item.name,
                        price: item.price,
                        image: item.image,
                        currency: item.currency
                    }
                };

                console.log('Creating order with data:', orderData);

                // Add order to Firebase
                const orderRef = await addDoc(collection(db, 'orders'), orderData);

                // Update product quantity
                await updateDoc(productRef, {
                    quantity: increment(-item.quantity)
                });

                return { ...orderData, _id: orderRef.id };
            });

            const completedOrders = await Promise.all(orderPromises);
            console.log('Orders completed:', completedOrders);

            // Clear cart in Firebase
            const cartRef = doc(db, 'carts', auth.currentUser.uid);
            await setDoc(cartRef, { 
                items: [],
                updatedAt: new Date().toISOString()
            });

            // Clear local cart state
            setCart([]);
            setShowOrderForm(false);
            setOrderDetails({
                address: '',
                city: '',
                phone: '',
                email: ''
            });
            
            addNotification('Orders placed successfully!');
            await fetchOrders();
            await fetchAvailableProducts();

        } catch (error) {
            console.error('Error placing orders:', error);
            setError(error.message);
            addNotification(`Failed to place orders: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
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

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'ALL' || product.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const sendOrderConfirmation = async (orderDetails) => {
        try {
            await emailjs.send(
                process.env.REACT_APP_EMAILJS_SERVICE_ID,
                process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
                {
                    to_email: orderDetails.email,
                    order_id: orderDetails._id,
                    product_name: orderDetails.product.name,
                    total_amount: formatPrice(orderDetails.totalPrice, orderDetails.currency),
                    delivery_address: orderDetails.address,
                    estimated_delivery: new Date(orderDetails.estimatedDelivery).toLocaleDateString()
                },
                process.env.REACT_APP_EMAILJS_USER_ID
            );
            addNotification('Order confirmation email sent!');
        } catch (error) {
            console.error('Error sending email:', error);
            addNotification('Failed to send order confirmation email');
        }
    };

    const handlePurchase = async () => {
        if (cart.length === 0) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // Calculate total price in ETH
            const totalPrice = cart.reduce((sum, item) => 
                sum + (item.price * item.quantity), 0);
            
            // Estimate gas
            const gasEstimate = await TransactionService.estimateGas(
                supplyChainContract.contract,
                'purchaseProducts',
                [cart.map(item => item.productId)]
            );

            // Execute blockchain transaction
            const tx = await supplyChainContract.purchaseProducts(
                cart.map(item => item.productId),
                { value: ethers.utils.parseEther(totalPrice.toString()) }
            );
            setCurrentTransaction(tx);

            // Wait for confirmation
            const { status, receipt, details } = await new Promise((resolve) => {
                const handleComplete = (result) => resolve(result);
                return <TransactionMonitor 
                    transaction={tx}
                    onComplete={handleComplete}
                />;
            });

            if (status === 'success') {
                // Create order in Firebase
                const order = {
                    customerId: auth.currentUser.uid,
                    products: cart,
                    totalPrice,
                    status: 'CONFIRMED',
                    createdAt: new Date().toISOString(),
                    blockchainTxHash: tx.hash,
                    transactionDetails: details
                };

                await addDoc(collection(db, 'orders'), order);
                
                // Clear cart and refresh products
                setCart([]);
                fetchAvailableProducts();
                fetchOrders();
                addNotification('Purchase successful!');
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            setError(error.message);
            addNotification('Purchase failed: ' + error.message);
        } finally {
            setLoading(false);
            setCurrentTransaction(null);
        }
    };

    const handleBlockchainEvent = (event) => {
        if (event.type === 'ProductPurchased' && 
            event.customer === auth.currentUser.uid) {
            fetchOrders();
            addNotification(`Purchase confirmed for product ${event.productId}`);
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

    const handleEditOrder = async (orderId, newQuantity) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            const orderDoc = await getDoc(orderRef);
            const orderData = orderDoc.data();

            // Update order quantity and total price
            await updateDoc(orderRef, {
                quantity: parseInt(newQuantity),
                totalPrice: parseFloat(orderData.product.price) * parseInt(newQuantity)
            });

            fetchOrders();
            addNotification('Order updated successfully!');
        } catch (error) {
            console.error('Error updating order:', error);
            addNotification('Failed to update order');
        }
    };

    // Add this useEffect to log cart changes
    useEffect(() => {
        console.log('Cart updated:', cart);
    }, [cart]);

    // Update the initialization useEffect
    useEffect(() => {
        const initializeCart = async () => {
            if (auth.currentUser) {
                console.log('Initializing cart for user:', auth.currentUser.uid);
                await fetchUserCart();
                await fetchAvailableProducts();
                await fetchOrders();
            }
        };

        initializeCart();
    }, []);

    return (
        <div className="dashboard customer-dashboard">
            <header className="dashboard-header">
                <h2>Customer Dashboard</h2>
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
                    <div className="cart-summary">
                        Cart: {cart.length} items ({formatPrice(calculateTotal(), selectedCurrency)})
                    </div>
                    <button onClick={handleSignOut} className="sign-out-btn">
                        Sign Out
                    </button>
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
                </div>
            </header>
            
            {/* Order Form Modal */}
            {showOrderForm && (
                <div className="order-form-modal">
                    <div className="order-form">
                        <h3>Delivery Details</h3>
                        <div className="form-group">
                            <label>Delivery Address</label>
                            <input
                                type="text"
                                value={orderDetails.address}
                                onChange={(e) => setOrderDetails({...orderDetails, address: e.target.value})}
                                required
                                placeholder="Enter delivery address"
                            />
                        </div>
                        <div className="form-group">
                            <label>City</label>
                            <input
                                type="text"
                                value={orderDetails.city}
                                onChange={(e) => setOrderDetails({...orderDetails, city: e.target.value})}
                                required
                                placeholder="Enter city"
                            />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                value={orderDetails.phone}
                                onChange={(e) => setOrderDetails({...orderDetails, phone: e.target.value})}
                                required
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={orderDetails.email}
                                onChange={(e) => setOrderDetails({...orderDetails, email: e.target.value})}
                                required
                                placeholder="Enter email"
                            />
                        </div>
                        <div className="form-actions">
                            <button onClick={placeOrder} disabled={loading}>
                                {loading ? 'Processing...' : 'Confirm Order'}
                            </button>
                            <button 
                                onClick={() => setShowOrderForm(false)}
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="dashboard-content">
                <div className="dashboard-section">
                    <h3>Available Products</h3>
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : error ? (
                        <div className="error">{error}</div>
                    ) : (
                        <div className="products-grid">
                            {products.map(product => (
                                <div key={product.id} className="product-card">
                                    {product.image && (
                                        <img src={product.image} alt={product.name} className="product-image" />
                                    )}
                                    <div className="product-info">
                                        <h3>{product.name}</h3>
                                        <p>{product.description}</p>
                                        <p>Price: {formatPrice(product.price, product.currency)}</p>
                                        <p>Available: {product.quantity}</p>
                                        <p>Location: {product.location}</p>
                                        <button
                                            onClick={() => addToCart(product)}
                                            disabled={!product.quantity || product.quantity <= 0 || product.status !== 'AVAILABLE'}
                                            className="add-to-cart-btn"
                                        >
                                            {product.quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dashboard-section">
                    <h3>Shopping Cart</h3>
                    <div className="cart-items">
                        {cart.map(item => (
                            <div key={item.productId} className="cart-item">
                                <div className="cart-item-details">
                                    <h4>{item.name}</h4>
                                    <p>${item.price} each</p>
                                </div>
                                <div className="cart-item-actions">
                                    <input
                                        type="number"
                                        min="1"
                                        max={item.quantity}
                                        value={item.quantity}
                                        onChange={(e) => updateCartItemQuantity(item.productId, parseInt(e.target.value))}
                                        className="quantity-input"
                                    />
                                    <button 
                                        onClick={() => removeFromCart(item.productId)}
                                        className="remove-btn"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                        {cart.length > 0 && (
                            <div className="cart-summary">
                                <h4>Total: {formatPrice(calculateTotal(), selectedCurrency)}</h4>
                                <button 
                                    onClick={() => setShowOrderForm(true)}
                                    className="place-order-btn"
                                >
                                    {showOrderForm ? 'Confirm Order' : 'Place Order'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="dashboard-section orders-section">
                    <h3>My Orders</h3>
                    <div className="orders-grid">
                        {orders.map(order => (
                            <div key={order._id} className="order-card">
                                <div className="order-header">
                                    {order.product.image && (
                                        <img src={order.product.image} alt={order.product.name} />
                                    )}
                                    <h4>{order.product.name}</h4>
                                </div>
                                <div className="order-details">
                                    <p>Quantity: {order.quantity}</p>
                                    <p>Total: {formatPrice(order.totalPrice, selectedCurrency)}</p>
                                    <p>Ordered: {new Date(order.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="quick-actions">
                                    <input
                                        type="number"
                                        min="1"
                                        value={order.quantity}
                                        onChange={(e) => handleEditOrder(order._id, e.target.value)}
                                        className="quantity-input"
                                    />
                                    <button 
                                        onClick={() => handleCancelOrder(order._id)}
                                        className="cancel-btn"
                                    >
                                        Cancel Order
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="dashboard-section">
                <h3>Blockchain</h3>
                <BlockchainMonitor onEvent={handleBlockchainEvent} />
            </div>

            {currentTransaction && (
                <TransactionMonitor 
                    transaction={currentTransaction}
                    onComplete={handleTransactionComplete}
                />
            )}

            <ProductVerification />
        </div>
    );
};

export default CustomerDashboard; 