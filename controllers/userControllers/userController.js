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
const mongoose = require('mongoose')
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
        const { name, email, phone, password, confirmPassword } = req.body;

        const userExist = await User.findOne({ email: email });
        if (userExist) {
            return res.status(400).json({ success: false, message: "User already exist" });
        }

        if (!name || !email || !phone || !password || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const namePattern = /^[a-zA-Z\s'-]{3,50}$/;
        if (!namePattern.test(name)) {
            return res.status(400).json({ message: 'Name must be 3-50 characters long and can contain letters, spaces, hyphens, and apostrophes.' });
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ message: 'Invalid email address.' });
        }

        const phonePattern = /^[6-9]\d{9}$/;
        if (!phonePattern.test(phone)) {
            return res.status(400).json({ message: 'Invalid phone number. It should be 10 digits.' });
        }

        const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordPattern.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long and contain at least one letter and one number.' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match.' });
        }

        const spassword = await securePassword(password);
        req.session.userData = {
            name: name,
            email: email,
            phone: phone,
            password: spassword,
        }

        const otpObj = generateOTP();

        req.session.otp = otpObj.otp;
        req.session.otpExpiry = otpObj.expiry;
        console.log(req.session.otp)

        await sendOtp(email, otpObj, res)

        return res.status(200).json({ success: true, message: 'Registration successful. Please verify your email' })

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
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
                res.status(500).json({ message: error });
            } else {
                //req.session.otp = otpObj.otp;
                //req.session.otpExpiry = otpObj.expiry;
                res.redirect('/otp');
            }
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'An error occurred. Please try again.' });
    }
}



const resendOtp = async (req, res) => {
    try {

        const email = req.session.userData.email;
        const otpObj = generateOTP();
        console.log(otpObj)
        //delete req.session.otp;
        req.session.otp = otpObj.otp;
        req.session.otpExpiry = otpObj.expiry;

        await sendOtp(email, otpObj, res)
        res.redirect('/otp');
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ messge: 'An error occurred. Please try again.' });
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
            return res.status(400).json({ success: false, message: 'OTP Expired. Please try again.' });
        }

        const now = new Date();

        if (now > otpExpiry) {
            delete req.session.otp;
            delete req.session.otpExpiry;
            return res.status(400).json({ success: false, message: 'OTP expired. Please resend OTP.' })
        }
        if (req.session?.forgotOtpUser) {
            if (enteredOtp.otp == otp) {
                const { email } = req.session.forgotOtpUser;
                return res.status(200).json({ success: true, message: 'OTP verified successfully. Registration completed' })
            }
        }
        if (enteredOtp.otp == otp) {
            const { name, email, phone, password } = req.session.userData;
            const newUser = new User({ name, email, phone, password });
            await newUser.save();

            delete req.session.otp;
            delete req.session.otpExpiry;
            delete req.session.userData;

            res.status(200).json({ success: true, message: 'OTP verified successfully.' })
        } else {
            res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
        }

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ message: 'Server error. Please try again' });
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

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email address.' });
        }
        const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordPattern.test(password)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long and contain at least one letter and one number.' });
        }
        const userData = await User.findOne({ email: email });

        if (!userData) {
            return res.status(400).json({ success: false, message: "User not found!" });
        }


        if (userData.isBlocked === true) {
            return res.status(400).json({ success: false, message: "Your account has been blocked." })
        }


        const passwordMatch = await bcrypt.compare(password, userData.password);
        if (!passwordMatch) {
            return res.status(400).json({ success: false, message: "Invalid Password!" })
        }
        req.session.user_id = userData._id;
        res.status(200).json({ success: true, message: 'login success' })

    } catch (error) {
        console.log(error.message);
        res.status(400).json({ message: "Internal server error!" })
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
        res.status(500).json({ success: false, message: 'An error occurred during Google login. Please try again.' });
    }
}


