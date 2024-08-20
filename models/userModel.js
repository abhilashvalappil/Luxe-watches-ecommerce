const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        required: function() {
            return !this.googleId; //************** */ phone is required only if googleId is not present
        },
        default: ''
    },
    password:{
        type:String,
        required: function() {
            return !this.googleId; //********** */ password is required only if googleId is not present
        },
        default: ''
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    googleId:{
        type:String,
        default:''
    },
    is_admin:{
        type:Boolean,
        required:true,
        default:false
    }
});

module.exports = mongoose.model('User' , userSchema);