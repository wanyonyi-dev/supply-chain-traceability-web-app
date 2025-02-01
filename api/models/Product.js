const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    manufacturer: {
        type: String,
        required: true
    },
    currentOwner: {
        type: String,
        required: true
    },
    currentLocation: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['CREATED', 'IN_TRANSIT', 'DELIVERED', 'SOLD']
    },
    qrCode: String,
    trackingHistory: [{
        status: String,
        location: String,
        timestamp: Date,
        updatedBy: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema); 