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



const loadCategory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;  
        const skip = (page - 1) * limit;
        const search = req.query.search ? req.query.search.trim() : '';

        let query = {};
        if (search !== '') {
            query = {
                name: { $regex: search, $options: 'i' }  
            };
        }

        const [category, totalCategories] = await Promise.all([
            Category.find(query).skip(skip).limit(limit),
            Category.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCategories / limit);
        res.render('category', { 
            category,
            currentPage: page,
            totalPages,
            search
         })
    } catch (error) {
        console.log(error.message);
    }
}

const listCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.CATEGORY_NOT_FOUND });
        }

        category.is_listed = !category.is_listed;
        await category.save();
        res.json({ success: true, is_listed: category.is_listed })
    } catch (error) {
        console.error(error.message)
    }
}

const loadAddCategory = async (req, res) => {
    try {
        res.render('addCategory')
    } catch (error) {
        console.log(error.message);
    }
}

const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const categoryData = await Category.findOne({ name: name });
        const newCategory = new Category({ name, description })
        if (categoryData) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Data Already Exist !' })
        }
        else {
            await newCategory.save()
            res.status(HttpStatus.OK).json({ success: true, message: 'Data Saved Successfully' });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const loadEditCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const category = await Category.findById( categoryId )
        res.render('editCategory', { category })
    } catch (error) {
        console.log(error.message)
        res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const editCategory = async (req, res) => {          
    try {
        const categoryId = req.params.categoryId;
        const { name, description } = req.body;

        const category = await Category.findById(categoryId)
        if (!category) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.CATEGORY_NOT_FOUND })
        }
        category.name = name;
        category.description = description;
        await category.save();
        return res.status(HttpStatus.OK).json({ success:true, message: 'Category updated' })
    } catch (error) {
        console.log(error.message)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Category not updated' });
    }
}


module.exports = {
    loadCategory,
    listCategory,
    loadAddCategory,
    addCategory,
    loadEditCategory,
    editCategory
}