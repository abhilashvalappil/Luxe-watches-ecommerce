const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel')
const user_route = require('../../routes/userRoute');
const Cart = require('../../models/cartModel');
const mongoose = require('mongoose');
const Address = require('../../models/addressModel')
const Offer = require('../../models/offerModel');
const Order = require('../../models/orderModel');
const Wallet = require('../../models/walletModel');
const Coupon = require('../../models/couponModel');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { productFilter } = require('./shopController');
var easyinvoice = require('easyinvoice');
const InvoiceCounter = require('../../models/invoiceCounter');
const HttpStatus = require('../../js/httpStatus')
const MESSAGES  = require('../../constants/messages')

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY    
});


const loadCheckout = async (req, res) => {
  try {
    const user = req.session.user_id;
    const userData = await User.findOne({ _id: user });
    const address = await Address.findOne({ userId: user });
    const cart = await Cart.findOne({ userId: user });
    // const coupons = await Coupon.find();
    const today = new Date();
    const coupons = await Coupon.find({
      listed: true,
      validFrom: { $lte: today },
      validTo: { $gte: today }
    });

    const cartedProducts = [];

    if (cart && cart.cartItems.length > 0) {
      for (let i = 0; i < cart.cartItems.length; i++) {
        const item = cart.cartItems[i];
        const product = await Product.findById(item.productId).lean();

        if (product) {
          product.quantity = item.quantity;
          cartedProducts.push(product);
        }
      }
    }

    // ✅ Fetch only active offers
    const offers = await Offer.find({
      startDate: { $lte: new Date() },
      expiredate: { $gte: new Date() },
      status: true,
    });

    // Apply dynamic offers
    for (let product of cartedProducts) {
      const categoryId = product.category;

      // Find product offer
      const productOffer = offers.find(
        (offer) =>
          offer.offerType === "Product Offer" &&
          offer.product &&
          offer.product.equals(product._id)
      );

      // Find category offer
      const categoryOffer = offers.find(
        (offer) =>
          offer.offerType === "Category Offer" &&
          offer.category &&
          offer.category.equals(categoryId)
      );

      // Choose best discount
      const bestDiscount = Math.max(
        productOffer ? productOffer.discountPercent : 0,
        categoryOffer ? categoryOffer.discountPercent : 0
      );

      if (bestDiscount > 0) {
        product.offerPrice = product.price - (bestDiscount * product.price) / 100;
        product.offerPercent = bestDiscount;
      } else {
        product.offerPrice = product.price;
        product.offerPercent = 0;
      }
    }

    // ✅ Correct subtotal calculation
    const subtotal = cartedProducts.reduce((total, product) => {
      return total + product.offerPrice * product.quantity;
    }, 0);

    const coupon = req.session.coupon || null;
    const couponDiscount = coupon ? coupon.discount : 0;
    const couponCode = coupon ? coupon.code : "";

    const deliveryCharge = 60;
    const newTotal = subtotal - couponDiscount + deliveryCharge;

    if (cart.cartItems.length > 0) {
      res.render("checkout", {
        user,
        userData,
        address,
        cartedProducts,
        coupons,
        couponDiscount,
        newTotal,
        subtotal,
        deliveryCharge,
        couponCode,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
  }
};


const placeOrder = async (req, res) => {
    try {
        const user = req.session.user_id;
        let { addressId, paymentMethod, cartItems, totalAmount, couponCode , discount} = req.body;

        const cart = await Cart.findOne({ userId: user });
        const addresses = await Address.findOne({ userId: user });
        const selectedAddress = addresses.address.find(address => address._id.toString() === addressId);

        if (!selectedAddress) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Add address details!' });
        }

        if (!cartItems || cartItems.length === 0) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.CART_EMPTY });
        }

        let discountAmount = 0;
        if (couponCode) {
            const coupon = await Coupon.findOne({ couponCode: couponCode });
            if (coupon) {
                discountAmount = discount

                if (discountAmount > coupon.maxRedeemAmount) {
                    discountAmount = coupon.maxRedeemAmount;
                }

                req.session.coupon = {
                    couponCode: couponCode,
                    discount: discountAmount,
                    newTotal: totalAmount
                };
            } else {
                return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid coupon code!' });
            }
        }

        const offers = await Offer.find({
  startDate: { $lte: new Date() },
  expiredate: { $gte: new Date() },
  status: true
});

        const orderedItems = await Promise.all(cart.cartItems.map(async (item) => {
            const product = await Product.findById(item.productId);  
            // const actualPrice = product.price;  
            // const offerPrice = cartItems.find(cartItem => cartItem._id.toString() === item.productId.toString()).price;
            // const offerDiscount = actualPrice - offerPrice;  

            // const totalPrice = offerPrice * item.quantity;  

            // return {
            //     productId: item.productId,
            //     quantity: item.quantity,
            //     price: offerPrice,
            //     totalPrice: totalPrice,
            //     offerDiscount: offerDiscount, 
            //     orderStatus: 'Pending'
            // };
            const productOffer = offers.find(
      (o) => o.offerType === "Product Offer" && o.product && o.product.equals(product._id)
    );
    const categoryOffer = offers.find(
      (o) => o.offerType === "Category Offer" && o.category && o.category.equals(product.category)
    );

    const bestDiscount = Math.max(
      productOffer ? productOffer.discountPercent : 0,
      categoryOffer ? categoryOffer.discountPercent : 0
    );

    let finalPrice = product.price;
    if (bestDiscount > 0) {
      finalPrice = product.price - (bestDiscount * product.price) / 100;
    }

    return {
      productId: item.productId,
      quantity: item.quantity,
      price: finalPrice,                   // ✅ snapshot with offer applied
      totalPrice: finalPrice * item.quantity,
      offerDiscount: product.price - finalPrice,
      orderStatus: "Pending"
    };
        }));

        let finalTotalPrice = 0;
        for (const item of orderedItems) {
            finalTotalPrice += item.totalPrice;
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } }, { new: true });
        }

        const deliveryCharge = 60; 
        finalTotalPrice += deliveryCharge; 

        if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({ userId: user });
            if (!wallet || wallet.balance < finalTotalPrice) {
                return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.INSUFFICIENT_BALANCE });
            }
            wallet.balance -= finalTotalPrice;
            wallet.transactionHistory.push({
                amount: finalTotalPrice-discountAmount,
                type: 'debit',
                description: 'Order payment'
            });
            await wallet.save();
        }

        const order = new Order({
            userId: user,
            orderedItems: orderedItems,
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'Wallet' ? 'Completed' : 'Pending',
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
            totalPrice: finalTotalPrice - discountAmount,  
            couponCode: couponCode,
            discountAmount: discountAmount,
            invoiceNumber: Date.now()
        });
       
        if (paymentMethod === 'Razorpay') {
            const razorpayOrder = await razorpayInstance.orders.create({
                amount: order.totalPrice * 100,
                currency: 'INR',
                receipt: `receipt_order_${order._id}`,
                payment_capture: '1',
            });
            

            order.razorpayOrderId = razorpayOrder.id;
            await order.save();
            await Cart.deleteOne({ userId: user });

            req.session.coupon = null;

            return res.status(HttpStatus.OK).json({
                success: true,
                message: "Order created and ready for payment.",
                orderId: order._id,
                razorpayOrderId: razorpayOrder.id,
                amount: order.totalPrice * 100,
                key_id: process.env.RAZORPAY_KEY_ID
            });
        } else {
            await order.save();
            await Cart.deleteOne({ userId: user });
            req.session.coupon = null;
            return res.status(HttpStatus.OK).json({ success: true, message: 'Order placed successfully', orderId: order._id });
        }
    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};


