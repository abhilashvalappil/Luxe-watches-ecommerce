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


const loadOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6; 
        const skip = (page - 1) * limit;
       
        const totalOrders = await Order.countDocuments();
        const orders = await Order.find({})
            .populate('orderedItems.productId')
            .limit(limit)
            .skip(skip);
       
        const totalPages = Math.ceil(totalOrders / limit);
        res.render('orders', {
            orders,
            currentPage: page,
            totalPages,
            limit
        });
    } catch (error) {
        console.log(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server error');
    }
};

const orderDetailsLoad = async(req,res) => {
    try {
        const order = await Order.findOne({ _id: req.params.order_id }).populate({
            path: 'orderedItems.productId',
            model: 'Product',
        });
        res.render('orderDetails',{order})
    } catch (error) {
        console.error('Error loading order details',error)
    }
}

const orderStatusUpdate = async(req,res) => {
    try {
        const {orderId , itemId, orderStatus} = req.body;
        const order = await Order.findOne({_id:orderId,"orderedItems._id": itemId});
        const item = order.orderedItems.find(item => item._id.toString() === itemId);

        if(item.orderStatus === 'Delivered' || item.orderStatus === 'Returned'){
            return res.status(400).json({message: MESSAGES.STATUS_CHANGE_NOT_ALLOWED })
        }
        
        item.orderStatus = orderStatus;

        if (orderStatus === 'Delivered' && order.paymentMethod === 'cash') {
            order.paymentStatus = 'Completed';
        }
        await order.save();
        return res.status(HttpStatus.OK).json({message: MESSAGES.STATUS_UPDATED_SUCCESS})
    } catch (error) {
        console.log(error)
    }
}

const loadreturnRequests = async(req,res)=> {
    try {
        const orders = await Order.find({
            'orderedItems.orderStatus' : 'Return requested'
        })
        .populate({
            path: 'orderedItems.productId',
            select: 'name'  
        })
        .populate({
            path: 'userId',
            select: 'name'  
        });

        res.render('returnRequest',{orders})
    } catch (error) {
        console.log(error)
    }
}

const returnStatus = async (req, res) => {
    try {
        const { orderId, itemId, status } = req.body;
        const order = await Order.findById({ _id: orderId });
        const item = order.orderedItems.find(item => item._id.toString() === itemId);

        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER_NOT_FOUND });
        }

        if (!item) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: MESSAGES.ITEM_NOT_FOUND });
        }

        item.returnStatus = status;

        if (item.returnStatus === 'approved') {
            item.orderStatus = 'Returned';

            const totalItemsPrice = order.orderedItems.reduce((sum, item) => sum + item.totalPrice, 0);
            const discountForThisItem = (item.totalPrice / totalItemsPrice) * order.discountAmount;

            let refundAmount = item.totalPrice - discountForThisItem;
            refundAmount = Math.round(refundAmount);

            await Wallet.findOneAndUpdate(
                { userId: order.userId },
                {
                    $inc: { balance: refundAmount },  
                    $push: {
                        transactionHistory: {
                            amount: refundAmount,
                            type: 'credit',
                            description: 'Order return refund',
                            date: Date.now()
                        }
                    }
                }
            );

            const product = await Product.findById(item.productId);
            if (product) {
                await Product.updateOne(
                    { _id: item.productId },
                    { $inc: { stock: item.quantity } }
                );
            } else {
                return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.PRODUCT_NOT_FOUND });
            }
        } else if (item.returnStatus == 'rejected') {
            item.orderStatus = 'Delivered';
        }

        await order.save();
        res.json({ success: true });

    } catch (error) {
        console.log(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const loadSalesReport = async(req,res) => {
    try {
        const { date, filterType, startDate, endDate, year, page = 1 } = req.query;
        const limit = 10;  
        const skip = (page - 1) * limit;
        let orders;
        
        const deliveredFilter = {
            "orderedItems.orderStatus": "Delivered"
        };

        if (filterType === 'week' && date) {
            const inputDate = new Date(date);
            const startDate = new Date(inputDate);
            const endDate = new Date(inputDate);

            startDate.setDate(inputDate.getDate() - inputDate.getDay() + (inputDate.getDay() === 0 ? -6 : 1));
            startDate.setHours(0, 0, 0, 0);

            endDate.setDate(inputDate.getDate() - inputDate.getDay() + (inputDate.getDay() === 0 ? 0 : 7));
            endDate.setHours(23, 59, 59, 999);

            orders = await Order.find({
                ...deliveredFilter,
                orderDate: { $gte: startDate, $lte: endDate }
            })
            .populate('userId')
            .populate('orderedItems.productId');

        } else if (filterType === 'day' && date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            orders = await Order.find({
                ...deliveredFilter,
                orderDate: { $gte: startDate, $lte: endDate }
            })
            .populate('userId')
            .populate('orderedItems.productId');

        } else if (filterType === 'year' && year) {
            const startDate = new Date(`${year}-01-01`);
            const endDate = new Date(`${year}-12-31`);
            endDate.setHours(23, 59, 59, 999);

            orders = await Order.find({
                ...deliveredFilter,
                orderDate: { $gte: startDate, $lte: endDate }
            })
            .populate('userId')
            .populate('orderedItems.productId');
        } else if (filterType === 'custom' && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            orders = await Order.find({
                ...deliveredFilter,
                orderDate: { $gte: start, $lte: end }
            })
            .populate('userId')
            .populate('orderedItems.productId');
        } else {
            orders = await Order.find({...deliveredFilter,})
            .populate('userId')
            .populate('orderedItems.productId')
            .skip(skip)
            .limit(limit);
        }

        const totalOrders = await Order.countDocuments(deliveredFilter);
        const totalPages = Math.ceil(totalOrders / limit);

        let totalSalesCount = 0;
        let totalOrderAmount = 0;
        let totalCouponDiscount = 0;
        let totalOfferDiscount = 0;

        orders.forEach(order => {
            totalSalesCount += 1;  
            totalOrderAmount += order.totalPrice || 0;
            totalCouponDiscount += order.discountAmount || 0;

            order.orderedItems.forEach(item => {
                totalOfferDiscount += item.offerDiscount || 0;
            });
        });

        const overallDiscount = totalCouponDiscount + totalOfferDiscount;
        const currentDate = date || new Date().toISOString().split('T')[0];

        res.render('salesReport', { 
            orders,
            currentDate,
            totalSalesCount,
            totalOrderAmount,
            totalCouponDiscount,
            totalOfferDiscount,
            overallDiscount, 
            currentPage: page,
            totalPages,
            filterType: req.query.filterType || 'defaultFilter',
            currentDate: req.query.date || '',
        });
        
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    loadOrders,
    orderDetailsLoad,
    orderStatusUpdate,
    loadreturnRequests,
    returnStatus,
    loadSalesReport
}