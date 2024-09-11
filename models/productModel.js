const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true
    },
    brand:{
        type:String,
        required:true
    },
    category:{
        type:String,
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
})

module.exports = mongoose.model('Product', productSchema);