const verifyPayment = async (req, res) => {
    const { paymentId, orderId, razorpaySignature } = req.body;
    try {
         const order = await Order.findById(orderId);
        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER_NOT_FOUND });
        }

        const data = `${order.razorpayOrderId}|${paymentId}`;
        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY);
        shasum.update(data);
        const digest = shasum.digest('hex');

        if (digest !== razorpaySignature) {
            order.paymentStatus = 'Failed';
            await order.save();
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Invalid signature provided" });
        }
         order.orderStatus = "Order confirmed";
        order.paymentStatus = 'Completed';
        await order.save();

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
        res.json({ success: true, message: MESSAGES.PAYMENT_VERIFIED_ORDER_UPDATED });
    } catch (error) {
        console.error(error.message);
    }
};

const getPaymentDetails = async (req, res, next) => {
    try {
        const { orderId } = req.body;
        if (!req.session || !req.session.userId) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: MESSAGES.NO_ACCESS });
        }

        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER_NOT_FOUND });
        }

        if (order.userId.toString() !== req.session.userId) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: MESSAGES.UNAUTHORIZED_ORDER_ACCESS });
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

const updatePaymentStatus = async(req,res) => {
    try {
        const { orderId, paymentStatus } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: MESSAGES.ORDER_NOT_FOUND });
        }

        order.paymentStatus = paymentStatus;
        order.orderStatus = paymentStatus === 'Failed' ? 'Failed' : order.orderStatus;  
        await order.save();
        res.status(HttpStatus.OK).json({ success: true, message: MESSAGES.PAYMENT_STATUS_UPDATED});
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
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
        .sort({orderDate: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();

        res.render('orders', { order, user,currentPage: page,totalPages,limit })
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
         console.error(error)
    }
}

