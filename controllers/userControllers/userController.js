const User = require('../../models/userModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const session = require('express-session');
const otpGenerator = require('otp-generator');
const bodyParser = require('body-parser');
const Product = require('../../models/productModel');
const Address = require('../../models/addressModel');
const user_route = require('../../routes/userRoute');
const Cart = require('../../models/cartModel');
const Wallet = require('../../models/walletModel');
const mongoose = require('mongoose')
const HttpStatus = require('../../js/httpStatus')
const MESSAGES  = require('../../constants/messages')
const PATTERNS  = require('../../constants/patterns')
const { ObjectId } = require('mongodb');


const securePassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        console.log(error.message);
    }
}


const loadRegister = async (req, res) => {
    try {
        res.render('registration', { message: undefined });
    } catch (error) {
        console.log(error.message);
    }
}

function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 600000;
    console.log(expiry, "EXpiry time")
    return { otp, expiry };
}

const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword,refId } = req.body;

        const userExist = await User.findOne({ email: email });
        if (userExist) {
            return res.status(HttpStatus.CONFLICT).json({ success: false, message: MESSAGES.USER_ALREADY_EXISTS });
        }

        if (!name || !email || !phone || !password || !confirmPassword) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'All fields are required.' });
        }

        if (!PATTERNS.NAME.test(name)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.INVALID_NAME });
        }

        if (!PATTERNS.EMAIL.test(email)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.INVALID_EMAIL });
        }

        if (!PATTERNS.PHONE.test(phone)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.INVALID_PHONE_NUMBER });
        }

        if (!PATTERNS.PASSWORD.test(password)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.INVALID_PASSWORD });
        }

        if (password !== confirmPassword) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.PASSWORDS_DO_NOT_MATCH });
        }
        
        const spassword = await securePassword(password);
        req.session.userData = {
            name: name,
            email: email,
            phone: phone,
            password: spassword,
            refId:refId
        }

        const otpObj = generateOTP();

        req.session.otp = otpObj.otp;
        req.session.otpExpiry = otpObj.expiry;
        console.log(req.session.otp)

        await sendOtp(email, otpObj, res)
        return res.status(HttpStatus.OK).json({ success: true, message: MESSAGES.REGISTRATION_SUCCESS })
    } catch (error) {
        console.log(error.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const sendOtp = async (email, otpObj, res) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            host: "smtp.gmail.com",
            port: 587,
            secure: true,
            auth: {
                user: process.env.NODE_MAILER_EMAIL,
                pass: process.env.NODE_MAILER_PASS
            },
        });
        const mailOptions = {
            from: process.env.NODE_MAILER_EMAIL,
            to: email,
            subject: "For email verification",
            // text: `Hello,
            // Thank you for registering with LuxeWatches Ecom!
            // Your One-Time Password (OTP) is ${otp}. Please enter this code on the registration page to continue the process.
            // If you did not request this email, please ignore it.
            // Best regards,
            // The LuxeWatches Ecom Team`, // plain text body
            // html: `<p>Hello,</p>
            // <p>Thank you for registering with <strong>LuxeWatches Ecom</strong>!</p>
            // <p>Your One-Time Password (OTP) is <strong>${otp}</strong>. Please enter this code on the registration page to continue the process.</p>
            // <p>If you did not request this email, please ignore it.</p>
            // <p>Best regards,<br>The LuxeWatches Ecom Team</p>`, // html body

            text: `Hello , Thank you for registering with LuxeWatches Ecom! Your one-time password time is ${otpObj.otp} `
        }

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error });
            } else {
                res.redirect('/otp');
            }
        });
    } catch (error) {
        console.log(error.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const resendOtp = async (req, res) => {
    try {
        const email = req.session.userData.email;
        const otpObj = generateOTP();
        console.log(otpObj)
        req.session.otp = otpObj.otp;
        req.session.otpExpiry = otpObj.expiry;
        await sendOtp(email, otpObj, res)
        res.redirect('/otp');
    } catch (error) {
        console.log(error.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ messge: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const loadOtp = async (req, res) => {
    try {
        let isForgot;
        let email;
        if (req.session?.forgotOtpUser) {
            isForgot = true;
            email = req.session?.forgotOtpUser;
        } else if (req.session.userData?.email) {
            isForgot = false;
            email = req.session.userData?.email;
        }
        res.render('otp', { email, isForgot });
    } catch (error) {
        console.log(error.message);
    }
}

const verifyOtp = async (req, res) => {
    try {
        const enteredOtp = req.body;
        const otpExpiry = req.session.otpExpiry;
        const otp = req.session.otp;

        if (!otp || !otpExpiry) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.OTP_EXPIRED });
        }

        const now = new Date();

        if (now > otpExpiry) {
            delete req.session.otp;
            delete req.session.otpExpiry;
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.OTP_RESEND_REQUIRED })
        }
        if (req.session?.forgotOtpUser) {
            if (enteredOtp.otp == otp) {
                const { email } = req.session.forgotOtpUser;
                return res.status(HttpStatus.OK).json({ success: true, message: MESSAGES.OTP_VERIFIED_SUCCESS })
            }
        }
        if (enteredOtp.otp == otp) {
            const { name, email, phone, password ,refId} = req.session.userData;
            console.log('..........Referrer ID:............',refId);
            
            const newUser = new User({ name, email, phone, password });
            const referralId = newUser._id
            // const referralLink = `http://localhost:5000/register?refId=${newUser._id}`

            if (refId) {
                
                const referrer = await User.findById(refId)
                if(referrer){
                    const referralBonus = 100;  
                    const description = "Referral bonus";

                    let referrerWallet = await Wallet.findOne({ userId: referrer._id });
                    if (referrerWallet) {
                        referrerWallet = await Wallet.findOneAndUpdate(
                            { userId: referrer._id },
                            { 
                                $inc: {
                                     
                                     balance: referralBonus
                                     },  
                                $push: { 
                                    transactionHistory: { 
                                        amount: referralBonus,
                                         type: 'credit',
                                          date: new Date(),
                                           description
                                         } 
                                        }  
                            },
                            { new: true, useFindAndModify: false }  
                        );
                    } else {
                        referrerWallet = new Wallet({
                            userId: referrer._id,
                            balance: referralBonus, 
                            transactionHistory: [{
                                 amount: referralBonus, 
                                 type: 'credit', 
                                 date: new Date(),
                                  description
                                 }]  
                        });
        
                        await referrerWallet.save();  
                    }
                }
            } else {
                console.log('Referral ID does not exist.');
            }
            const referralLink = `http://localhost:5000/register?refId=${referralId}`;
            newUser.referralLink = referralLink;
            await newUser.save();

            delete req.session.otp;
            delete req.session.otpExpiry;
            delete req.session.userData;

            res.status(HttpStatus.OK).json({ success: true, message: 'OTP verified successfully.' })
        } else {
            res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.INVALID_OTP });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const loadLogin = async (req, res) => {
    try {
        res.render('login');
    } catch (error) {
        console.log(error.message);
    }
}

const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!PATTERNS.EMAIL.test(email)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.INVALID_EMAIL });
        }
       
        if (!PATTERNS.PASSWORD.test(password)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.INVALID_PASSWORD });
        }
        const userData = await User.findOne({ email: email });

        if (!userData) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "User not found!" });
        }

        if (userData.isBlocked === true) {
            return res.status(HttpStatus.FORBIDDEN).json({ success: false, message: MESSAGES.ACCOUNT_BLOCKED })
        }

        const passwordMatch = await bcrypt.compare(password, userData.password);
        if (!passwordMatch) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: MESSAGES.WRONG_PASSWORD })
        }
        req.session.user_id = userData._id;
        res.status(HttpStatus.OK).json({ success: true, message: MESSAGES.LOGIN_SUCCESS })
    } catch (error) {
        console.log(error.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR })
    }

}

