const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const user_route = require('../../routes/userRoute');
const Cart = require('../../models/cartModel');
const mongoose = require('mongoose');
const Category = require('../../models/categoryModel')
const Brand = require('../../models/brandModel');
const couponModel = require('../../models/couponModel');


const loadShop = async(req,res) => {
    try {
        const user = req.session.user_id;
         
        const listedCategories = await Category.find({ is_listed: true }).select('_id');
        const listedCategoryIds = listedCategories.map(cat => cat._id);

        const perPage = 6;
        const page = parseInt(req.query.page) || 1;

        const totalProducts = await Product.countDocuments({ category: { $in: listedCategoryIds }, is_listed: true });
        const product = await Product.find({ category: { $in: listedCategoryIds }, is_listed: true })
        .skip((perPage * page) - perPage)
        .limit(perPage)
        
        const categoryData = await Category.find({})
        const brandData = await Brand.find({})
        const strapColor = await Product.distinct('strapColor')
        const dialColor = await Product.distinct('dialColor')

        res.render('shop',{products:product, user,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / perPage),
            totalProducts: totalProducts , 
            brandData , categoryData , 
            strapColor , dialColor
        })
        
    } catch (error) {
        console.log(error)
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

const shopDetailsLoad = async(req,res) => {
    try {
        const user = req.session.user_id;
        const productId = req.query.productId;
        const product = await Product.findById(productId)
        const category = await Category.findById(product.category)
        const  brand = await Brand.findById(product.brand)
        product.category = category.name
        product.brand = brand.brandName
        const relatedProducts = await Product.find({category: product.category}).limit(4)
        res.render('shopDetails',{user, product,relatedProducts})
    } catch (error) {
        console.log(error)
    }
}

const loadCoupons = async(req,res) => {
  try {
    const coupons = await couponModel.find();
    res.render('coupons',{coupons})
    
  } catch (error) {
    console.error(error)
  }
}


module.exports = {
    loadShop,
    shopDetailsLoad,
    productFilter,
    loadCoupons
}