const loadHomePage = async (req, res) => {
    try {

        const user = req?.session?.user_id;
        if (!user) {
            return res.render('home', { user });
        } else {
            const userData = await User.findById({ _id: user });

            if (!userData) {
                return res.redirect('/login');
            } else {


                res.render('home', { user, title: 'home page' });
            }
        }

    } catch (error) {
        console.log(error.message);
    }
}

const logout = async (req, res) => {
    try {
        if (req.session.user_id) {
            delete req.session.user_id;
            res.status(200).json({})
        }
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

    }
}

const editProfile = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { name, phone } = req.body;


        const fullNameRegex = /^[^\s][a-zA-Z]+(?: [a-zA-Z]+)*$/;
        const phoneRegex = /^[6-9]\d{9}$/;

        if (!fullNameRegex.test(name)) {
            return res.status(400).json({ error: "Enter a valid name!" })
        }
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ error: "Invalid phone number!" })
        }

        const userExist = await User.findById(userId);
        if (!userExist) {
            return res.status(400).json({ success: false, message: 'User not found!' })
        }

        if (phone && userExist.phone !== phone) {
            const phoneExist = await User.findOne({ phone: phone });
            if (phoneExist) {
                return res.status(400).json({ success: false, message: 'Phone number already exists!' });
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
        return res.status(200).json({ success: true, message: 'Profile updated successfully' })

    } catch (error) {
        console.error(error);
        return res.status(400).json({ sucess: false, message: 'An unexpected error occured !' })
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

    }
}

const addAddress = async (req, res) => {
    try {
        const user = req.session.user_id;
        const { name, phone, locality, landmark, city, state, address, addresstype, pincode } = req.body;

        const nameRegex = /^[^\s][a-zA-Z\s]*[^\s]$/;
        const phoneRegex = /^[6-9]\d{9}$/;
        const addressRegex = /^[A-Za-z0-9.,' -]{5,}$/;
        const localityRegex = /^[A-Za-z ]{5,}$/;
        const landmarkRegex = /^[A-Za-z ]{5,}$/;
        const cityRegex = /^[A-Za-z ]{5,}$/;
        const stateRegex = /^[A-Za-z ]{5,}$/;
        const pincodeRegex = /^[0-9]{1,6}$/;

        if (!nameRegex.test(name) || name.length < 4) {
            return res.status(400).json({ error: "Input validation failed !" })
        }
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ error: "Input validation failed !" })
        }
        if (!addressRegex.test(address)) {
            return res.status(400).json({ error: "Input validation failed !" })
        }
        if (!localityRegex.test(locality)) {
            return res.status(400).json({ error: "Input validation failed !" })
        }
        if (!landmarkRegex.test(landmark)) {
            return res.status(400).json({ error: "Input validation failed !" })
        }
        if (!cityRegex.test(city)) {
            return res.status(400).json({ error: "Input validation failed !" })
        }
        if (!stateRegex.test(state)) {
            return res.status(400).json({ error: "Input validation failed !" })
        }
        if (!pincodeRegex.test(pincode)) {
            return res.status(400).json({ error: "Input validation failed !" })
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
                return res.status(200).json({ success: true, message: "Address added successfully" })
            } else {
                return res.status(400).json({ success: false, message: "Failed to add address. Try Again!" })
            }
        }
        else {
            const insertAddress = await Address.create({
                userId: user,
                address: [newAddress]
            })

            if (insertAddress) {
                return res.status(200).json({ success: true, message: "Address added successfully" })
            } else {
                return res.status(400).json({ success: false, message: "Failed try Again!" })
            }
        }


    } catch (error) {
        console.log(error);
        return res.status(400).json({ success: false, message: "An error occured!" })
    }
}


