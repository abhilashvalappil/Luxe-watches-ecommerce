const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const user_route = require('../../routes/userRoute');
const Cart = require('../../models/cartModel');
const mongoose = require('mongoose');
const Address = require('../../models/addressModel')
const Order = require('../../models/orderModel');
const Wishlist = require('../../models/wishlistModel')
const Offer = require('../../models/offerModel');
const { checkAndUpdateExpiredOffers } = require('./shopController');
 

// const loadCart = async (req, res) => {
//     try {
//         await checkAndUpdateExpiredOffers();    
//         const userId = req.session.user_id;
//         const user = await User.findById(userId);

//         const offers = await Offer.find({ expiredate: { $gte: new Date() }, status: true });
//         console.log('recdddddddddddddd..............fff offffffffrs',offers)

//         const userCart = await Cart.aggregate([
//             { $match: { userId: new mongoose.Types.ObjectId(userId) } },
//             { $unwind: '$cartItems' },
//             {
//                 $lookup: {
//                     from: 'products',
//                     localField: 'cartItems.productId',
//                     foreignField: '_id',
//                     as: 'productDetails'
//                 }
//             },
//             { $unwind: '$productDetails' },
//             {
//                 $lookup: {
//                     from: 'categories',
//                     localField: 'productDetails.category',
//                     foreignField: '_id',
//                     as: 'categoryDetails'
//                 }
//             },
//             { $unwind: '$categoryDetails' },
//             {
//                 $project: {
//                     _id: 0,
//                     productId: '$cartItems.productId',
//                     quantity: '$cartItems.quantity',
//                     productDetails: {
//                         name: '$productDetails.name',
//                         price: '$productDetails.price',
//                         images: '$productDetails.images',
//                         offerPercent: '$productDetails.offerPercent'
//                     },
//                     categoryOfferPercent: '$categoryDetails.offerPercent'
//                 }
//             }
//         ]);
        

//         userCart.forEach(item => {
//             const productOffer = item.productDetails.offerPercent || 0;  
//             const categoryOffer = item.categoryOfferPercent || 0;  

//             console.log('product offer existsssssss',productOffer)
//             console.log('categoryOffer offer existsssssss',categoryOffer)

//             if (productOffer) {
//                 const discount = (item.productDetails.price *  item.productDetails.offerPercent) / 100;
//                 item.offerPrice = item.productDetails.price - discount;
//                 item.offerPercent = productOffer;
//             } else if (!productOffer && categoryOffer) {
//                 const discount = (item.productDetails.price * item.categoryOfferPercent) / 100;
//                 item.offerPrice = item.productDetails.price - discount;
//                 item.offerPercent = categoryOffer;
//             } else {
//                 item.offerPrice = item.productDetails.price;
//                 item.offerPercent = 0;
//             }
//         });

//         const totalPriceResult = userCart.reduce((total, item) => {
//             return total + (item.offerPrice * item.quantity);
//         }, 0);

//         if (userCart.length === 0) {
//             return res.render('cart', { user, userData: user, totalPrice: 0, userCart: [], message: 'Your cart is empty' })
//         }

//         res.render('cart', { user, userData: user, userCart, totalPrice: totalPriceResult });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// }
const loadCart = async (req, res) => {
    try {
        // Update expired offers first
        await checkAndUpdateExpiredOffers();

        const userId = req.session.user_id;
        const user = await User.findById(userId);

        const offers = await Offer.find({
            expiredate: { $gte: new Date() },
            status: true
        });
        console.log('Received offers:', offers);

        // Aggregate user cart with product and category details
        const userCart = await Cart.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: '$cartItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'cartItems.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productDetails.category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: '$categoryDetails' },
            {
                $project: {
                    _id: 0,
                    productId: '$cartItems.productId',
                    quantity: '$cartItems.quantity',
                    productDetails: {
                        name: '$productDetails.name',
                        price: '$productDetails.price',
                        images: '$productDetails.images',
                        offerPercent: '$productDetails.offerPercent'
                    },
                    categoryOfferPercent: '$categoryDetails.offerPercent'
                }
            }
        ]);

        // Calculate offer price and discount
        userCart.forEach(item => {
            const productOffer = item.productDetails.offerPercent || 0;
            const categoryOffer = item.categoryOfferPercent || 0;

            if (productOffer) {
                const discount = (item.productDetails.price * productOffer) / 100;
                item.offerPrice = item.productDetails.price - discount;
                item.offerPercent = productOffer;
            } else if (!productOffer && categoryOffer) {
                const discount = (item.productDetails.price * categoryOffer) / 100;
                item.offerPrice = item.productDetails.price - discount;
                item.offerPercent = categoryOffer;
            } else {
                item.offerPrice = item.productDetails.price;
                item.offerPercent = 0;
            }
        });

        // Calculate total price
        const totalPriceResult = userCart.reduce((total, item) => {
            return total + (item.offerPrice * item.quantity);
        }, 0);

        // Check if cart is empty
        if (userCart.length === 0) {
            return res.render('cart', {
                user,
                userData: user,
                totalPrice: 0,
                userCart: [],
                message: 'Your cart is empty'
            });
        }

        res.render('cart', {
            user,
            userData: user,
            userCart,
            totalPrice: totalPriceResult
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

const addToCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { productId } = req.body;
        await checkAndUpdateExpiredOffers();

        let cart = await Cart.findOne({ userId: userId });
        req.session.coupon = null;
        req.session.couponDiscount = 0;

        if (!cart) {
            cart = new Cart({
                userId: userId,
                cartItems: [{ productId: productId, quantity: 1 }]
            });
        } else {
            const existingItem = cart.cartItems.find(item => item.productId.equals(productId));

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.cartItems.push({ productId: productId, quantity: 1 });
            }
        }

        await cart.save();
        res.json({ success: true })
    } catch (error) {
        console.error("Error adding to cart: ", error);
        res.status(500).send("Server Error");
    }
}

const removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { productId } = req.body;


        if (!userId || !productId) {
            return res.status(400).json({ error: 'Invalid userId or productId' });
        }

        const result = await Cart.updateOne(
            { userId: userId },
            { $pull: { cartItems: { productId: productId } } }
        );

        req.session.coupon = null;
        req.session.couponDiscount = 0;

        if (result.modifiedCount) {
            res.status(200).json({ success: true, message: 'Item removed from cart' });
        } else {
            res.status(404).json({ success: false, message: 'Item not found in cart' });
        }
    } catch (error) {
        console.error('Error removing item from cart:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateQuantity = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { productId, quantity } = req.body;
        const product = await Product.findById({ _id: productId });
        const stock = product.stock;
        const cart = await Cart.findOne({ userId: userId, "cartItems.productId": productId });
        const cartItem = cart.cartItems.find(item => item.productId.toString() === productId);

        // const currentQuantity = cartItem ? cartItem.quantity : 0;
        if(quantity>stock){
            return res.status(400).json({ success: false, message: 'Requested quantity exceeds available stock' });
        }else if(quantity===6){
            return res.status(400).json({ success: false, message: 'cannot add more than 5' });
        }
        else{
            await Cart.findOneAndUpdate(
                { userId: userId, "cartItems.productId": productId },
                { $set: { "cartItems.$.quantity": quantity } },
                { new: true }
            );
        }

        return res.status(200).json({ message: 'Quantity updated.', newQuantity: quantity });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'An error occurred while updating the quantity.' });
    }
};
 

const loadWishlist = async (req, res) => {
    try {
        const user = req?.session?.user_id;
        if(!user){
            return res.status(400).json({success: false, message: 'Login to continue!'})
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 4;
        
        const wishlist = await Wishlist.findOne({ userId: user });
        
        if (!wishlist) {
            return res.render('wishlist', { user, wishlist: null, products: [], page, totalPages: 0, limit });
        }

        const totalProducts = wishlist.products.length;
        const totalPages = Math.ceil(totalProducts / limit);
        
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        const productIds = wishlist.products.slice(startIndex, endIndex);
        
        const products = await Product.find({ _id: { $in: productIds } });

   
        const validProducts = products.filter(product => product != null);

        
        const actualTotalProducts = await Product.countDocuments({ _id: { $in: wishlist.products } });
        const actualTotalPages = Math.ceil(actualTotalProducts / limit);

        res.render('wishlist', { 
            user, 
            wishlist, 
            products: validProducts, 
            page, 
            totalPages: actualTotalPages, 
            limit 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
}

const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user_id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Login to continue' });
        }
        const wishlist = await Wishlist.findOne({ userId: userId });
        return res.status(200).json({ success: true, wishlist: wishlist ? wishlist.products : [] });
    } catch (error) {
        console.error('Error in getWishlist:', error);
        return res.status(500).json({ success: false, message: 'An error occurred while fetching the wishlist' });
    }
};


const addToWishlist = async(req, res) => {
    try {
        const {productId} = req.body;
        const userId = req.session.user_id;
        
        if(!userId){
            return res.status(400).json({message: 'Login to your account to add to wishlist !'})
        }

        await Wishlist.findOneAndUpdate(
            {userId: userId},
            {$addToSet: {products: productId}},
            {new: true, upsert: true}
        );

        return res.status(200).json({success: true, message: 'Product added to wishlist'})
    } catch (error) {
        console.error(error)
    }
}

const removeFromWishlist = async(req,res) => {
    try {
        const {productId} = req.body;
        const userId = req.session.user_id;

        if(!userId){
            return res.status(400).json({message: 'login to continue'})
        }
        await Wishlist.findOneAndUpdate(
            {userId: userId},
            {$pull:{products: productId}},
            {new:  true}
        )
        return res.status(200).json({success: true, message: 'Remove from wishlist'})
    } catch (error) {
        console.error(error)
    }
}

module.exports = {
    loadCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    loadWishlist,
    getWishlist,
    addToWishlist,
    removeFromWishlist,
}