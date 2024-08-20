const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const user_route = require('../../routes/userRoute');
const Cart = require('../../models/cartModel');
const mongoose = require('mongoose');

const loadShop = async(req,res) => {
    try {
        const user = req.session.user_id;
        const products = await Product.find({})
        res.render('shop',{products, user})
        
    } catch (error) {
        console.log(error)
    }
}

const shopDetailsLoad = async(req,res) => {
    try {
        const user = req.session.user_id;
        const productId = req.query.productId;
        const product = await Product.findById(productId)
        const relatedProducts = await Product.find({category: product.category}).limit(4)
        res.render('shopDetails',{user, product,relatedProducts})
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    loadShop,
    shopDetailsLoad,
}