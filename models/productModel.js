const mongoose = require('mongoose');
const offerModel = require('./offerModel');
const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true
    },
    brand:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required:true
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required:true
    },
    description:{
        type:String,
        required:true
    },
    stock:{
        type:Number,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    model:{
        type:String,
        required:true
    },
    dialColor:{
        type:String
    },
    strapColor:{
        type:String
    },
    images:[{
        type:String,
        required:true
    }],
    is_listed: {
        type: Boolean,
        default: true
    },
    createdAt:{
        type: Date,
        default: Date.now
    },
    offerPercent:{
        type: Number
    }

})

module.exports = mongoose.model('Product', productSchema);