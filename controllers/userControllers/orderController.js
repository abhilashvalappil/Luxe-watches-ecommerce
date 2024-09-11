const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const user_route = require('../../routes/userRoute');
const Cart = require('../../models/cartModel');
const mongoose = require('mongoose');
const Address = require('../../models/addressModel')
const Order = require('../../models/orderModel');
const Wallet = require('../../models/walletModel');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const loadCheckout = async (req, res) => {
    try {
        const user = req.session.user_id;
        const userData = await User.findOne({ _id: user });
        const address = await Address.findOne({ userId: user });
        const cart = await Cart.findOne({ userId: user });

        const cartedProducts = [];

        for(let i=0; i<cart.cartItems.length; i++){
            const item = cart.cartItems[i];
            const product = await Product.findOne({_id: item.productId});
            const productWithQuantity = product.toObject();
            productWithQuantity.quantity = item.quantity;
            cartedProducts.push(productWithQuantity)
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

        const { addressId, paymentMethod, cartItems, totalAmount } = req.body;

        const addresses = await Address.findOne({userId: user})
        const selectedAddress = addresses.address.find(address => address._id.toString() === addressId)
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
                return res.status(409).json({message: 'Product doesnot have enough stock as you requested!'})
            }
        }

        // if(paymentMethod === 'cash' && totalAmount > 1000){
        //     return res.status(403).json({ message: "Cash On Delivery only Availble for Product below ₹1000 !" });
        // }

        if(paymentMethod === 'Razorpay'){
            const razorpayOrder = await razorpayInstance.orders.create({
                amount: order.totalPrice * 100,
                currency: 'INR',
                receipt: `receipt_order_${order._id}`,
                payment_capture: '1'
            });

            order.razorpayOrderId = razorpayOrder.id;
            await order.save();
            await Cart.deleteOne({userId: user });

            return res.status(200).json({
                success: true,
                message: "Order created and ready for payment.",
                orderId: order._id,
                razorpayOrderId: razorpayOrder.id,
                amount: order.totalPrice * 100,
                key_id: process.env.RAZORPAY_KEY_ID
            });
            

        }else{

           await order.save();
          
            await Cart.deleteOne({ userId: user });
            return res.status(200).json({ success: true, message: 'Order placed successfully', orderId: order._id });
        }
     

    } catch (error) {
        console.error('Error placing order:', error);  
        return res.status(500).json({ success: false, message: 'An error occurred' });
    }
}

const verifyPayment = async (req, res, next) => {

    const { paymentId, orderId, razorpaySignature } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const data = `${order.razorpayOrderId}|${paymentId}`;
        console.log('data',data)
        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY);
        shasum.update(data);
        const digest = shasum.digest('hex');

        if (digest !== razorpaySignature) {
            order.orderStatus = 'Failed';
            order.paymentStatus = 'Failed';
            await order.save();
            return res.status(400).json({ success: false, message: "Invalid signature provided" });
        }

        order.orderStatus = "Confirmed";
        order.paymentStatus = 'Paid';
        await order.save();

        console.log('order',order)

        const orderData = await OrderModel.aggregate(
            [
                {
                    '$match': {
                        '_id': new mongoose.Types.ObjectId(orderId)
                    }
                }
            ]
        )
        for (const item of order.orderedItems) {
            const update = Number(item.quantity);
            await Product.findOneAndUpdate(
                { _id: item.productId },
                { $inc: { stock: -update }, $set: { popularProduct: true } }
            );
        }

        res.json({ success: true, message: "Payment verified and order updated" });
    } catch (error) {
        console.error(error.message);
    }
};

const getPaymentDetails = async (req, res, next) => {
    try {
        const { orderId } = req.body;
        if (!req.session || !req.session.userId) {
            return res.status(403).json({ message: "User is not authenticated." });
        }

        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        if (order.userId.toString() !== req.session.userId) {
            return res.status(403).json({ success: false, message: "Unauthorized access to the order." });
        }

        const amount = order.totalPrice * 100;

        const razorpayOrder = await razorpayInstance.orders.create({
            amount: amount,
            currency: "INR",
            receipt: `receipt_order_${orderId}`,
            payment_capture: '1'
        });

        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        res.json({
            success: true,
            key_id: process.env.RAZORPAY_KEY_ID,
            amount: amount,
            currency: "INR",
            razorpayOrderId: razorpayOrder.id,
            orderId: order._id

        });
    } catch (error) {
        console.error(error)
    }
}
    