const loadWallet = async(req,res) => {
    try {
        const user = req.session.user_id;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page -1 ) * limit;

        const wallet = await Wallet.findOneAndUpdate(
            {userId: user},
            {$setOnInsert:{userId: user}},
            {new:true, upsert: true}
        )

        const totalTransactions = wallet.transactionHistory.length;
        const totalPages = Math.ceil(totalTransactions / limit);
        const paginatedTransactions = wallet.transactionHistory
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(skip, skip + limit);

        const userData = await User.findById(user)
        res.render('wallet',{userData,
            user,
            wallet,
            transactions: paginatedTransactions,
            currentPage: page,
            totalPages
        });
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
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.ORDER_NOT_FOUND });
        }

        const item = order.orderedItems.find(item => item.productId.toString() === productId);
        if (!item) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: MESSAGES.ITEM_NOT_IN_ORDER });
        }

        if (item.orderStatus === 'Shipped' || item.orderStatus === 'Delivered') {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.CANCELLATION_NOT_POSSIBLE });
        }

        const totalItemsPrice = order.orderedItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const proportionalShare = item.totalPrice / totalItemsPrice;
        const discountForThisItem = proportionalShare * order.discountAmount;
        let refundAmount = item.totalPrice - discountForThisItem;  
 
        const remainingItems = order.orderedItems.filter(i => i.orderStatus !== 'Cancelled');
 
        if (remainingItems.length === 1) { 
            refundAmount += order.deliveryCharge;
        }
        refundAmount = Math.round(refundAmount);
        await Product.findByIdAndUpdate(productId, { $inc: { stock: item.quantity } });
 
        item.orderStatus = 'Cancelled';
        await order.save();

        if (order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Wallet') {
            await Wallet.findOneAndUpdate(
                { userId: req.session.user_id },
                {
                    $inc: { balance: refundAmount },
                    $push: {
                        transactionHistory: {
                            amount: refundAmount,
                            type: 'credit',
                            date: new Date(),
                            description: 'Order Cancellation Refund - Razorpay/Wallet'
                        }
                    }
                },
                { new: true, upsert: true }
            );
        }

        res.status(HttpStatus.OK).json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.log('Error cancelling order', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
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
            return res.status(HttpStatus.NOT_FOUND).json({message: MESSAGES.ORDER_NOT_FOUND})
        }
        if(!product){
            return res.status(HttpStatus.NOT_FOUND).json({message: MESSAGES.PRODUCT_NOT_IN_ORDERED_LIST})
        }

        product.orderStatus = 'Return requested';
        product.returnReason = reason;
        await order.save();
        res.status(HttpStatus.OK).json({ message:  MESSAGES.RETURN_REQUEST_SUBMITTED });
    } catch (error) {
        console.log(error)
    }
}

const retryPayment = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER_NOT_FOUND });
        }

        if (order.paymentMethod !== 'Razorpay' || order.paymentStatus === 'Completed') {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.PAYMENT_ALREADY_COMPLETED });
        }

        const razorpayOrder = await razorpayInstance.orders.create({
            amount: order.totalPrice * 100,
            currency: 'INR',
            receipt: `receipt_order_${order._id}`,
            payment_capture: '1'
        });

        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        res.status(HttpStatus.OK).json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: order.totalPrice * 100,
            key_id: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error retrying payment:', error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const downloadInvoice = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);    
        if (!order) {
            return res.status(404).send('Order not found');
        }

        //* Generate the invoice number 
        if (!order.invoiceNumber) {
            const currentYear = new Date(order.orderDate).getFullYear();
            order.invoiceNumber = await InvoiceCounter.getNextInvoiceNumber(currentYear);
            await order.save();
        }

        //* Fetch product details for each ordered item
        const orderedItemsWithDetails = await Promise.all(order.orderedItems.map(async (item) => {
            const product = await Product.findById(item.productId);
            return {
                quantity: item.quantity,
                description: product ? product.name : 'Unknown Product',
                price: item.price
            };
        }));
 
        const subtotal = orderedItemsWithDetails.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryCharge = order.deliveryCharge;
        const totalAmount = subtotal + deliveryCharge;

        const data = {
            apiKey: "free",  
            mode: "development",  
            images: {
                logo: "https://public.budgetinvoice.com/img/logo_en_original.png",
                background: "https://public.budgetinvoice.com/img/watermark-draft.jpg"
            },
            sender: {
                company: "Luxe Watches",
                address: "WestHill Calicut",
                zip: "450227",
                city: "Kerala",
                country: "India"
            },
            client: {
                company: order.address.Name,
                address: order.address.address,
                zip: order.address.PIN,
                city: order.address.city,
                country: order.address.state
            },
            information: {
                number: order.invoiceNumber,
                date: new Date(order.orderDate).toLocaleDateString(),
                // dueDate: new Date(new Date(order.orderDate).setDate(new Date(order.orderDate).getDate() + 15)).toLocaleDateString()
            },
            products: [
                ...orderedItemsWithDetails,
                {
                    quantity: 1,
                    description: "Delivery Charge",
                    price: deliveryCharge
                }
            ],
            bottomNotice: "Kindly pay your invoice if not paid.",
            settings: { currency: "INR" },
            totals: [
                { label: "Subtotal", amount: subtotal },
                { label: "Delivery Charge", amount: deliveryCharge },
                { label: "Total", amount: totalAmount }
            ]
        };

        easyinvoice.createInvoice(data, async (result) => {
            const pdfBuffer = Buffer.from(result.pdf, 'base64');
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=invoice-${order.invoiceNumber}.pdf`,
                'Content-Length': pdfBuffer.length
            });
            res.send(pdfBuffer);
        });    
    } catch (error) {
        console.error('Error while generating invoice:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal server error');
    }
};


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
    updatePaymentStatus,
    retryPayment,
    downloadInvoice
}