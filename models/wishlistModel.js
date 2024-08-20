const mongoose = require('mongoose');
const wishlistSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Types.ObjectId,
        required: true
    },
    wishlistItems: [{
        type: mongoose.Types.ObjectId,
        required: true
    }]
})

module.exports = mongoose.model('Wishlist', wishlistSchema)