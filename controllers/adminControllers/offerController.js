const Admin = require('../../models/userModel');
const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Order = require('../../models/orderModel');
const Category = require('../../models/categoryModel');
const Coupon = require('../../models/couponModel');
const Offer = require('../../models/offerModel');
const HttpStatus = require('../../js/httpStatus')
const MESSAGES  = require('../../constants/messages')
const moment = require('moment');

const loadCouponManagement = async(req,res) => {
    try {
        const perPage = parseInt(req.query.perPage) || 10;  
        const page = parseInt(req.query.page) || 1; 
        const totalCoupons = await Coupon.countDocuments();

        const coupons = await Coupon.find().skip((page - 1) * perPage).limit(perPage);
        const totalPages = Math.ceil(totalCoupons / perPage);
        res.render('couponManagement',{
            coupons,
            currentPage: page,
            totalPages: totalPages,
            perPage: perPage,
        })
    } catch (error) {
        console.error(error)
    }
}

const addCoupon = async(req,res) => {
    try {    
        const{couponCode, discountPercent, minPurchase, maxRedeemAmount, validFrom, validTo, listed} = req.body;

        const isExist = await Coupon.findOne({couponCode: couponCode})
        if(isExist){
            return res.status(HttpStatus.CONFLICT).json({success: false, message: MESSAGES.CODE_ALREADY_EXISTS })
        }

        if(!couponCode || couponCode.trim().length < 5 || couponCode[0] === " "){
            return res.status(HttpStatus.BAD_REQUEST).json({success: false, message: MESSAGES.COUPON_CODE_INVALID })
        }

        const discount = Number(discountPercent);
        if (isNaN(discount) || discount < 10 || discount > 70) {
            return res.status(HttpStatus.BAD_REQUEST).json({success: false, message: MESSAGES.DISCOUNT_PERCENT_RANGE });
        }

        if (minPurchase <= 0 || maxRedeemAmount <= 0) {
            return res.status(HttpStatus.BAD_REQUEST).json({success: false, message: MESSAGES.MIN_PURCHASE_MAX_REDEEM_POSITIVE });
        }

        if (new Date(validFrom) > new Date(validTo)) {
            return res.status(HttpStatus.BAD_REQUEST).json({success: false, message: MESSAGES.VALID_DATE_RANGE });
        }

        const coupon = new Coupon({
            couponCode: couponCode,
            discountPercent: discountPercent,
            minPurchase: minPurchase,
            maxRedeemAmount: maxRedeemAmount,
            validFrom: validFrom,
            validTo: validTo
        });
        await coupon.save()
        return res.status(HttpStatus.OK).json({success: true, message: MESSAGES.COUPON_ADDED_SUCCESS})
    } catch (error) {
        console.error(error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.COUPON_ADD_ERROR });
    }
}

const updateCoupon = async (req, res) => {
    try {
        const { couponId, couponCode, discountPercent, minimumPurchase, maxRedeem, validFrom, validTo } = req.body;

        const existingCoupon = await Coupon.findById(couponId);
        if (!existingCoupon) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: MESSAGES.COUPON_NOT_FOUND });
        }

        if (couponCode[0] === ' ') {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_CODE_INVALID });
        }

        const discount = Number(discountPercent);
        if (isNaN(discount) || discount < 10 || discount > 70) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.DISCOUNT_PERCENT_RANGE });
        }

        if (minimumPurchase <= 0 || maxRedeem <= 0) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.MIN_PURCHASE_MAX_REDEEM_POSITIVE });
        }

        if (new Date(validFrom) > new Date(validTo)) {
            return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({ success: false, message: MESSAGES.VALID_DATE_RANGE });
        }
        const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, {
            couponCode,
            discountPercent,
            minimumPurchase,
            maxRedeemAmount: maxRedeem,
            validFrom,
            validTo
        }, { new: true });
        res.json({success: true, message: 'Coupon updated successfully', coupon: updatedCoupon });
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const deleteCoupon = async(req,res) => {
    try {
        const couponId = req.params.id;
        if(!couponId){
            return res.status(HttpStatus.BAD_REQUEST).json({message: MESSAGES.COUPON_NOT_FOUND})
        }
        await Coupon.findByIdAndDelete(couponId)
        return res.status(HttpStatus.OK).json({ success: true, message: MESSAGES.COUPON_DELETED_SUCCESS });
    } catch (error) {
        console.error('Error found when deleting',error)
    }
}

