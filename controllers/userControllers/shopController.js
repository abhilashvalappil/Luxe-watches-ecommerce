const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const user_route = require('../../routes/userRoute');
const Cart = require('../../models/cartModel');
const mongoose = require('mongoose');
const Category = require('../../models/categoryModel')
const Brand = require('../../models/brandModel');
const Coupon = require('../../models/couponModel');
const Offer = require('../../models/offerModel');
// const { default: products } = require('razorpay/dist/types/products');

const checkAndUpdateExpiredOffers = async () => {
  try {
      const currentDate = new Date();
      
      // Find expired offers
      const expiredOffers = await Offer.find({ 
          expiredate: { $lt: currentDate },
          status: true
      });

      console.log('the expireddddddddddd........ areeeeeee',expiredOffers)

      for (const offer of expiredOffers) {
          // Update offer status
          offer.status = false;
          await offer.save();

          // Remove offerPercent from associated products or categories
          if (offer.offerType === 'Product Offer' && offer.product) {
              await Product.findByIdAndUpdate(offer.product, {
                  $unset: { offerPercent: "" }
              });
          } else if (offer.offerType === 'Category Offer' && offer.category) {
              await Category.findByIdAndUpdate(offer.category, {
                  $unset: { offerPercent: "" }
              }, { new: true });
          }
      }

      console.log(`Updated ${expiredOffers.length} expired offers`);
  } catch (error) {
      console.error('Error checking and updating expired offers:', error);
  }
};
 
const loadShop = async (req, res) => {
  try {
      const user = req.session.user_id;

      const listedCategories = await Category.find({ is_listed: true }).select('_id');
      const listedCategoryIds = listedCategories.map(cat => cat._id);

      const listedBrands = await Brand.find({ is_listed: true }).select('_id');
      const listedBrandIds = listedBrands.map(brand => brand._id);

      const perPage = 6;
      const page = parseInt(req.query.page) || 1;

      const totalProducts = await Product.countDocuments({
          category: { $in: listedCategoryIds },
          brand: { $in: listedBrandIds },
          is_listed: true
      });

      let products = await Product.find({
          category: { $in: listedCategoryIds },
          brand: { $in: listedBrandIds },
          is_listed: true
      })
      .skip((perPage * page) - perPage)
      .limit(perPage);

      const offers = await Offer.find({ expiredate: { $gte: new Date() }, status: true });

      products = products.map(product => {
          let offer = offers.find(offer => offer.offerType === 'Product Offer' && offer.product.equals(product._id)) ||
                      offers.find(offer => offer.offerType === 'Category Offer' && offer.category.equals(product.category));
          
          if (offer) {
              const discount = (product.price * offer.discountPercent) / 100;
              product.discountedPrice = product.price - discount;
              product.offerPercent = offer.discountPercent;  
          } else {
              product.discountedPrice = product.price;
          }
          return product;
      });

      const categoryData = await Category.find({});
      const brandData = await Brand.find({});
      const strapColor = await Product.distinct('strapColor');
      const dialColor = await Product.distinct('dialColor');

      res.render('shop', {
          products, user,
          currentPage: page,
          totalPages: Math.ceil(totalProducts / perPage),
          totalProducts,
          brandData, categoryData,
          strapColor, dialColor
      });

  } catch (error) {
      console.log(error);
  }
};


const shopDetailsLoad = async(req,res) => {
  try {
      const user = req.session.user_id;
      const productId = req.query.productId;

      const product = await Product.findById(productId)
      .populate('category', 'name')
      .populate('brand', 'brandName');

      // const category = await Category.findById(product.category)
      // const  brand = await Brand.findById(product.brand)

      // product.category = category.name
      // product.brand = brand.brandName

      const relatedProducts = await Product.find({category: product.category._id }).limit(4)
      const offers = await Offer.find({ expiredate: { $gte: new Date() }, status: true });
      
      let offerPrice = null;
      let categoryOfferPrice = null;
      let offerPercent = null;
      let categoryOfferPercent = null;

      offers.forEach((offer) => {
        if (offer.offerType === 'Product Offer' && offer.product.equals(product._id)) {
          offerPercent = offer.discountPercent;
          offerPrice = product.price - (product.price * offer.discountPercent) / 100;
        }

        if (offer.offerType === 'Category Offer' && offer.category.equals(product.category._id)) {
          categoryOfferPercent = offer.discountPercent;
          categoryOfferPrice = product.price - (product.price * offer.discountPercent) / 100;
        }
      });

      res.render('shopDetails',{
        user, 
        product,
        relatedProducts,
        offerPrice,
        categoryOfferPrice, 
        offerPercent,
        categoryOfferPercent
      })
  } catch (error) {
      console.log('Error loading product details',error)
  }
}
 