const googleLogin = async (req, res) => {
    try {
        const username = req.user.displayName;
        const email = req.user.emails[0].value;
        const googleId = req.user.id;

        const user = await User.findOne({ email: email })
        if (user) {
            req.session.user_id = user._id;
            res.redirect('/home');
        } else {
            const newUser = new User({
                name: username,
                email: email,
                googleId: googleId,
                phone: '',
                password: '',
            })
            await newUser.save();
            req.session.user_id = newUser._id;
            res.redirect('/home')
        }
    } catch (error) {
        console.log(error.message)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'An error occurred during Google login. Please try again.' });
    }
}

const loadHomePage = async (req, res) => {
    try {
        const user = req?.session?.user_id;
        const products = await Product.find(
            {stock:{$gt:0}}).limit(8)

        if (!user) {
            return res.render('home', { user: null, products, title: 'home page' });
        } else {
            const userData = await User.findById({ _id: user });

            if (!userData) {
                return res.redirect('/login');
            } else {
                res.render('home', { user,products, title: 'home page' });
            }
        }

    } catch (error) {
        console.error('Error occured on loading home page',error)
    }
}

const logout = async (req, res) => {
    try {
        if (req.session.user_id) {
            req.session.destroy();
            return res.status(200).json({})
        }
        res.redirect('/home')
    }
    catch (err) {
        console.log(err)
    }
}

const loadProfile = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById({ _id: userId });
        res.render('userProfile', { user, title: 'profile' })
    } catch (error) {
        console.log(error)
    }
}

