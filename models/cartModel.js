const mongoose = require('mongoose');
const cartSchema = new mongoose.Schema({
    userId:{
        type: mongoose.SchemaTypes.ObjectId,
        required: true
    },
    cartItems:[
        {
            productId:{
                type: mongoose.SchemaTypes.ObjectId,
                ref: 'product',
                required: true
            },
            quantity:{
                type: Number,
                default:1
            }
        }
    ]
})

module.exports = mongoose.model('Cart',cartSchema)