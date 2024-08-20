const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const user_route = require('../../routes/userRoute');
const Cart = require('../../models/cartModel');
const mongoose = require('mongoose');
const Address = require('../../models/addressModel')
const Order = require('../../models/orderModel');

const loadCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById(userId);

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
                $project: {
                    _id: 0,
                    productId: '$cartItems.productId',
                    quantity: '$cartItems.quantity',
                    productDetails: {
                        name: '$productDetails.name',
                        price: '$productDetails.price',
                        images: '$productDetails.images'
                    }
                }
            }
        ]);

        const totalPriceResult = await Cart.aggregate([
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
                $project: {
                    _id: 0,
                    totalPrice: { $multiply: ['$productDetails.price', '$cartItems.quantity'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalPrice: { $sum: '$totalPrice' }
                }
            }
        ]);

        const totalPrice = totalPriceResult.length > 0 ? totalPriceResult[0].totalPrice : 0;

        if(userCart.length === 0){
            return res.render('cart',{user, userData: user, totalPrice, userCart:[], message: 'Your cart is empty'})
        }
        
        res.render('cart', {user, userData: user, userCart, totalPrice });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
}

const addToCart = async (req, res) => {
    try {
        const userId = req.session.user_id;  
        const { productId } = req.body; 

        let cart = await Cart.findOne({ userId : userId });

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
        res.json({success:true})
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


const updateQuantity = async(req,res) => {
    try {
        const userId = req.session.user_id;
        const { productId, quantity } = req.body;

        const MAX_QUANTITY = 5;  

        if (quantity > MAX_QUANTITY) {
            return res.status(400).json({ error: `Quantity cannot exceed ${MAX_QUANTITY}.` });
        }

        const stock = await Product.findOne({_id: productId});

        if(stock >= quantity){
            await Cart.updateOne(
                {userId: userId, "cartItems.productId": productId },
                {$set: {"cartItems.$.quantity": quantity }}
            )
        }else{
            await Cart.updateOne(
                {userId: userId, "cartItems.productId": productId},
                {$set: {"cartItems.$.quantity": stock}}
            );
            quantity = stock;
        }
        await Cart.save()
        res.status(200).json({ quantity: quantity })
         
    } catch (error) {
        
    }
}


const updateCart = async (req, res) => {
    try {
        const cartData = req.body;
        const userId = req.session.user_id;

        for (const item of cartData) {
            const { productId, quantity } = item;
 
            await Cart.updateOne(
                { userId: userId, "cartItems.productId": productId },
                { $set: { "cartItems.$.quantity": quantity } },
                { upsert: true }  
            );
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

const loadCheckout = async (req, res) => {
    try {
        const user = req.session.user_id;
        const userData = await User.findOne({_id: user});
        const address = await Address.findOne({userId: user});
        const cart = await Cart.findOne({userId: user});

        const cartedProducts = [];

        for (const item of cart.cartItems) {
            const product = await Product.findOne({_id: item.productId});
            const productWithQuantity = product.toObject();
            productWithQuantity.quantity = item.quantity; 
            cartedProducts.push(productWithQuantity);
            
        }

        res.render('checkout', {
            user, 
            userData,
            address,
            cartedProducts 
        });

    } catch (error) {
        console.log(error);
    }
};

const placeOrder = async(req,res) => {
    try {
        const user = req.session.user_id;
        const cart = await Cart.findOne({userId: user})
        const { addressId, paymentMethod } = req.body;

       
        const cartItems = JSON.parse(req.body.cartItems.replace(/&#34;/g, '"'));

        const addresses = await Address.findOne({userId: user})
        const selectedAddress = addresses.address.find(address => address._id.toString() === addressId)

        if(!selectedAddress){
            console.error('Shipping address not found');
            return res.status(400).json({message: 'Add address details !'})
        }

        if(!cartItems || cartItems.length === 0){
            return res.status(400).json({error: 'Cart cannot be empty!'})
        }

        for(let i=0; i<cart.cartItems.length; i++){
            const product = await Product.findById(cart.cartItems[i].productId);

            if (!product) {
                return res.status(400).json({ message: 'Product not found!' });
            }

            if(product.stock === 0){
                return res.status(400).json({message: 'Product is out of stock!'})
            }else if(cart.cartItems[i].quantity > product.stock){
                return res.status(400).json({message: 'Product doesnot have enough stock as you requested!'})
            }
        }

        if(paymentMethod === "cash"){
             
            const orderedItems = cart.cartItems.map((item) => {
            const product = cartItems.find(cartItem => cartItem._id.toString() === item.productId.toString() );

                if (!product) {
                    return res.status(400).json({message: 'Product data not found in cartItems'})
                }
                const totalPrice = product.price * item.quantity;
                return {
                    productId : item.productId,
                    quantity: item.quantity,
                    price: product.price,
                    totalPrice: totalPrice,
                    orderStatus: 'Pending'
                }
            });

            let totalPrice=0
            for(const item of orderedItems){
                totalPrice+=item.price
                await Product.findByIdAndUpdate(item.productId,
                    { $inc : {stock: -item.quantity}},
                    {new : true}
                )
            }

            const order = new Order({
                userId: user,
                orderedItems: orderedItems,
                paymentMethod: paymentMethod,
                paymentStatus: 'Pending',
                orderDate: Date.now(),
                address: {
                    Name: selectedAddress.name,
                    Mobile: selectedAddress.phone,
                    PIN: selectedAddress.pincode,
                    Locality: selectedAddress.locality,
                    address: selectedAddress.address,
                    city: selectedAddress.city,
                    state: selectedAddress.state,
                    landmark: selectedAddress.landmark,
                    is_Home: selectedAddress.addressType === 'home',
                    is_Work: selectedAddress.addressType === 'work'
                },
                totalPrice:totalPrice
            });
            
            await order.save();
            await Cart.deleteOne({ userId: user });
            return res.status(200).json({ success: true, message: 'Order placed successfully', orderId: order._id });
            
        } else{
            return res.status(400).json({ success: false, message: 'Invalid payment method' });
        }

    } catch (error) {
        console.error('Error placing order:', error);  
        return res.status(500).json({ success: false, message: 'An error occurred' });
    }
}

const loadOrderConfirm = async(req,res) =>{
    try {
        const orderId = req.params.orderid;
        
        const order = await Order.findOne({_id : orderId}).populate({
            path: 'orderedItems.productId',
            model: 'Product',  
          });

        res.render('confirmOrder',{order:order})
        
    } catch (error) {
        console.log("plsced",error);
        
    }
}

const loadOrders = async(req,res) => {
    try {
        const user = req.session.user_id;
        const order = await Order.find({userId: user}).populate({
            path: 'orderedItems.productId',
            model: 'Product',  
          });

        res.render('orders',{order})
    } catch (error) {
        
    }
}
 




module.exports = {
    loadCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateCart,
    loadCheckout,
    placeOrder,
    loadOrderConfirm,
    loadOrders,
}