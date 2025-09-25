const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const user_route = require('../../routes/userRoute');
const Cart = require('../../models/cartModel');
const mongoose = require('mongoose');
const Address = require('../../models/addressModel')
const Order = require('../../models/orderModel');
const Wishlist = require('../../models/wishlistModel')
const Offer = require('../../models/offerModel');
const HttpStatus = require('../../js/httpStatus')
const MESSAGES  = require('../../constants/messages')
const { checkAndUpdateExpiredOffers } = require('./shopController');
 
 
const loadCart = async (req, res) => {
    try {
        await checkAndUpdateExpiredOffers();

        const userId = req.session.user_id;
        const user = await User.findById(userId);

        const offers = await Offer.find({
            startDate: { $lte: new Date() },
            expiredate: { $gte: new Date() },
            status: true
        });
        

        //* Aggregate user cart with product and category details
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
                        offerPercent: '$productDetails.offerPercent',
                        category: '$productDetails.category' 
                    },
                    // categoryOfferPercent: '$categoryDetails.offerPercent'
                    categoryDetails: {
                        _id: '$categoryDetails._id',   // 👈 include category id
                        offerPercent: '$categoryDetails.offerPercent'
                    }
                }
            }
        ]);

        // Calculate offer price and discount
        userCart.forEach(item => {
            // const productOffer = item.productDetails.offerPercent || 0;
            // const categoryOffer = item.categoryOfferPercent || 0;
            let productOffer = null;
            let categoryOffer = null; 

            const matchedProductOffer = offers.find(
                o => o.offerType === 'Product Offer' && o.product && o.product.equals(item.productId)
            );

             if (matchedProductOffer) {
                productOffer = matchedProductOffer.discountPercent;
            }

            // const matchedCategoryOffer = offers.find(
            //     o => o.offerType === 'Category Offer' && o.category && o.category.equals(item.categoryDetails._id)
            // );
            const matchedCategoryOffer = offers.find(
                o => o.offerType === 'Category Offer' && o.category && o.category.equals(item.productDetails.category)
            );


            if (matchedCategoryOffer) {
                categoryOffer = matchedCategoryOffer.discountPercent;
            }

            const bestOffer = Math.max(productOffer || 0, categoryOffer || 0);

            if (bestOffer > 0) {
                const discount = (item.productDetails.price * bestOffer) / 100;
                item.offerPrice = item.productDetails.price - discount;
                item.offerPercent = bestOffer;
            } else {
                item.offerPrice = item.productDetails.price;
                item.offerPercent = 0;
            }

            // if (productOffer) {
            //     const discount = (item.productDetails.price * productOffer) / 100;
            //     item.offerPrice = item.productDetails.price - discount;
            //     item.offerPercent = productOffer;
            // } else if (!productOffer && categoryOffer) {
            //     const discount = (item.productDetails.price * categoryOffer) / 100;
            //     item.offerPrice = item.productDetails.price - discount;
            //     item.offerPercent = categoryOffer;
            // } else {
            //     item.offerPrice = item.productDetails.price;
            //     item.offerPercent = 0;
            // }
        });

      
        const totalPriceResult = userCart.reduce((total, item) => {
            return total + (item.offerPrice * item.quantity);
        }, 0);

      
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
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
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
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
    }
}

const removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { productId } = req.body;

        if (!userId || !productId) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid userId or productId' });
        }

        const result = await Cart.updateOne(
            { userId: userId },
            { $pull: { cartItems: { productId: productId } } }
        );

        req.session.coupon = null;
        req.session.couponDiscount = 0;

        if (result.modifiedCount) {
            res.status(HttpStatus.OK).json({ success: true, message: 'Item removed from cart' });
        } else {
            res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Item not found in cart' });
        }
    } catch (error) {
        console.error('Error removing item from cart:', error.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
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
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message:  MESSAGES.QUANTITY_EXCEEDS_STOCK });
        }else if(quantity===6){
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message:  MESSAGES.MAX_LIMIT_REACHED });
        }
        else{
            await Cart.findOneAndUpdate(
                { userId: userId, "cartItems.productId": productId },
                { $set: { "cartItems.$.quantity": quantity } },
                { new: true }
            );
        }
        return res.status(HttpStatus.OK).json({ message: 'Quantity updated.', newQuantity: quantity });
    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.QUANTITY_UPDATE_ERROR });
    }
};
 

// const loadWishlist = async (req, res) => {
//     try {
//         const user = req?.session?.user_id;
//         if(!user){
//             return res.status(HttpStatus.BAD_REQUEST).json({success: false, message: MESSAGES.LOGIN_REQUIRED })
//         }
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 4;
        
