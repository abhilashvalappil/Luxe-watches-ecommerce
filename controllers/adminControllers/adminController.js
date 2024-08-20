const Admin = require('../../models/userModel');
const User = require('../../models/userModel');
const bcrypt = require('bcrypt');
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
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

const loadDashboard = async (req, res) => {
    try {


        const adminId = req?.session?.admin_id;
        // const email = req.session.email;
        if (!adminId) {
            res.redirect('/admin/login')

        } else {
            const adminData = await Admin.findById(String(adminId))

            if (!adminData) {
                return res.redirect('/admin/login')
            } else {
                return res.render('dashboard');
            }
        }

    } catch (error) {
        console.log(error.message)
    }
}

const loadUsers = async (req, res) => {
    try {
        const users = await User.find({})
        res.render('user', { users })

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
        const category = await Category.find({})
        res.render('category', { category })

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

const loadProducts = async(req,res) => {
    try {
        const product = await Product.find({})
        // console.log(product);
        res.render('products',{product})
    } catch (error) {
        console.log(error)
    }
}

const loadAddProduct = async(req,res) => {
    try {
        const categoryData = await Category.find({})
        res.render('addProduct',{categoryData})
    } catch (error) {
        console.log(error)
    }
}

// const addProduct = async(req,res,next) => {
//     try {
//         const { name, description, category, brand, model, dialColor, strapColor, stock, price } = req.body;

//         // console.log('form Data', req.body);

//         const existingProduct = await Product.findOne({
//             $or: [{ name: name }, { model: model }]
//         });

//         if(existingProduct){
//             return res.status(400).json({success:false, warning: 'product already exist'});
//         }

//         const images = [];
        

//         const bodyImages = req.files

//         console.log(req.files)

//         const imageKeys = ['image1', 'image2', 'image3'];

//         for (let i = 0; i < imageKeys.length; i++) {
//             const key = imageKeys[i];
//             if (req.files[key] && req.files[key][0]) {
//                 const file = req.files[key][0];
//                 const inputFilePath = file.path;
//                 const outputFileName = `${path.basename(file.filename.trim().replace(/\s+/g, '_'), path.extname(file.filename))}.png`;
//                 const outputFilePath = path.join('public/uploadedImages', outputFileName);
//                 await sharp(inputFilePath)
//                     .toFormat('png')
//                     .toFile(outputFilePath);
 
//                 images.push(`${outputFileName}`);

              
//                 try {
//                     await fs.promises.unlink(inputFilePath);
//                 } catch (unlinkError) {
//                     console.error('Error deleting original file:', unlinkError.message);
//                 }
//             }
//         }

//         const newProduct = new Product({
//             name:name,
//             description:description,
//             category:category,
//             brand:brand,
//             model:model,
//             dialColor:dialColor,
//             strapColor:strapColor,
//             stock:stock,
//             images: images,
//             price:price
        
//         })

//         await newProduct.save();
//         return res.status(200).json({success: true, message: 'Product added successfully.'})
        
//     } catch (error) {
//         console.log(error.message)
//         return res.status(400).json({success: false, warning: 'Error found Product not added'})
//     }
// }

const addProduct = async (req, res, next) => {
    try {
        const { name, description, category, brand, model, dialColor, strapColor, stock, price } = req.body;

        // Check for existing product
        const existingProduct = await Product.findOne({
            $or: [{ name: name }, { model: model }]
        });

        if (existingProduct) {
            return res.status(400).json({ success: false, warning: 'Product already exists' });
        }

        const images = [];

        // Process each uploaded file
        for (const file of req.files) {
            console.log('Processing file:', file.path);
            const inputFilePath = file.path;
            const outputFileName = `${path.basename(file.filename.trim().replace(/\s+/g, '_'), path.extname(file.filename))}.png`;
            const outputFilePath = path.join('public/uploadedImages', outputFileName);

            try {
                await sharp(inputFilePath)
                    .resize(500, 500) // Adjust as needed for cropping size
                    .toFormat('png')
                    .toFile(outputFilePath);
                
                images.push(outputFileName);

                // Check if file exists before deleting
                await checkAndDeleteFile(inputFilePath);
            } catch (error) {
                console.error('Error processing file:', error.message);
                return res.status(400).json({ success: false, warning: 'Error processing file' });
            }
        }

        // Create and save the new product
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
        console.error('Error adding product:', error.message);
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
    

        if(product){
            res.render('editProduct',{product, categoryData})
        }else{
            res.redirect('/products')
        }
        
    } catch (error) {
        console.log(error.message)
        res.status(400).json({ success: false, message: 'Server error' });
    }
}

const editProduct = async(req,res) => {
     try {
        const productId = req.body.productId;
        const product = await Product.findById(productId);

        // console.log('hhhhhhejsssssssssssss',product)

        if(!product){
            return res.status(400).json({ success: false, message: 'Product not found!'})
        }

        let images = [];

        
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
        }

        const update = await Product.findByIdAndUpdate(req.body.productId,{
            name: req.body.name,
            brand: req.body.brand,
            model: req.body.model,
            category: req.body.category,
            price: req.body.price,
            dialColor: req.body.dialColor,
            strapColor: req.body.strapColor,
            stock: req.body.stock,
            description: req.body.description,
            image: req.body.image
        })
        res.status(200).json({success: true, message: 'Product updated successfully.'})
        
     } catch (error) {
        console.log(error)
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
    loadProducts,
    loadAddProduct,
    addProduct,
    listProduct,
    editProductLoad,
    editProduct,
}