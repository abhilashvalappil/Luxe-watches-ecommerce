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


const loadProducts = async(req,res) => {
    try {
        const perPage = 5;  
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';

        const searchFilter = search
            ? { name: { $regex: search, $options: 'i' } }  
            : {};

        const totalProducts = await Product.countDocuments(searchFilter);

        const product = await Product.find(searchFilter)
        .populate('brand', 'brandName')
        .populate('category', 'name')
        .skip((page - 1) * perPage).limit(perPage);

        const totalPages = Math.ceil(totalProducts / perPage);
        res.render('products',{
            product,
            currentPage: page, 
            totalPages,
            search 
        })
    } catch (error) {
        console.log(error)
    }
}

const loadAddProduct = async(req,res) => {
    try {
        const categoryData = await Category.find({})
        const brandData = await Brand.find({})
        res.render('addProduct',{categoryData , brandData})
    } catch (error) {
        console.log(error)
    }
}

const addProduct = async (req, res, next) => {
    try {
        const { name, description, category, brand, model, dialColor, strapColor, stock, price } = req.body;
        const existingProduct = await Product.findOne({
            $or: [{ name: name }, { model: model }]
        });

        if (existingProduct) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, warning: 'Product already exists' });
        }
        if (!req.files || req.files.length < 3) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, warning: 'Please upload at least three images.' });
        }

        const images = [];

        for (const file of req.files) {
            const inputFilePath = file.path;
            const outputFileName = `${path.basename(file.filename.trim().replace(/\s+/g, '_'), path.extname(file.filename))}.png`;
            const outputFilePath = path.join('public/uploadedImages', outputFileName);

            try {
                await sharp(inputFilePath)
                    .resize(500, 500) 
                    .toFormat('png')
                    .toFile(outputFilePath);
                
                images.push(outputFileName);
            } catch (error) {
                console.error('Error processing file:', error);
                return res.status(400).json({ success: false, warning: 'Error processing file' });
            }
        }
        const newProduct = new Product({
            name,
            description,
            category,
            brand,
            model,
            dialColor,
            strapColor,
            stock,
            images: images,
            price
        });

        await newProduct.save();
        return res.status(HttpStatus.OK).json({ success: true, message: 'Product added successfully.' });
    } catch (error) {
        console.error('Error adding product:', error);
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, warning: 'Error: Product not added' });
    }
};

const listProduct = async(req,res) => {
    try {
        const productId = req.params.productId;
        const product  = await Product.findById({_id:productId})
        if(!product){
            return res.status(400).json({success: false, message:MESSAGES.PRODUCT_NOT_FOUND})
        }

        product.is_listed = !product.is_listed;
        await product.save();
        return res.status(HttpStatus.OK).json({success: true, is_listed: product.is_listed })
    } catch (error) {
        console.log(error.message);
        return res.status(HttpStatus.BAD_REQUEST).json({sucess: false, message: MESSAGES.INTERNAL_SERVER_ERROR})
    }
}

const editProductLoad = async(req,res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({_id: id})
        const categoryData = await Category.find({})
        const brandData = await Brand.find({})

        if(product){
            res.render('editProduct',{product, categoryData , brandData})
        }else{
            res.redirect('/products')
        }
    } catch (error) {
        console.log(error.message)
        res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const editProduct = async (req, res) => {
    try {
        const productId = req.body.productId;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.PRODUCT_NOT_FOUND });
        }

        let images = [];
        
        //* Check if files are uploaded
        if (req.files) {
            const bodyImages = req.files;
            const fields = ['image1', 'image2', 'image3'];

            fields.forEach((field, index) => {
                if (bodyImages[field] && bodyImages[field][0]) {
                    images[index] = bodyImages[field][0].filename;  
                } else if (product.images[index]) {
                    images[index] = product.images[index];  
                }
            });
        } else {
            images = product.images;  
        }

        await Product.findByIdAndUpdate(productId, {
            name: req.body.name,
            brand: req.body.brand,
            model: req.body.model,
            category: req.body.category,
            price: req.body.price,
            dialColor: req.body.dialColor,
            strapColor: req.body.strapColor,
            stock: req.body.stock,
            description: req.body.description,
            images: images 
        });

        res.status(HttpStatus.OK).json({ success: true, message: 'Product updated successfully.' });
    } catch (error) {
        console.log(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};


module.exports = {
    loadProducts,
    loadAddProduct,
    addProduct,
    listProduct,
    editProductLoad,
    editProduct
}