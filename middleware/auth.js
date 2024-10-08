const User = require('../models/userModel');

const isLoggedin = async (req, res, next) => {
    try {
        if (req.session && req.session.user_id) {
            next();
        } else {
            console.log('hrlllllllllllllll')
          return  res.json({ success:false });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
}
const isLogin = async (req, res, next) => {
    try {
        if (req.session && req.session.user_id) {
            // if (User) {
                const user = await User.findById(req.session.user_id);
                if (user && user.isBlocked) {
                    req.session.destroy((err) => {
                        if (err) {
                            console.error('Error destroying session:', err);
                        }
                        res.render('userBlock')
                    });
                    return;
                }
            // }
            next();
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};


const isLogout = async (req, res, next) => {
    try {
        if (req.session && req.session.user_id) {
            res.redirect('/home');
        } else {
            next();
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
}

 

module.exports = {
    isLogin,
    isLogout,
    isLoggedin
}
