const mongoose = require('mongoose')

const offerSchema = mongoose.Schema({
    offerName: {
        type: String,
        required: true
    },
    offerType: {
        type: String,
        required: true
    },
    product: {   
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        default: null
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    discountPercent: {   
        type: Number,
        required: true
    },
    startDate:{
        type: Date,
        required: true
    },
    expiredate: {   
        type: Date,
        required: true
    },
    status: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Offer', offerSchema)
