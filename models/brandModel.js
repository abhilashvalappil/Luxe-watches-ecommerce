const mongoose = require('mongoose');
const brandSchema = new mongoose.Schema({
    brandName:{
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description:{
        type: String,
        required: true,
        trim: true
    },
    is_listed:{
        type: Boolean,
        default: true
    }
},{
    timestamps: true
});

module.exports = mongoose.model('Brand',brandSchema);