const express = require('express');
const admin_route = express();
const adminController = require('../controllers/adminControllers/adminController');
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


admin_route.get('/products',adminController.loadProducts);
admin_route.get('/addproduct',adminController.loadAddProduct);
admin_route.post('/addproduct',upload,adminController.addProduct)
admin_route.put('/listproduct/:productId',adminController.listProduct);
admin_route.get('/editproduct',adminController.editProductLoad);
admin_route.post('/editproduct',upload,adminController.editProduct);

module.exports = admin_route;