const loadEditProfile = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById({ _id: userId });
        res.render('editProfile', { user })
    } catch (error) {
        console.log(error)
    }
}

const editProfile = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { name, phone } = req.body;

        if (!PATTERNS.FULLNAME.test(name)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: MESSAGES.INVALID_NAME })
        }
        if (!PATTERNS.PHONE.test(phone)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: MESSAGES.INVALID_PHONE_NUMBER })
        }

        const userExist = await User.findById(userId);
        if (!userExist) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'User not found!' })
        }

        if (phone && userExist.phone !== phone) {
            const phoneExist = await User.findOne({ phone: phone });
            if (phoneExist) {
                return res.status(HttpStatus.CONFLICT).json({ success: false, message: MESSAGES.PHONE_ALREADY_EXISTS });
            }
        }

        const options = { new: true }
        const user = await User.findByIdAndUpdate(
            { _id: userId },
            {
                $set: {
                    name: req.body.name,
                    phone: req.body.phone
                }
            }, options);
        return res.status(HttpStatus.OK).json({ success: true, message: MESSAGES.PROFILE_UPDATED_SUCCESS })
    } catch (error) {
        console.error(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ sucess: false, message: MESSAGES.INTERNAL_SERVER_ERROR })
    }
}

const loadAddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById({ _id: userId });
        const addressDoc = await Address.findOne({ userId: userId }).exec();
        const addressData = addressDoc ? addressDoc.address : [];
        res.render('address', { user, addressData })
    } catch (error) {
        console.error(error);
    }
}

const addAddress = async (req, res) => {
    try {
        const user = req.session.user_id;
        const { name, phone, locality, landmark, city, state, address, addresstype, pincode } = req.body;

        const errors = {};

        if (!PATTERNS.FULLNAME.test(name)) {
            errors.name = MESSAGES.INVALID_NAME;
        }
        if (!PATTERNS.PHONE.test(phone)) {
            errors.phone = MESSAGES.INVALID_PHONE_NUMBER;
        }
        if (!PATTERNS.ADDRESS.test(address)) {
            errors.address = MESSAGES.ADDRESS_VALIDATION_ERROR;
        }
        if (!PATTERNS.LOCALITY.test(locality)) {
            errors.locality = MESSAGES.LOCALITY_VALIDATION_ERROR;
        }
        if (!PATTERNS.LANDMARK.test(landmark)) {
            errors.landmark = MESSAGES.LANDMARK_VALIDATION_ERROR;
        }
        if (!PATTERNS.CITY.test(city)) {
            errors.city = MESSAGES.CITY_VALIDATION_ERROR;
        }
        if (!PATTERNS.STATE.test(state)) {
            errors.state = MESSAGES.STATE_VALIDATION_ERROR;
        }
        if (!PATTERNS.PINCODE.test(pincode)) {
            errors.pincode = MESSAGES.PINCODE_VALIDATION_ERROR;
        }

        if (Object.keys(errors).length > 0) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, errors });
        }

        const newAddress = {
            name: name,
            phone: phone,
            locality: locality,
            landmark: landmark,
            city: city,
            state: state,
            address: address,
            addressType: addresstype,
            pincode: pincode
        }

        const addressExist = await Address.findOne({ userId: user });

        if (addressExist) {
            const pushAddress = await Address.findOneAndUpdate(
                { userId: user },
                { $push: { address: newAddress } },
                { new: true }
            )
            if (pushAddress) {
                return res.status(HttpStatus.OK).json({ success: true, message: MESSAGES.ADDRESS_ADDED_SUCCESS })
            } else {
                return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Failed to add address. Try Again!" })
            }
        }
        else {
            const insertAddress = await Address.create({
                userId: user,
                address: [newAddress]
            })

            if (insertAddress) {
                return res.status(HttpStatus.OK).json({ success: true, message: MESSAGES.ADDRESS_ADDED_SUCCESS })
            } else {
                return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Failed try Again!" })
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR })
    }
}


