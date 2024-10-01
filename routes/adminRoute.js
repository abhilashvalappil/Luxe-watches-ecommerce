const express = require('express');
const admin_route = express();
const adminController = require('../controllers/adminControllers/adminController');
const offerController = require('../controllers/adminControllers/offerController');
const session = require('express-session');
const config = require('../config/config');
const path = require('path');
const { Admin } = require('mongodb');
const auth = require("../middleware/adminAuth");
const upload = require('../middleware/multer');

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
admin_route.get('/users',adminController.loadUsers)
admin_route.put('/users/block/:userId',adminController.blockUser)

admin_route.get('/category',adminController.loadCategory);
admin_route.get('/addcategory',adminController.loadAddCategory);
admin_route.post('/addcategory',adminController.addCategory);
admin_route.put('/listcategory/:categoryId',adminController.listCategory)
admin_route.get('/editcategory/:categoryId',adminController.loadEditCategory);
admin_route.put('/editcategory/:categoryId',adminController.editCategory);

admin_route.get('/brand',adminController.loadBrand);
admin_route.get('/add-brand',adminController.loadAddBrand);
admin_route.post('/add-brand',adminController.addBrand);
admin_route.put('/listbrand/:brandId',adminController.listBrand);
admin_route.get('/edit-brand/:brandId',adminController.loadEditBrand);
admin_route.put('/edit-brand/:brandId',adminController.editBrand);

admin_route.get('/products',adminController.loadProducts);
admin_route.get('/addproduct',adminController.loadAddProduct);
admin_route.post('/addproduct',upload,adminController.addProduct)
admin_route.put('/listproduct/:productId',adminController.listProduct);
admin_route.get('/editproduct',adminController.editProductLoad);
admin_route.post('/editproduct',upload,adminController.editProduct);

admin_route.get('/orders',adminController.loadOrders);
admin_route.post('/update-orderstatus',adminController.orderStatusUpdate);

admin_route.get('/order-details/:order_id',adminController.orderDetailsLoad);

admin_route.get('/return-requests',adminController.loadreturnRequests);
admin_route.post('/update-return-status',adminController.returnStatus);

admin_route.get('/coupon-management', offerController.loadCouponManagement);
admin_route.post('/add-coupon',offerController.addCoupon);
// admin_route.patch('/coupons/list',couponController.listCoupon);
admin_route.put('/toggle-coupon-status/:couponId', offerController.listCoupon);

admin_route.get('/sales-report',adminController.loadSalesReport);

admin_route.get('/offer-management',offerController.loadOfferManagement)
admin_route.get('/addOffer',offerController.loadAddOffer);
admin_route.post('/add-offer',offerController.addOffer);
admin_route.put('/update-offer',offerController.updateOffer);

 admin_route.patch('/deactivate-offer/:id',offerController.deactivateOffer)

 admin_route.post('/logout',adminController.logOut)

 admin_route.get('/coupons/:id',offerController.loadEditCoupon)
 admin_route.post('/update-coupon',offerController.updateCoupon)

 admin_route.patch('/delete-coupon/:id',offerController.deleteCoupon)


module.exports = admin_route;