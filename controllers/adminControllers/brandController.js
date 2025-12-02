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


const loadBrand = async(req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;  
        const limit = 5;  
        const skip = (page - 1) * limit; 
        const search = req.query.search || '';

        const searchQuery = search
      ? { brandName: { $regex: new RegExp(search, 'i') } }
      : {};

        const totalBrands = await Brand.countDocuments(searchQuery);
        const brand = await Brand.find(searchQuery).skip(skip) .limit(limit);
        const totalPages = Math.ceil(totalBrands / limit);
        res.render('brand', {brand,currentPage: page, totalPages,search})
    } catch (error) {
        console.log(error)
    }
}

const loadAddBrand = async(req,res) => {
    try {
        res.render('addBrand')
    } catch (error) {
        console.log('error')
    }
}

const addBrand = async (req, res) => {
    try {
        const { brandName, description } = req.body;
        const brandData = await Brand.findOne({ brandName: brandName });
         
        if (brandData) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Brand Already Exists!' });
        } else {
            const newBrand = new Brand({ brandName, description });
            console.log(newBrand);
            await newBrand.save();
            res.status(HttpStatus.OK).json({ success: true, message: 'Brand Saved Successfully' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}


const listBrand = async (req, res) => {
    try {
        const brandId = req.params.brandId;
        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.BRAND_NOT_FOUND });
        }
        brand.is_listed = !brand.is_listed;
        await brand.save();
        res.json({ success: true, is_listed: brand.is_listed })
    } catch (error) {
        console.error(error.message)
    }
}

const loadEditBrand = async (req, res) => {
    try {
        const brandId = req.params.brandId;
        const brand = await Brand.findById( brandId )
        res.render('editBrand', { brand })
    } catch (error) {
        console.log(error.message)
        res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const editBrand = async (req, res) => {          
    try {
        const brandId = req.params.brandId;
        const { brandName, description } = req.body;

        const brand = await Brand.findById(brandId)
        if (!brand) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.BRAND_NOT_FOUND })
        }
        brand.brandName = brandName;
        brand.description = description;
        await brand.save();
        return res.status(HttpStatus.OK).json({ success:true, message: 'Brand updated successfully' })
    } catch (error) {
        console.log(error.message)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Brand not updated' });
    }
}

module.exports = {
    loadBrand,
    loadAddBrand,
    addBrand,
    listBrand,
    loadEditBrand,
    editBrand

}
