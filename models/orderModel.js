const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId:{
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true
    },
    orderedItems:[{
        productId:{
            type: mongoose.SchemaTypes.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity:{
            type: Number,   
            required: true,
            default: 1
        },
        price:{
            type: Number,
            required: true
        },
        totalPrice: {
            type: Number,
            required: true
        },
        offerDiscount:{
            type: Number,
            default:0
        },
        orderStatus:{
            type: String,
            default: 'Pending',
            enum:['Pending','Processing','Order confirmed','Failed','Shipped','Delivered','Cancelled','Return requested','Returned'] 
        },
        returnReason:{
            type: String,
        },
        returnStatus:{
            type: String,
            enum:['approved','rejected']
        }

    }],
    paymentMethod:{
        type: String,
        default: 'cash',
        enum: ['cash','Razorpay','Wallet']
    },
    razorpayOrderId: {
        type: String,
        required: false
    },
    paymentStatus:{
        type:String,
        default: 'Pending',
        enum: ['Pending', 'Processing', 'Completed', 'Failed', 'Refunded']
    },
    couponCode: {  
        type: String,
        required: false
    },
    discountAmount: {  
        type: Number,
        required: false,
        default: 0
    },
    totalPrice: {   //* all products * quantity totalprice without deducting coupons and discounts
        type: Number,
        required: true
    },  
    orderDate:{
        type: Date,
        default: Date.now(),
    },
    deliveryCharge: {
        type: Number,
        required: true,
        default: 60,
    },
    invoiceNumber:{
        type: String,
        
    },
    address:{
        Name:{
            type: String,
            required: true
        },
        Mobile : {
            type:Number,
            required:true
        },
        PIN : {
            type:Number,
            required:true
        },
        Locality : {
            type:String,
            required:true
        },
        address : {
            type:String,
            required:true
        },
        city : {
            type:String,
            required:true
        },
        state : {
            type:String,
            required:true
        },
        landmark : {
            type:String,
        },
        is_Home : {
            type:Boolean,
            default:false
        },
        is_Work : {
            type:Boolean,
            default:false
        },
    },
    totalPrice :{ //* after overall coupon and discount deductions
        type:Number,
    }
})

module.exports = mongoose.model('Order', orderSchema)