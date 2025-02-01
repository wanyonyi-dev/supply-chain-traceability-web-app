export const verifyProduct = async (productId) => {
    try {
        const productRef = doc(db, 'products', productId);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
            console.error('Product not found:', {
                productId,
                exists: productDoc.exists()
            });
            return null;
        }

        const productData = productDoc.data();
        return {
            id: productDoc.id,
            ...productData,
            price: parseFloat(productData.price || 0),
            quantity: parseInt(productData.quantity || 0)
        };
    } catch (error) {
        console.error('Error verifying product:', error);
        return null;
    }
};

export const fetchProductDetails = async (productId) => {
    try {
        const productRef = doc(db, 'products', productId);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
            return null;
        }

        const productData = productDoc.data();
        return {
            id: productDoc.id,
            ...productData,
            price: parseFloat(productData.price || 0),
            quantity: parseInt(productData.quantity || 0)
        };
    } catch (error) {
        console.error('Error fetching product details:', error);
        return null;
    }
};

export const validateProductStatus = (status) => {
    const validStatuses = [
        'CREATED', 
        'IN_TRANSIT', 
        'DELIVERED', 
        'AVAILABLE', 
        'OUT_OF_STOCK',
        'PROCESSING',
        'SHIPPED',
        'CANCELLED'
    ];
    
    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid product status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`);
    }
    return true;
};