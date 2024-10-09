const Admin = require('../../models/userModel');
const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Order = require('../../models/orderModel');
const Category = require('../../models/categoryModel');
const Coupon = require('../../models/couponModel');
const Offer = require('../../models/offerModel');
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
        // console.log('the newwwwwwwwwwwwwwww',req.body)
        const{couponCode, discountPercent, minPurchase, maxRedeemAmount, validFrom, validTo, listed} = req.body;

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

        if (minPurchase <= 0 || maxRedeemAmount <= 0) {
            return res.status(400).json({success: false, message: "Minimum Purchase and Max Redeem must be positive numbers." });
        }

        if (new Date(validFrom) > new Date(validTo)) {
            return res.status(400).json({success: false, message: "Valid From date cannot be after Valid To date." });
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
        return res.status(200).json({success: true, message: 'Coupon added successfully.'})
        
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "An error occurred while adding the coupon." });
    }
}

const updateCoupon = async (req, res) => {
    try {
        console.log('the coupon data:', req.body);
        const { couponId, couponCode, discountPercent, minimumPurchase, maxRedeem, validFrom, validTo } = req.body;

        const existingCoupon = await Coupon.findById(couponId);
        if (!existingCoupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        if (couponCode[0] === ' ') {
            return res.status(403).json({ success: false, message: "Enter a proper coupon code." });
        }

        if (discountPercent < 1 || discountPercent > 100) {
            return res.status(400).json({ success: false, message: "Discount percent must be between 1 and 100." });
        }

        if (minimumPurchase <= 0 || maxRedeem <= 0) {
            return res.status(400).json({ success: false, message: "Minimum purchase and max redeem must be positive numbers." });
        }

        if (new Date(validFrom) > new Date(validTo)) {
            return res.status(400).json({ success: false, message: "Valid From date cannot be after Valid To date." });
        }

        console.log('hellllllssssssssssss')

        await Coupon.findByIdAndUpdate(couponId, {
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
        res.status(500).json({ error: 'Server error' });
    }
};

const deleteCoupon = async(req,res) => {
    try {
        const couponId = req.params.id;
        if(!couponId){
            return res.status(400).json({message: 'Coupon not found'})
        }

        await Coupon.findByIdAndDelete(couponId)
        return res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
        
    } catch (error) {
        console.error('Error found when deleting',error)
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
      res.status(500).send('An error occurred');
    }
  };

const addOffer = async(req,res) => {
    try {
        const { offerName, disPercentage, startDate, expiryDate, offerType, productId, categoryId } = req.body;
        const currentDate = new Date();
        const startOfToday = new Date(currentDate.setHours(0, 0, 0, 0)); 
        const endOfToday = new Date(currentDate.setHours(23, 59, 59, 999));

        if(!offerName || offerName.length < 3){
            return res.status(400).json({message: 'Offer Name must be at least 3 characters long.'})
        }

        if(!disPercentage || isNaN(disPercentage) || disPercentage <= 0 || disPercentage > 100){
            return res.status(400).json({message: 'Discount percentage must be a number between 1 and 100.'})
        }

        if(!startDate){
            return res.status(400).json({message: 'Start date is required.'})
        }

        const selectedStartDate = new Date(startDate);
        if (selectedStartDate < startOfToday) {
            return res.status(400).json({message: 'Start date must be today or in the future.'})
        }
            

        if(!expiryDate){
            return res.status(400).json({message: 'Expiry date is required.'})
        }

        const selectedExpiryDate = new Date(expiryDate);
        if (selectedExpiryDate <= endOfToday) {
            return res.status(400).json({message: 'Expiry date must be in the future.'})
        }
             

        if (selectedStartDate > selectedExpiryDate) {
            return res.status(400).json({ message: 'Expiry date must be after the start date.' });
        }

        if(!offerType || offerType === 'Select One'){
            return res.status(400).json({message: 'offerType must be required'});
        }

        const existingOffer = await Offer.findOne({ offerName: offerName });
        if (existingOffer) {
            return res.status(400).json({ message: "An offer with this name already exists" });
        }

        let productIdToSave = null;
        let categoryIdToSave = null;

        if(offerType === 'Product Offer'){
            if(!productId || productId === 'Select One'){
                return res.status(400).json({message: 'Select a valid Product'})
            }
            productIdToSave = productId;
        } else if(offerType === 'Category Offer'){
            if(!categoryId || categoryId === 'Select One'){
                return res.status(400).json({message: 'Select a valid Category'})
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
            // product: productId !== 'Select One' ? productId : null,   
            // category: categoryId !== 'Select One' ? categoryId : null
        });

        await newOffer.save();
        res.status(200).json({ message: "Offer added successfully" });  
    } catch (error) {
        console.error('Error adding offer',error)
        res.status(500).json({ message: "Error adding offer", error: error.message });
    }
}

const loadEditCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);  
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }
        res.json(coupon);
    } catch (error) {
        console.error('Error fetching coupon:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
 
const updateOffer = async (req, res) => {
    try {
        const { offerName, discountPercent, startDate, expiryDate, offerType, productId, categoryId, offerId } = req.body;

        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(400).json({ message: 'Offer not found!' });
        }

        if (offerType === 'Product Offer') {
            if (!productId || productId === 'Select One') {
                return res.status(400).json({ message: 'Select a valid Product' });
            }
           
            await Product.findByIdAndUpdate(productId, {
                $set: { offerPercent: discountPercent }
            });
        } else if (offerType === 'Category Offer') {
            if (!categoryId || categoryId === 'Select One') {
                return res.status(400).json({ message: 'Select a valid Category' });
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

        res.status(200).json({ message: 'Offer updated successfully.' });
    } catch (error) {
        console.error('Error updating offer', error);
        res.status(500).json({ message: 'An error occurred while updating the offer' });
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
            return res.status(400).json({ success: false, message: 'Offer ID is required' });
        }
         
        await Offer.findByIdAndUpdate(
            offerId, 
            { status: false }, 
            { new: true });

            return res.status(200).json({ success: true, message: 'Offer deactivated successfully'})
        
    } catch (error) {
        console.error('Error deactivating offer:', error);
        return res.status(500).json({ success: false, message: 'An error occurred while deactivating the offer' });
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