const loadOrderConfirm = async (req, res) => {
    try {
        const orderId = req.params.orderid;

        const order = await Order.findOne({ _id: orderId }).populate({
            path: 'orderedItems.productId',
            model: 'Product',
        });

        res.render('confirmOrder', { order: order })

    } catch (error) {
        console.log(error);

    }
}

const loadOrders = async (req, res) => {
    try {
        const user = req.session.user_id;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;

        const totalOrders = await Order.countDocuments({ userId: user });
        const totalPages = Math.ceil(totalOrders / limit);

        const order = await Order.find({ userId: user }).populate({
            path: 'orderedItems.productId',
            model: 'Product',
            select: 'name strapColor images',
            options: { retainNullValues: true }  
        })
        // .sort({orderDate: -1})
        .skip((page - 1) * limit)
        .limit(limit);
        

        res.render('orders', { order, user,currentPage: page,totalPages,limit })
        console.log(order.orderedItems[0])
    } catch (error) {
        console.error(error)
    }
}

const orderDetails = async (req, res) => {
    try {
        const orderId = req.params.order_id;
        const order = await Order.findOne({ _id: orderId }).populate({
            path: 'orderedItems.productId',
            model: 'Product',
        });

        res.render('orderDetails', { order })

    } catch (error) {

    }
}

const loadWallet = async(req,res) => {
    try {
        const user = req.session.user_id;
        const wallet = await Wallet.findOneAndUpdate(
            {userId: user},
            {$setOnInsert:{userId: user}},
            {new:true, upsert: true}
        )
        const userData = await User.findById(user)
        res.render('wallet',{userData,user,wallet})

    } catch (error) {
        console.error(error)
    }
}

const cancelOrder = async (req, res) => {
    try {
       
        const orderId = req.params.order_id;
        const productId = req.body.productId;

        const order = await Order.findById({ _id: orderId });
        if (!order) {
            return res.status(400).json({ message: 'Order not found!' })
        }

        const item = order.orderedItems.find(item => item.productId.toString() === productId);
        if (!item) {
            return res.status(400).json({ message: 'Item not found in the orders' })
        }

        if (item.orderStatus === 'Shipped' || item.orderStatus === 'Delivered') {
            return res.status(400).json({ message: 'Cancellation not possible !.Product already shipped' })
        }

        await Product.findByIdAndUpdate(
            productId,
            { $inc: { stock: item.quantity } },
        )
        item.orderStatus = 'Cancelled';
        await order.save();
        // return res.redirect('/cancel-confirm');
        // return res.status(400).json({ message: 'Request for cancellation confirmed' })

        if(order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Wallet'){
            const refundAmount = item.quantity * item.price;
            
            await Wallet.findOneAndUpdate(
                {userId: req.session.user_id},
                {$inc:{balance: refundAmount},
                $push:{
                    transactionHistory:{
                        amount: refundAmount,
                        type:'credit',
                        date: new Date(),
                        description: 'Order Payment - Razorpay/Wallet'
                    }
                }   
            },
            {new: true, upsert: true});
    }
    return res.status(200).json({message: 'Order cancelled successfully'})

    } catch (error) {
        console.log(error)
    }
}

const cancelConfirm = async(req,res) => {
    try {
        res.render('cancelOrderConfirm')
        
    } catch (error) {
        console.log(error)
    }
}


const requestReturn = async(req,res) => {
    try {
        const { orderId, productId, reason } = req.body;

        const order = await Order.findById({_id: orderId})
        const product = order.orderedItems.find(item => item.productId.toString() === productId)

        if(!order){
            return res.status(404).json({message: 'Order not found!'})
        }

        if(!product){
            return res.status(404).json({message: 'Product not found in the ordered list !'})
        }

        product.orderStatus = 'Return requested';
        product.returnReason = reason;
         

        await order.save();
        res.status(200).json({ message: 'Return request submitted successfully!' });

    } catch (error) {
        console.log(error)
    }
}




module.exports = {
    loadCheckout,
    placeOrder,
    verifyPayment,
    getPaymentDetails,
    loadOrderConfirm,
    loadOrders,
    orderDetails,
    cancelOrder,
    cancelConfirm,
    requestReturn,
    loadWallet,
}