const listCoupon = async(req,res) => {
    try {
        const couponId = req.params.id;
        const coupon = await Coupon.findById(couponId);
        if(!coupon){
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: MESSAGES.COUPON_NOT_FOUND });
        }
        
        coupon.listed = !coupon.listed;
        await coupon.save()
        return res.status(HttpStatus.OK).json({ success: true, listed: coupon.listed });
    } catch (error) {
        console.error(error)
    }
}


const loadOfferManagement = async(req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;  
        const limit = 2;  
        const skip = (page - 1) * limit; 

        const offerCount = await Offer.countDocuments();  
        const totalPages = Math.ceil(offerCount / limit);

        const offers = await Offer.find({})
        .populate('product', 'name')
        .populate('category', 'name')
        .limit(limit)
        .skip(skip);

        const products = await Product.find({}, 'name _id');   
        const categories = await Category.find({}, 'name _id'); 
        
        res.render('offerManagement', { 
            offers,
            products, 
            categories,
            currentPage: page,
            totalPages 
         })
    } catch (error) {
        console.error('Error occured',error)
    }
}

const loadAddOffer = async (req, res) => {
    try {
    const categoriesWithOffers = await Offer.distinct('category', { status: true });
    const productsWithOffers = await Offer.distinct('product', { status: true });
  
      const categories = await Category.find({ 
        is_listed: true,
        _id: { $nin: categoriesWithOffers }
      }).select('name _id');
  
      const products = await Product.find({ 
        is_listed: true,
        _id: { $nin: productsWithOffers }
      }).select('name _id');
  
      res.render('addOffer', { categories, products });
    } catch (error) {
      console.error('Error occurred when loading', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('An error occurred');
    }
  };

const addOffer = async(req,res) => {
    try {
        const { offerName, disPercentage, startDate, expiryDate, offerType, productId, categoryId } = req.body;
        const currentDate = new Date();
        const startOfToday = new Date(currentDate.setHours(0, 0, 0, 0)); 
        const endOfToday = new Date(currentDate.setHours(23, 59, 59, 999));

        if(!offerName || offerName.trim().length < 3){
            return res.status(HttpStatus.BAD_REQUEST).json({message: MESSAGES.OFFER_NAME_MIN_LENGTH})
        }

        const discount = Number(disPercentage);
        if (isNaN(discount) || discount < 10 || discount > 70) {
            return res.status(HttpStatus.BAD_REQUEST).json({message: MESSAGES.DISCOUNT_PERCENT_RANGE })
        }

        if(!startDate){
            return res.status(HttpStatus.BAD_REQUEST).json({message: MESSAGES.START_DATE_REQUIRED})
        }

        const selectedStartDate = new Date(startDate);
        if (selectedStartDate < startOfToday) {
            return res.status(HttpStatus.BAD_REQUEST).json({message: MESSAGES.START_DATE_FUTURE})
        }
            
        if(!expiryDate){
            return res.status(HttpStatus.BAD_REQUEST).json({message: MESSAGES.EXPIRY_DATE_REQUIRED})
        }

        const selectedExpiryDate = new Date(expiryDate);
        if (selectedExpiryDate <= endOfToday) {
            return res.status(HttpStatus.BAD_REQUEST).json({message: MESSAGES.EXPIRY_DATE_FUTURE})
        }
             

        if (selectedStartDate > selectedExpiryDate) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.EXPIRY_DATE_AFTER_START });
        }

        if(!offerType || offerType === 'Select One'){
            return res.status(HttpStatus.BAD_REQUEST).json({message: 'offerType must be required'});
        }

        const existingOffer = await Offer.findOne({ offerName: offerName });
        if (existingOffer) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.OFFER_NAME_EXISTS });
        }

        let productIdToSave = null;
        let categoryIdToSave = null;

        if(offerType === 'Product Offer'){
            if(!productId || productId === 'Select One'){
                return res.status(HttpStatus.BAD_REQUEST).json({message: MESSAGES.INVALID_PRODUCT})
            }
            productIdToSave = productId;
        } else if(offerType === 'Category Offer'){
            if(!categoryId || categoryId === 'Select One'){
                return res.status(HttpStatus.BAD_REQUEST).json({message: MESSAGES.INVALID_CATEGORY})
            }
            categoryIdToSave = categoryId;
        }

        if(productIdToSave){
            await Product.findByIdAndUpdate(productIdToSave,{
                $set:{offerPercent: disPercentage}
            })
        }else if(categoryIdToSave){
            await Category.findByIdAndUpdate(categoryIdToSave,{
                $set:{offerPercent: disPercentage}
            })
        }

        const newOffer = new Offer({
            offerName: offerName,   
            discountPercent: disPercentage,   
            startDate: startDate,
            expiredate: expiryDate,  
            offerType: offerType,
            product: productIdToSave,   
            category: categoryIdToSave
        });
        await newOffer.save();
        res.status(HttpStatus.OK).json({ message: MESSAGES.OFFER_ADDED_SUCCESS });  
    } catch (error) {
        console.error('Error adding offer',error)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Error adding offer", error: error.message });
    }
}

const loadEditCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);  
        if (!coupon) {
            return res.status(HttpStatus.NOT_FOUND).json({ error: MESSAGES.COUPON_NOT_FOUND });
        }
        res.json(coupon);
    } catch (error) {
        console.error('Error fetching coupon:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};
 
const updateOffer = async (req, res) => {
    try {
        const { offerName, discountPercent, startDate, expiryDate, offerType, productId, categoryId, offerId } = req.body;
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message:  MESSAGES.OFFER_NOT_FOUND });
        }

        const discount = Number(discountPercent);
        if (isNaN(discount) || discount < 10 || discount > 70) {
            return res.status(HttpStatus.BAD_REQUEST).json({message: MESSAGES.DISCOUNT_PERCENT_RANGE })
        }

        if (offerType === 'Product Offer') {
            if (!productId || productId === 'Select One') {
                return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.INVALID_PRODUCT });
            }
           
            await Product.findByIdAndUpdate(productId, {
                $set: { offerPercent: discountPercent }
            });
        } else if (offerType === 'Category Offer') {
            if (!categoryId || categoryId === 'Select One') {
                return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.INVALID_CATEGORY });
            }
         
            await Category.findByIdAndUpdate(categoryId, {
                $set: { offerPercent: discountPercent }
            });
        }

        await Offer.findByIdAndUpdate(offerId, {
            $set: {
                offerName,
                discountPercent,
                startDate,
                expiredate: expiryDate,
                offerType,
                product: offerType === 'Product Offer' ? productId : null,
                category: offerType === 'Category Offer' ? categoryId : null
            }
        }, { new: true });

        res.status(HttpStatus.OK).json({ message: MESSAGES.OFFER_UPDATED_SUCCESS  });
    } catch (error) {
        console.error('Error updating offer', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.OFFER_UPDATE_ERROR });
    }
};


function compareDates(expiryDate) {
    const today = new Date().setHours(0, 0, 0, 0);
    const [day, month, year] = expiryDate.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day).setHours(0, 0, 0, 0);
    return selectedDate > today;   
}

const deactivateOffer = async(req,res) => {
    try {
        const offerId = req.params.id;
        if (!offerId) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Offer ID is required' });
        }

        await Offer.findByIdAndUpdate(
            offerId, 
            { status: false }, 
            { new: true });

        return res.status(HttpStatus.OK).json({ success: true, message: 'Offer deactivated successfully'})
    } catch (error) {
        console.error('Error deactivating offer:', error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'An error occurred while deactivating the offer' });
    }
}


module.exports = {
    loadCouponManagement,
    addCoupon,
    listCoupon,
    loadOfferManagement,
    loadAddOffer,
    addOffer,
    updateOffer,
    deactivateOffer,
    loadEditCoupon,
    updateCoupon,
    deleteCoupon
}