const editAddress = async (req, res) => {
    try {
        const user = req.session.user_id;
        const { id, name, phone, locality, landmark, city, state, address, addressType, pincode } = req.body;

        const addressExist = await Address.findOne({ userId: user });
        const addressToUpdate = addressExist.address.find(addr => addr._id.toString() === id);

        if (addressToUpdate) {

            if (!PATTERNS.FULLNAME.test(name) || name.length < 4) {
                return res.status(HttpStatus.BAD_REQUEST).json({ error: MESSAGES.INVALID_NAME});
            }
            if (!PATTERNS.PHONE.test(phone)) {
                return res.status(HttpStatus.BAD_REQUEST).json({ error: MESSAGES.INVALID_PHONE_NUMBER });
            }
            if (!PATTERNS.ADDRESS.test(address)) {
                return res.status(HttpStatus.BAD_REQUEST).json({ error: MESSAGES.ADDRESS_VALIDATION_ERROR });
            }
            if (!PATTERNS.LOCALITY.test(locality)) {
                return res.status(HttpStatus.BAD_REQUEST).json({ error: MESSAGES.LOCALITY_VALIDATION_ERROR });
            }
            if (!PATTERNS.LANDMARK.test(landmark)) {
                return res.status(HttpStatus.BAD_REQUEST).json({ error: MESSAGES.LANDMARK_VALIDATION_ERROR });
            }
            if (!PATTERNS.CITY.test(city)) {
                return res.status(HttpStatus.BAD_REQUEST).json({ error: MESSAGES.CITY_VALIDATION_ERROR });
            }
            if (!PATTERNS.STATE.test(state)) {
                return res.status(HttpStatus.BAD_REQUEST).json({ error: MESSAGES.STATE_VALIDATION_ERROR });
            }
            if (!PATTERNS.PINCODE.test(pincode)) {
                return res.status(HttpStatus.BAD_REQUEST).json({ error: MESSAGES.PINCODE_VALIDATION_ERROR});
            }

            await Address.updateOne(
                { userId: user },
                { $pull: { address: { _id: id } } }
            );

            await Address.updateOne(
                { userId: user },
                {
                    $push: {
                        address: {
                            _id: id,
                            name,
                            phone,
                            pincode,
                            locality,
                            address,
                            city,
                            state,
                            landmark,
                            addressType
                        }
                    }
                }
            );

            return res.status(HttpStatus.OK).json({ success: true, message: "Address updated successfully!" });
        } else {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Address not found, try again!" });
        }
    } catch (error) {
        console.error(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR});
    }
};

const deleteAddress = async (req, res) => {
    try {
        const user = req.session.user_id;
        const address_obj_id = req.body.addressId;

        const userObjectId = new mongoose.Types.ObjectId(user);
        const addressObjectId = new mongoose.Types.ObjectId(address_obj_id);

        const out = await Address.updateOne(
            { userId: userObjectId },
            { $pull: { address: { _id: addressObjectId } } },
            { new: true }
        );

        if (out) {
            return res.status(HttpStatus.OK).json({ success: true, message: 'Address deleted successfully' });
        } else {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Address deletion failed. Try Again !' })
        }
    } catch (error) {
        console.log(error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR })
    }

}

const forgotPasswordLoad = async (req, res) => {
    try {
        res.render('forgotpassword')
    } catch (error) {
        console.log(error)
    }
}

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const userData = await User.findOne({ email });

        if (!userData) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'User not found!' });
        }

        if (userData.isBlocked === true) {
            return res.status(HttpStatus.FORBIDDEN).json({ success: false, message: MESSAGES.ACCOUNT_BLOCKED})
        }

        const otpObj = generateOTP();
        console.log(otpObj)
        req.session.otp = otpObj.otp;
        req.session.otpExpiry = otpObj.expiry;
        req.session.forgotOtpUser = email;
        await sendOtp(email, otpObj, res)
        return res.status(HttpStatus.OK).json({ success: true, message: "OTP sent successfully" })
    } catch (error) {
        console.log("for pass", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const resetPasswordLoad = async(req,res) => {
    try {
        res.render('resetPassword')
    } catch (error) {
        console.log(error)
    }
}

const resetPassword = async(req,res) => {
    try {
        email = req.session?.forgotOtpUser;
        const { password, confirmPassword } = req.body;
        const hashedPassword = await securePassword(password)
        const userData = await User.findOne({email});
        
        if(!userData){
            return res.status(HttpStatus.NOT_FOUND).json({success: false, message: 'User not found !'})
        }

        if(userData){
        await User.findOneAndUpdate(
            { email: email },
            { password: hashedPassword },
            { new: true }
        );
        return res.status(HttpStatus.OK).json({success: true, message: 'Password reset successfully'})
    }else{
        return res.status(HttpStatus.BAD_REQUEST).json({success: false, message: 'Password reset failed'})
    }
    } catch (error) {
        console.error(error)
    }
}


module.exports = {
    loadRegister,
    registerUser,
    sendOtp,
    resendOtp,
    loadOtp,
    verifyOtp,
    loadLogin,
    verifyLogin,
    loadHomePage,
    logout,
    googleLogin,
    loadProfile,
    loadEditProfile,
    editProfile,
    loadAddress,
    addAddress,
    editAddress,
    deleteAddress,
    forgotPasswordLoad,
    forgotPassword,
    resetPasswordLoad,
    resetPassword,
    
}



