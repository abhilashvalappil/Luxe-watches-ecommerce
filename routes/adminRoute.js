const express = require('express');
const admin_route = express();
const adminController = require('../controllers/adminControllers/adminController');
const offerController = require('../controllers/adminControllers/offerController');
const categoryController = require('../controllers/adminControllers/categoryController')
const brandController = require('../controllers/adminControllers/brandController')
const productController = require('../controllers/adminControllers/productController')
const orderController = require('../controllers/adminControllers/orderController')
const session = require('express-session');
const config = require('../config/config');
const path = require('path');
const { Admin } = require('mongodb');
const auth = require("../middleware/adminAuth");
// const upload = require('../middleware/multer');
const { upload, Upload } = require('../middleware/multer');

admin_route.use(session({
    secret:config.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {secure:false}
}));

 
admin_route.set('view engine', 'ejs');
admin_route.set('views',path.join(__dirname, '../views/admin'));



admin_route.get('/',auth.isLogout,adminController.loadAdminLogin);
admin_route.get('/login',auth.isLogout,adminController.loadAdminLogin);
admin_route.post('/login',adminController.verifyLogin);

admin_route.get('/home',auth.isLogin,adminController.loadDashboard);
admin_route.get('/dashboard',adminController.loadDashboard)
admin_route.get('/users',auth.isLogin,adminController.loadUsers)
admin_route.put('/users/block/:userId',adminController.blockUser)

admin_route.get('/category',auth.isLogin,categoryController.loadCategory);
admin_route.get('/addcategory',auth.isLogin,categoryController.loadAddCategory);
admin_route.post('/category',auth.isLogin,categoryController.addCategory);
admin_route.put('/listcategory/:categoryId',auth.isLogin,categoryController.listCategory)
admin_route.get('/editcategory/:categoryId',auth.isLogin,categoryController.loadEditCategory);
admin_route.put('/editcategory/:categoryId',auth.isLogin,categoryController.editCategory);

admin_route.get('/brand',auth.isLogin,brandController.loadBrand);
admin_route.get('/add-brand',auth.isLogin,brandController.loadAddBrand);
admin_route.post('/brand',auth.isLogin,brandController.addBrand);
admin_route.put('/listbrand/:brandId',auth.isLogin,brandController.listBrand);
admin_route.get('/edit-brand/:brandId',auth.isLogin,brandController.loadEditBrand);
admin_route.put('/edit-brand/:brandId',auth.isLogin,brandController.editBrand);

admin_route.get('/products',auth.isLogin,productController.loadProducts);
admin_route.get('/addproduct',auth.isLogin,productController.loadAddProduct);
admin_route.post('/addproduct',upload,productController.addProduct)
admin_route.put('/listproduct/:productId',auth.isLogin,productController.listProduct);
admin_route.get('/editproduct',auth.isLogin,productController.editProductLoad);
admin_route.post('/editproduct',Upload,productController.editProduct);

admin_route.get('/orders',auth.isLogin,orderController.loadOrders);
admin_route.post('/update-orderstatus',auth.isLogin,orderController.orderStatusUpdate);

admin_route.get('/order-details/:order_id',auth.isLogin,orderController.orderDetailsLoad);

admin_route.get('/return-requests',auth.isLogin,orderController.loadreturnRequests);
admin_route.post('/update-return-status',auth.isLogin,orderController.returnStatus);

admin_route.get('/coupon-management',auth.isLogin, offerController.loadCouponManagement);
admin_route.post('/add-coupon',auth.isLogin,offerController.addCoupon);
// admin_route.patch('/coupons/list',couponController.listCoupon);
admin_route.put('/toggle-coupon-status/:couponId',auth.isLogin, offerController.listCoupon);

admin_route.get('/sales-report',auth.isLogin,orderController.loadSalesReport);

admin_route.get('/offer-management',auth.isLogin,offerController.loadOfferManagement)
admin_route.get('/addOffer',auth.isLogin,offerController.loadAddOffer);
admin_route.post('/add-offer',auth.isLogin,offerController.addOffer);
admin_route.put('/update-offer',auth.isLogin,offerController.updateOffer);
admin_route.patch('/deactivate-offer/:id',offerController.deactivateOffer)

 admin_route.post('/logout',adminController.logOut)

 admin_route.get('/coupons/:id',auth.isLogin,offerController.loadEditCoupon)
 admin_route.post('/update-coupon',auth.isLogin,offerController.updateCoupon)
 admin_route.patch('/delete-coupon/:id',offerController.deleteCoupon)


module.exports = admin_route;