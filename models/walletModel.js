const mongoose = require('mongoose');
const walletSchema = new mongoose.Schema({
    userId:{
        type : mongoose.Schema.Types.ObjectId,
        required: true,
    },
    balance:{
        type: Number,
        default:0
    },
    transactionHistory:[
        {
            amount:{
                type: Number
            },
            type: {
                type: String,
                enum: ['credit', 'debit'],
                required: true
            },
            date:{
                type: Date,
                default: Date.now
            },
            description:{
                type: String
            }
        }
    ]
})

module.exports = mongoose.model('Wallet', walletSchema)