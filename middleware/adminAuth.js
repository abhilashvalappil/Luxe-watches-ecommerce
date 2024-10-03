

const isLogin = async (req, res, next) => {
    try {
        if (req.session && req.session.admin_id) {
            next();
        } else {
            res.redirect('/admin');
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
}

const isLogout = async (req, res, next) => {
    try {
        if (req.session && req.session.admin_id) {
            res.redirect('/admin/home');
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
    isLogout
}
