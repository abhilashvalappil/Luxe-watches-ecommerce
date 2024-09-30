const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
    couponCode:{
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    discountPercent:{
        type: Number,
        required: true,
    },
    minPurchase:{
        type: Number,
        required: true
    },
    validFrom:{
        type: Date,
        required: true
    },
    validTo:{
        type: Date,
        required: true
    },
    maxRedeemAmount:{
        type: Number,
        required: true
    },
    listed: {
        type: Boolean,
        required: true,
        default: true,
      },
})

module.exports = mongoose.model('Coupon',couponSchema);