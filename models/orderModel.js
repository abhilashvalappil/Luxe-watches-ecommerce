const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId:{
        type: mongoose.SchemaTypes.ObjectId,
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
        orderStatus:{
            type: String,
            default: 'Pending',
            enum:['Pending','Processing','Shipped','Delivered','Cancelled','Returned'] 
        },

    }],
    paymentMethod:{
        type: String,
        default: 'cash',
        enum: ['cash', 'RazorPay', 'Wallet']
    },
    paymentStatus:{
        type:String,
        default: 'Pending'
    },
    orderDate:{
        type: Date,
        default: Date.now
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
    totalPrice :{
        type:Number,
    }
})

module.exports = mongoose.model('Order', orderSchema)