const productFilter = async (req, res) => {
    try {
        const { selectedCategories, selectedBrands,selectedStrap,selectedDial, maxPrice,} = req.query;

      const filter = {  };

      if (selectedCategories) {

        const categoryName = selectedCategories.split(',');
        const includeCategory = await Category.find({ name: { $in: categoryName } }).select('_id');
        const categoryId = includeCategory.map((val) => val._id);

        filter.category = { $in: categoryId };
      }

      if (selectedBrands) {
        const brandName = selectedBrands.split(',');
        const includeBrand = await Brand.find({ brandName: { $in: brandName } }).select('_id');
        const brandId = includeBrand.map((val) => val._id);
        filter.brand = { $in: brandId };
      }

      if (maxPrice) {
        filter.price = { $lte: parseFloat(maxPrice) };
      }

      const products = await Product.find(filter)
        .populate("category")
         .populate("brand")
        
      res.json({
        success: true,
        products,
      });
    } catch (err) {
      console.log("error at product filter", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }


const loadCoupons = async(req,res) => {
  try {
    const coupons = await Coupon.find();
    res.render('coupons',{coupons})
    
  } catch (error) {
    console.error(error)
  }
}

const sortPrice = async(req,res) => {
  try {
    
    const { selectedOption } = req.body;

    let sortCriteria = {};
    if (selectedOption === 'low_to_high') {
      sortCriteria = { price: 1 };   
    } else if (selectedOption === 'high_to_low') {
      sortCriteria = { price: -1 };  
    }
 
    const products = await Product.find().sort(sortCriteria);
    
    res.json({success: true,products})
    res.status(200).json({ products });
  } catch (error) {
    
  }
}

const applyCoupon = async(req,res) => {
  try {

    const {couponCode,totalAmount} = req.body;
    console.log('couppppppppppp.........onnnnnnnnnnnn',totalAmount,couponCode)

    const coupon = await Coupon.findOne({ couponCode: couponCode });
    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid coupon code' });
    }

    const currentDate = new Date();
    if (coupon.validFrom > currentDate) {
      return res.status(400).json({ success: false, message: "Coupon offer not started!" });
    }
    if (coupon.validTo < currentDate) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }
    if (coupon.minPurchase > totalAmount) {
      return res.status(400).json({ success: false, message: `This coupon is only valid for Purchases Over ${coupon.minPurchase}` });
    }
 
    let discount = (totalAmount * coupon.discountPercent) / 100;
 
    if (discount > coupon.maxRedeemAmount) {
      discount = coupon.maxRedeemAmount;
    }

    // const newTotal = totalAmount - discount;
    const deliveryCharge = 60; 
    const newTotal = totalAmount - discount + deliveryCharge;

    req.session.coupon = {
      code: couponCode,
      discount: discount.toFixed(2),
      newTotal: newTotal.toFixed(2)
    };

    res.json({ 
      success: true, 
      message: `Coupon applied successfully! You saved ₹${discount.toFixed(2)}`,
      newTotal: newTotal.toFixed(2),
      discount: discount.toFixed(2)
    });

  } catch (error) {
    console.error(error)
  }
}

 
const removeCoupon = async (req, res) => { 
  try {
      if (!req.session.coupon) {
          return res.status(400).json({ success: false, message: 'No coupon applied' });
      }

      const cart = await Cart.findOne({ userId: req.session.user_id });
      if (!cart) {
          return res.status(404).json({ success: false, message: 'Cart not found' });
      }

      const { subtotal } = req.body;
      console.log('Current subtotal:', subtotal);

      const couponDiscount = req.session.coupon.discount || 0; 
      const deliveryCharge = 60;

      console.log('Coupon discount:', couponDiscount);

      const newTotal = subtotal + deliveryCharge;  

      req.session.coupon = null;  

      res.json({
          success: true,
          message: 'Coupon removed successfully!',
          newTotal: newTotal,  
      });

  } catch (error) {
      console.error('Error removing coupon:', error);
      res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
}

const searchProduct = async(req,res) => {
  try {

    const { query } = req.body;

    const results = await Product.find({
      $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
      ],
  });

  res.json({ success: true, products: results });
    
  } catch (error) {
    console.error('Error searching products:', error);
  }
}




module.exports = {
    loadShop,
    shopDetailsLoad,
    productFilter,
    loadCoupons,
    sortPrice,
    applyCoupon,
    removeCoupon,
    checkAndUpdateExpiredOffers,
    searchProduct
}