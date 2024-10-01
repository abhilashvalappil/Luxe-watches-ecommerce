const User = require('../models/userModel');

// const isLogin = async (req, res, next) => {
//     try {
//         if (req.session && req.session.user_id) {
//             next();
//         } else {
//             res.redirect('/login');
//         }
//     } catch (error) {
//         console.error(error.message);
//         res.status(500).send('Internal Server Error');
//     }
// }
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
                        // res.status(403).json({
                        //     status: 'error',
                        //     message: 'Your account has been blocked. Please contact the administrator.',
                        //     blocked: true
                        // });
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
}
