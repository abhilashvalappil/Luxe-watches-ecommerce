const Admin = require('../../models/userModel');
const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Order = require('../../models/orderModel');
const Coupon = require('../../models/couponModel');

const loadCouponManagement = async(req,res) => {
    try {
        const coupons = await Coupon.find();

        res.render('couponManagement',{coupons})
    } catch (error) {
        console.error(error)
    }
}

const addCoupon = async(req,res) => {
    try {
        // console.log('the newwwwwwwwwwwwwwww',req.body)
        const{couponCode, discountPercent, minPurchase, maxRedeem, validFrom, validTo, listed} = req.body;

        const isExist = await Coupon.findOne({couponCode: couponCode})
        if(isExist){
            return res.status(403).json({success: false, message: "This CODE is already exists, please enter another one" })
        }

        if(couponCode[0] == ' '){
            return res.status(403).json({success: false, message: "Enter Proper Coupen Code" })
        }

        if (discountPercent < 1 || discountPercent > 100) {
            return res.status(400).json({success: false, message: "Discount percent must be between 1 and 100." });
        }

        if (minPurchase <= 0 || maxRedeem <= 0) {
            return res.status(400).json({success: false, message: "Minimum Purchase and Max Redeem must be positive numbers." });
        }

        if (new Date(validFrom) > new Date(validTo)) {
            return res.status(400).json({success: false, message: "Valid From date cannot be after Valid To date." });
        }

        const coupon = new Coupon({
            couponCode: couponCode,
            discountPercent: discountPercent,
            minPurchase: minPurchase,
            maxRedeem: maxRedeem,
            validFrom: validFrom,
            validTo: validTo
        });
        await coupon.save()
        return res.status(200).json({success: true, message: 'Coupon added successfully.'})
        
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "An error occurred while adding the coupon." });
    }
}

const listCoupon = async(req,res) => {
    try {
        const couponId = req.params.id;
        const coupon = await Coupon.findById(couponId);
        
        if(!coupon){
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        
        coupon.listed = !coupon.listed;
        await coupon.save()

        return res.status(200).json({ success: true, listed: coupon.listed });
        
    } catch (error) {
        console.error(error)
    }
}


module.exports = {
    loadCouponManagement,
    addCoupon,
    listCoupon,
}