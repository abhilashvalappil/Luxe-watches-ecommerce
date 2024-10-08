const Admin = require('../../models/userModel');
const User = require('../../models/userModel');
const bcrypt = require('bcrypt');
const Category = require('../../models/categoryModel');
const Brand = require('../../models/brandModel');
const Product = require('../../models/productModel');
const Order = require('../../models/orderModel');
const Wallet = require('../../models/walletModel')
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

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email address.' });
        }
        const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordPattern.test(password)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long and contain at least one letter and one number.' });
        }

        const adminData = await Admin.findOne({ email: email });

        if (adminData) {
            if (adminData.is_admin === true) {
                const passwordMatch = await bcrypt.compare(password, adminData.password);
                if (passwordMatch) {
                    req.session.admin_id = adminData._id;
                    console.log("ses", req.session.admin_id)
                    // res.redirect('/admin/dashbord');
                    res.status(200).json({ success: true, message: 'login success' })
                } else {

                    return res.status(400).json({ success: false, message: "wrong password" })
                }
            } else {
                return res.status(400).json({ success: false, message: "You have no access" })
            }
        } else {
            return res.status(400).json({ success: false, message: "Couldn't find your email" })
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
                    return res.status(500).json({ message: 'Failed to log out' });
                }else{
                    console.log("kerindooooooooooooo");
                    
                    return res.status(200).json({ message: 'Logged out successfully' });

                }
            });
        } else {
            return res.status(401).json({ message: 'Not logged in' });
        }
    } catch (error) {
        console.error('Error occurred during logout', error);
        return res.status(500).json({ message: 'Internal server error' });
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
        res.status(500).send('Internal Server Error');
    }
};
 

const loadUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;  
        const skip = (page - 1) * limit;

        const users = await User.find({}).skip(skip).limit(limit);

        const totalUsers = await User.countDocuments({});
        const totalPages = Math.ceil(totalUsers / limit);

        res.render('user', { 
            users,
            currentPage: page,
            totalPages 
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


const loadCategory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Categories per page
        const skip = (page - 1) * limit;


        const category = await Category.find({}).skip(skip).limit(limit);

        const totalCategories = await Category.countDocuments({});
        const totalPages = Math.ceil(totalCategories / limit);

        res.render('category', { 
            category,
            currentPage: page,
            totalPages
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
            return res.status(400).json({ success: false, message: 'Category not found' });
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
        console.log(newCategory)
        if (categoryData) {
            return res.status(400).json({ success: false, message: 'Data Already Exist !' })
        }
        else {

            await newCategory.save()
            res.status(200).json({ success: true, message: 'Data Saved Successfully' });
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
        res.status(400).json({ success: false, message: 'Server error' });
    }
}

const editCategory = async (req, res) => {          
    try {
        const categoryId = req.params.categoryId;
        const { name, description } = req.body;

        const category = await Category.findById(categoryId)

        if (!category) {
            return res.status(400).json({ success: false, message: 'Category not found' })
        }
        category.name = name;
        category.description = description;
        await category.save();
        return res.status(200).json({ success:true, message: 'Category updated' })
        
    } catch (error) {
        console.log(error.message)
        res.status(500).json({ success: false, message: 'Category not updated' });
    }
}

const loadBrand = async(req,res) => {
    try {

         const page = parseInt(req.query.page) || 1;  
        const limit = 5;  
        const skip = (page - 1) * limit; 

        const totalBrands = await Brand.countDocuments({});

        const brand = await Brand.find({}).skip(skip) .limit(limit);

        const totalPages = Math.ceil(totalBrands / limit);

        res.render('brand', {brand,currentPage: page, totalPages})
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
            return res.status(400).json({ success: false, message: 'Brand Already Exists!' });
        } else {
            const newBrand = new Brand({ brandName, description });
            console.log(newBrand);
            await newBrand.save();
            res.status(200).json({ success: true, message: 'Brand Saved Successfully' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

const listBrand = async (req, res) => {
    try {
        const brandId = req.params.brandId;
        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(400).json({ success: false, message: 'Brand not found' });
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
        res.status(400).json({ success: false, message: 'Server error' });
    }
}

const editBrand = async (req, res) => {          
    try {
        const brandId = req.params.brandId;
        const { brandName, description } = req.body;

        const brand = await Brand.findById(brandId)

        if (!brand) {
            return res.status(400).json({ success: false, message: 'Brand not found' })
        }
        brand.brandName = brandName;
        brand.description = description;
        await brand.save();
        return res.status(200).json({ success:true, message: 'Brand updated successfully' })
        
    } catch (error) {
        console.log(error.message)
        res.status(500).json({ success: false, message: 'Brand not updated' });
    }
}


const loadProducts = async(req,res) => {
    try {

        const perPage = 5;  
        const page = parseInt(req.query.page) || 1;

        const totalProducts = await Product.countDocuments();

        const product = await Product.find({})
        .populate('brand', 'brandName')
        .populate('category', 'name')
        .skip((page - 1) * perPage).limit(perPage);

        const totalPages = Math.ceil(totalProducts / perPage);

        res.render('products',{
            product,
            currentPage: page, 
            totalPages 
        })
    } catch (error) {
        console.log(error)
    }
}

const loadAddProduct = async(req,res) => {
    try {
        const categoryData = await Category.find({})
        const brandData = await Brand.find({})
        console.log()
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
            return res.status(400).json({ success: false, warning: 'Product already exists' });
        }

        // Check if images were uploaded
        if (!req.files || req.files.length < 3) {
            return res.status(400).json({ success: false, warning: 'Please upload at least three images.' });
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
        return res.status(200).json({ success: true, message: 'Product added successfully.' });

    } catch (error) {
        console.error('Error adding product:', error);
        return res.status(400).json({ success: false, warning: 'Error: Product not added' });
    }
};


const listProduct = async(req,res) => {
    try {
        const productId = req.params.productId;
        const product  = await Product.findById({_id:productId})

        if(!product){
            return res.status(400).json({success: false, message:'Product not found!'})
        }

        product.is_listed = !product.is_listed;
        await product.save();
        return res.status(200).json({success: true, is_listed: product.is_listed })

        
    } catch (error) {
        console.log(error.message);
        return res.status(400).json({sucess: false, message: 'An error occured!'})
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
        res.status(400).json({ success: false, message: 'Server error' });
    }
}

// const editProduct = async(req,res) => {
//      try {
//         const productId = req.body.productId;
//         console.log('the iddddddddddddddddddd',productId)
//         const product = await Product.findById(productId);



//         if(!product){
//             return res.status(400).json({ success: false, message: 'Product not found!'})
//         }

//         let images = [];

        
//         if (req.files) {
//             const bodyImages = req.files;
//             const fields = ['image1', 'image2', 'image3'];
//             fields.forEach((field, index) => {
//                 if (bodyImages[field] && bodyImages[field][0]) {
//                     images[index] = bodyImages[field][0].filename;
//                 } else if (product.images[index]) {
//                     images[index] = product.images[index];
//                 }
//             });
//         }

//         const update = await Product.findByIdAndUpdate(req.body.productId,{
//             name: req.body.name,
//             brand: req.body.brand,
//             model: req.body.model,
//             category: req.body.category,
//             price: req.body.price,
//             dialColor: req.body.dialColor,
//             strapColor: req.body.strapColor,
//             stock: req.body.stock,
//             description: req.body.description,
//             image: req.body.image
//         })
//         res.status(200).json({success: true, message: 'Product updated successfully.'})
        
//      } catch (error) {
//         console.log(error)
//      }
// }
const editProduct = async (req, res) => {
    try {
        const productId = req.body.productId;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(400).json({ success: false, message: 'Product not found!' });
        }

        let images = [];
        
        // Check if files are uploaded
        if (req.files) {
            const bodyImages = req.files;
            const fields = ['image1', 'image2', 'image3'];

            fields.forEach((field, index) => {
                if (bodyImages[field] && bodyImages[field][0]) {
                    images[index] = bodyImages[field][0].filename; // New image file
                } else if (product.images[index]) {
                    images[index] = product.images[index]; // Retain old image if not uploaded
                }
            });
        } else {
            images = product.images; // Retain old images if no new images are uploaded
        }

        // Update the product with new details and images
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
            images: images // Updated images array
        });

        res.status(200).json({ success: true, message: 'Product updated successfully.' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


 
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
        res.status(500).send('Server error');
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
        console.log('the satusssssssssssssssssss',orderStatus)
        const order = await Order.findOne({_id:orderId,"orderedItems._id": itemId});
        const item = order.orderedItems.find(item => item._id.toString() === itemId);

        if(item.orderStatus === 'Delivered' || item.orderStatus === 'Returned'){
            return res.status(400).json({message: 'Status cannot be changed once it is Delivered or Returned'})
        }
        
        
        item.orderStatus = orderStatus;

        if (orderStatus === 'Delivered' && order.paymentMethod === 'cash') {
            order.paymentStatus = 'Completed';
        }

        await order.save();
        return res.status(200).json({message: 'Status updated successfully'})
        
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
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        item.returnStatus = status;

        if (item.returnStatus === 'approved') {
            item.orderStatus = 'Returned';

            const totalItemsPrice = order.orderedItems.reduce((sum, item) => sum + item.totalPrice, 0);
            const discountForThisItem = (item.totalPrice / totalItemsPrice) * order.discountAmount;

            let refundAmount = item.totalPrice - discountForThisItem;
            refundAmount = Math.round(refundAmount);

            console.log('the deducteddddddddd.......discounnnnnnnnnt',refundAmount)

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
                return res.status(400).json({ message: 'Product not found!' });
            }
        } else if (item.returnStatus == 'rejected') {
            item.orderStatus = 'Delivered';
        }

        await order.save();
        res.json({ success: true });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
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
    loadAdminLogin,
    verifyLogin,
    loadDashboard,
    loadUsers,
    blockUser,
    loadCategory,
    loadAddCategory,
    addCategory,
    listCategory,
    loadEditCategory,
    editCategory,
    loadBrand,
    loadAddBrand,
    addBrand,
    listBrand,
    loadEditBrand,
    editBrand,
    loadProducts,
    loadAddProduct,
    addProduct,
    listProduct,
    editProductLoad,
    editProduct,
    loadOrders,
    orderDetailsLoad,
    orderStatusUpdate,
    loadreturnRequests,
    returnStatus,
    loadSalesReport,
    logOut
     
}


 