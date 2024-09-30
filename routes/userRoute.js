const express = require('express');
const user_route = express();
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('../config/config');
const userController = require("../controllers/userControllers/userController");
const cartController = require("../controllers/userControllers/cartController");
const shopController = require("../controllers/userControllers/shopController");
const orderController = require("../controllers/userControllers/orderController");
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const passport = require('passport');
require('../passport');

 

user_route.use(session({
    secret:config.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {secure:false}
}));

user_route.use(passport.initialize());
user_route.use(passport.session());



user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({extended:true}));

user_route.set('view engine', 'ejs');
user_route.set('views',path.join(__dirname, '../views/users'));



// user_route.use(express.static('public'));

user_route.get('/',userController.loadHomePage);
user_route.get('/home', userController.loadHomePage);


user_route.post('/logout',auth.isLogin,userController.logout)
// user_route.get('/logout', userController.logout);

user_route.get('/register',auth.isLogout, userController.loadRegister);
user_route.post('/register',userController.registerUser);


user_route.get('/otp',auth.isLogout, userController.loadOtp);
user_route.post('/verifyOtp',userController.verifyOtp);

// user_route.post('/register', otpController.createAndSendOtp)
// user_route.get('/otp', userController.loadOtp)
// user_route.post('/otp', userController.createAndSendOtp);
user_route.get('/resendOtp',userController.resendOtp)

// user_route.get('/',auth.isLogout, userController.loadLogin);
user_route.get('/login',auth.isLogout, userController.loadLogin);
user_route.post('/login',userController.verifyLogin);

user_route.get('/auth/google', passport.authenticate('google',{scope: [ 'profile', 'email' ]}));
user_route.get('/auth/google/callback', passport.authenticate('google', {failureRedirect: '/login'}), userController.googleLogin);



user_route.get('/shop',shopController.loadShop);


//user_route.get('/home',auth.isLoggedin, userController.loadHomePage);

user_route.get('/shopdetails',shopController.shopDetailsLoad);

user_route.get('/profile',auth.isLogin,userController.loadProfile);

user_route.get('/editprofile',userController.loadEditProfile);
user_route.put('/editprofile',userController.editProfile);

user_route.get('/address',userController.loadAddress);
user_route.post('/add-address',userController.addAddress);
user_route.post('/edit-address', userController.editAddress);
user_route.post('/delete-address', userController.deleteAddress)

user_route.get('/wishlist',cartController.loadWishlist);
user_route.get('/get-wishlist',cartController.getWishlist);
user_route.post('/addToWishlist',cartController.addToWishlist);
user_route.post('/removeFromWishlist',cartController.removeFromWishlist);

user_route.get('/cart',cartController.loadCart);
user_route.post('/addToCart', cartController.addToCart);
user_route.post('/removeFromCart',cartController.removeFromCart);
user_route.post('/update-Quantity',cartController.updateQuantity)
// user_route.post('/update-cart', cartController.updateCart)

user_route.get('/checkout',auth.isLogin,orderController.loadCheckout);
 
user_route.get('/forgotpassword',userController.forgotPasswordLoad)
user_route.post('/forgotpassword',userController.forgotPassword);

user_route.get('/resetPassword',userController.resetPasswordLoad);
user_route.post('/resetPassword',userController.resetPassword);

user_route.post('/place-order/',orderController.placeOrder)
user_route.get('/show-orderConfirm/:orderid',orderController.loadOrderConfirm)
user_route.get('/orders',orderController.loadOrders)

user_route.post('/verifyPayment',orderController.verifyPayment);



user_route.get('/order-details/:order_id',orderController.orderDetails);

user_route.post('/cancel-order/:order_id',orderController.cancelOrder);
user_route.get('/cancel-confirm',orderController.cancelConfirm);
// user_route.post('/return-order/:order_id',orderController.requestReturn);
user_route.post('/return-order',orderController.requestReturn);


user_route.post('/filter-product',shopController.productFilter);
user_route.post('/sort-products',shopController.sortPrice)


user_route.get('/wallet',orderController.loadWallet)

user_route.get('/coupons',shopController.loadCoupons);
user_route.post('/apply-coupon',shopController.applyCoupon)
user_route.post('/remove-coupon',shopController.removeCoupon);

user_route.post('/updatePaymentStatus',orderController.updatePaymentStatus)

user_route.get('/retry-payment/:orderId',orderController.retryPayment)

 


module.exports = user_route; 