const editAddress = async (req, res) => {
    try {

        const user = req.session.user_id;
        const { id, name, phone, locality, landmark, city, state, address, addressType, pincode } = req.body;

        const addressExist = await Address.findOne({ userId: user });

        const addressToUpdate = addressExist.address.find(addr => addr._id.toString() === id);

        if (addressToUpdate) {
            const nameRegex = /^[^\s][a-zA-Z\s]*[^\s]$/;
            const phoneRegex = /^[6-9]\d{9}$/;
            const addressRegex = /^[A-Za-z0-9.,' -]{5,}$/;
            const localityRegex = /^[A-Za-z ]{5,}$/;
            const landmarkRegex = /^[A-Za-z ]{5,}$/;
            const cityRegex = /^[A-Za-z ]{5,}$/;
            const stateRegex = /^[A-Za-z ]{5,}$/;
            const pincodeRegex = /^[0-9]{1,6}$/;

            if (!nameRegex.test(name) || name.length < 4) {
                return res.status(400).json({ error: "Input validation failed !" });
            }
            if (!phoneRegex.test(phone)) {
                return res.status(400).json({ error: "Input validation failed !" });
            }
            if (!addressRegex.test(address)) {
                return res.status(400).json({ error: "Input validation failed !" });
            }
            if (!localityRegex.test(locality)) {
                return res.status(400).json({ error: "Input validation failed !" });
            }
            if (!landmarkRegex.test(landmark)) {
                return res.status(400).json({ error: "Input validation failed !" });
            }
            if (!cityRegex.test(city)) {
                return res.status(400).json({ error: "Input validation failed !" });
            }
            if (!stateRegex.test(state)) {
                return res.status(400).json({ error: "Input validation failed !" });
            }
            if (!pincodeRegex.test(pincode)) {
                return res.status(400).json({ error: "Input validation failed !" });
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

            return res.status(200).json({ success: true, message: "Address updated successfully!" });
        } else {
            return res.status(400).json({ success: false, message: "Address not found, try again!" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error!" });
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
            return res.status(200).json({ success: true, message: 'Address deleted successfully' });
        } else {
            return res.status(400).json({ success: false, message: 'Address deletion failed. Try Again !' })
        }
    } catch (error) {
        console.log(error)
        return res.status(400).json({ success: false, message: 'Internal sever error !' })
    }

}


const loadWishlist = async (req, res) => {
    try {
        const user = req?.session?.user_id;

        res.render('wishlist', { user })
    } catch (error) {

    }
}

const forgotPasswordLoad = async (req, res) => {
    try {
        res.render('forgotpassword')
    } catch (error) {

    }
}

const forgotPassword = async (req, res) => {
    try {

        const { email } = req.body;
        const userData = await User.findOne({ email });
        console.log(email);

        if (!userData) {
            return res.status(400).json({ success: false, message: 'User not found!' });
        }

        if (userData.isBlocked === true) {
            return res.status(400).json({ success: false, message: "Your account has been blocked." })
        }

        const otpObj = generateOTP();
        console.log(otpObj)
        req.session.otp = otpObj.otp;
        req.session.otpExpiry = otpObj.expiry;
        req.session.forgotOtpUser = email;
        await sendOtp(email, otpObj, res)
        return res.status(200).json({ success: true, message: "OTP sent successfully" })

    } catch (error) {
        console.log("for pass", error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}

const resetPasswordLoad = async(req,res) => {
    try {
        res.render('resetPassword')
    } catch (error) {
        
    }
}

const resetPassword = async(req,res) => {
    try {
        email = req.session?.forgotOtpUser;
        const { password, confirmPassword } = req.body;
        const hashedPassword = await securePassword(password)
        const userData = await User.findOne({email});
        
        if(!userData){
            return res.status(400).json({success: false, message: 'User not found !'})
        }

        if(userData){
        await User.findOneAndUpdate(
            { email: email },
            { password: hashedPassword },
            { new: true }
        );
        return res.status(200).json({success: true, message: 'Password reset successfully'})
    }else{
        return res.status(400).json({success: false, message: 'Password reset failed'})
    }

    } catch (error) {
        console.log(error)
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
    loadWishlist,
    editAddress,
    deleteAddress,
    forgotPasswordLoad,
    forgotPassword,
    resetPasswordLoad,
    resetPassword,

}