//         const wishlist = await Wishlist.findOne({ userId: user });
//         if (!wishlist) {
//             return res.render('wishlist', { user, wishlist: null, products: [], page, totalPages: 0, limit });
//         }

//         const totalProducts = wishlist.products.length;
//         const totalPages = Math.ceil(totalProducts / limit);
        
//         const startIndex = (page - 1) * limit;
//         const endIndex = startIndex + limit;
        
//         const productIds = wishlist.products.slice(startIndex, endIndex);
//         const products = await Product.find({ _id: { $in: productIds } });
//         const validProducts = products.filter(product => product != null);
//         const actualTotalProducts = await Product.countDocuments({ _id: { $in: wishlist.products } });
//         const actualTotalPages = Math.ceil(actualTotalProducts / limit);

//         res.render('wishlist', { 
//             user, 
//             wishlist, 
//             products: validProducts, 
//             page, 
//             totalPages: actualTotalPages, 
//             limit 
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
//     }
// }
const loadWishlist = async (req, res) => {
  try {
    const user = req?.session?.user_id;
    if (!user) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.LOGIN_REQUIRED });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;

    const wishlist = await Wishlist.findOne({ userId: user });
    if (!wishlist) {
      return res.render("wishlist", {
        user,
        wishlist: null,
        products: [],
        page,
        totalPages: 0,
        limit,
      });
    }

    const totalProducts = wishlist.products.length;
    const totalPages = Math.ceil(totalProducts / limit);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const productIds = wishlist.products.slice(startIndex, endIndex);
    let products = await Product.find({ _id: { $in: productIds } });
    const validProducts = products.filter((product) => product != null);

    // ✅ Fetch only valid offers (started & not expired)
    const offers = await Offer.find({
      startDate: { $lte: new Date() },
      expiredate: { $gte: new Date() },
      status: true,
    });

    // ✅ Attach offers to each product
    const productsWithOffers = validProducts.map((product) => {
      let applicableOffer =
        offers.find(
          (offer) =>
            offer.offerType === "Product Offer" &&
            offer.product.equals(product._id)
        ) ||
        offers.find(
          (offer) =>
            offer.offerType === "Category Offer" &&
            offer.category.equals(product.category)
        );

      product = product.toObject(); // convert to plain object

      if (applicableOffer) {
        const discount =
          (product.price * applicableOffer.discountPercent) / 100;
        product.discountedPrice = product.price - discount;
        product.offerPercent = applicableOffer.discountPercent;
      } else {
        product.discountedPrice = product.price;
        product.offerPercent = 0;
      }

      return product;
    });

    const actualTotalProducts = await Product.countDocuments({
      _id: { $in: wishlist.products },
    });
    const actualTotalPages = Math.ceil(actualTotalProducts / limit);

    res.render("wishlist", {
      user,
      wishlist,
      products: productsWithOffers,
      page,
      totalPages: actualTotalPages,
      limit,
    });
  } catch (error) {
    console.error(error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user_id;
        if (!userId) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: MESSAGES.LOGIN_REQUIRED });
        }
        const wishlist = await Wishlist.findOne({ userId: userId });
        return res.status(HttpStatus.OK).json({ success: true, wishlist: wishlist ? wishlist.products : [] });
    } catch (error) {
        console.error('Error in getWishlist:', error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.WISHLIST_FETCH_ERROR });
    }
};

const addToWishlist = async(req, res) => {
    try {
        const {productId} = req.body;
        const userId = req.session.user_id;
        if(!userId){
            return res.status(HttpStatus.BAD_REQUEST).json({message: MESSAGES.LOGIN_TO_ADD_WISHLIST })
        }

        await Wishlist.findOneAndUpdate(
            {userId: userId},
            {$addToSet: {products: productId}},
            {new: true, upsert: true}
        );
        return res.status(HttpStatus.OK).json({success: true, message: 'Product added to wishlist'})
    } catch (error) {
        console.error(error)
    }
}

const removeFromWishlist = async(req,res) => {
    try {
        const {productId} = req.body;
        const userId = req.session.user_id;
        if(!userId){
            return res.status(HttpStatus.UNAUTHORIZED).json({message: MESSAGES.LOGIN_REQUIRED})
        }
        await Wishlist.findOneAndUpdate(
            {userId: userId},
            {$pull:{products: productId}},
            {new:  true}
        )
        return res.status(HttpStatus.OK).json({success: true, message: 'Remove from wishlist'})
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