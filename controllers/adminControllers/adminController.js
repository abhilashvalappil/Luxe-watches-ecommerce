const Admin = require('../../models/userModel');
const User = require('../../models/userModel');
const bcrypt = require('bcrypt');
const Category = require('../../models/categoryModel');
const Brand = require('../../models/brandModel');
const Product = require('../../models/productModel');
const Order = require('../../models/orderModel');
const Wallet = require('../../models/walletModel')
const HttpStatus = require('../../js/httpStatus')
const MESSAGES  = require('../../constants/messages')
const PATTERNS  = require('../../constants/patterns')
const moment = require('moment');
const sharp = require('sharp')
const multer = require('multer');
const fs = require('fs')
const path = require('path')


const loadAdminLogin = async (req, res) => {
    try {
        res.render('adminLogin')
    } catch (error) {
        console.log('error.message')
    }
}

const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
 
        if (!PATTERNS.EMAIL.test(email)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.INVALID_EMAIL });
        }

        if (!PATTERNS.PASSWORD.test(password)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.INVALID_PASSWORD });
        }

        const adminData = await Admin.findOne({ email: email });

        if (adminData) {
            if (adminData.is_admin === true) {
                const passwordMatch = await bcrypt.compare(password, adminData.password);
                if (passwordMatch) {
                    req.session.admin_id = adminData._id;
                    console.log("ses", req.session.admin_id)
                    res.status(HttpStatus.OK).json({ success: true, message: MESSAGES.LOGIN_SUCCESS})
                } else {
                    return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.WRONG_PASSWORD })
                }
            } else {
                return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.NO_ACCESS})
            }
        } else {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.EMAIL_NOT_FOUND })
        }
    } catch (error) {
        console.log(error.message);
    }
}

 
const logOut = async (req, res) => {
    try {
        if (req.session.admin_id) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error', err);
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.LOGOUT_FAILED });
                }else{       
                    return res.status(HttpStatus.OK).json({ message: MESSAGES.LOGOUT_SUCCESS });
                }
            });
        } else {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: MESSAGES.NO_ACCESS });
        }
    } catch (error) {
        console.error('Error occurred during logout', error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

 
const loadDashboard = async (req, res) => {
    try {
        const adminId = req?.session?.admin_id;
        if (!adminId) {
            return res.redirect('/admin/login');
        }

        const adminData = await Admin.findById(String(adminId));
        if (!adminData) {
            return res.redirect('/admin/login');
        }

        const totalOrdersCount = await Order.countDocuments();

        const deliveredOrdersCount = await Order.countDocuments({
            'orderedItems.orderStatus': 'Delivered'
        });

        const deliveredOrders = await Order.find({
            'orderedItems.orderStatus': 'Delivered'
        }).sort({ orderDate: 1 });
 
        const processedData = deliveredOrders.map(order => ({
            date: order.orderDate,
            totalPrice: order.totalPrice
        }));

       
        const topProducts = await Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $group: {
                    _id: "$orderedItems.productId",
                    totalSold: { $sum: "$orderedItems.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $lookup: {
                    from: "brands",
                    localField: "product.brand",
                    foreignField: "_id",
                    as: "brand"
                }
            },
            { $unwind: "$brand" },
            {
                $lookup: {
                    from: "categories",
                    localField: "product.category",
                    foreignField: "_id",
                    as: "category"
                }
            },
            { $unwind: "$category" },
            {
                $project: {
                    name: "$product.name",
                    brand: "$brand.brandName",
                    category: "$category.name",
                    price: "$product.price",
                    sold: "$totalSold"
                }
            }
        ]);

     
        const topCategories = await Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product.category",
                    totalSold: { $sum: "$orderedItems.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category"
                }
            },
            { $unwind: "$category" },
            {
                $project: {
                    name: "$category.name",
                    sold: "$totalSold"
                }
            }
        ]);

        
        const topBrands = await Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product.brand",
                    totalSold: { $sum: "$orderedItems.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "brands",
                    localField: "_id",
                    foreignField: "_id",
                    as: "brand"
                }
            },
            { $unwind: "$brand" },
            {
                $project: {
                    name: "$brand.brandName",
                    sold: "$totalSold"
                }
            }
        ]);

        res.render('dashboard', {
            totalOrdersCount,
            deliveredOrdersCount,
            orderData: JSON.stringify(processedData),
            adminName: adminData.name,
            topProducts: JSON.stringify(topProducts),
            topCategories: JSON.stringify(topCategories),
            topBrands: JSON.stringify(topBrands)
        });

    } catch (error) {
        console.error('Error in loadDashboard:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal Server Error');
    }
};
 

const loadUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;  
        const skip = (page - 1) * limit;
        const search = req.query.search;

        let query = {};

         if (search && search.trim() !== '') {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
    }

         const [users, totalUsers] = await Promise.all([
            User.find(query).skip(skip).limit(limit),
            User.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalUsers / limit);
        res.render('user', { 
            users,
            currentPage: page,
            totalPages,
            search: search || '' 
        })
    } catch (error) {
        console.log(error.message)
    }
}
const blockUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        const userData = await User.findOne({ _id: userId });

        const updatedUser = await User.findOneAndUpdate(
            { _id: userId },
            { $set: { isBlocked: !userData.isBlocked } },
            { new: true }
        );
        res.json({ success: true, isBlocked: updatedUser.isBlocked })
    } catch (error) {
        console.log(error.message)
    }
}


module.exports = {
    loadAdminLogin,
    verifyLogin,
    loadDashboard,
    loadUsers,
    blockUser,
    logOut
}


 