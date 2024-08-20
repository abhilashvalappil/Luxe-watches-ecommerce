const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();


passport.serializeUser((user,done) => {
    done(null, user);
})

passport.deserializeUser((user,done) => {
    done(null, user)
})
 

passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL:'http://localhost:5000/auth/google/callback',
    passReqToCallback:true
},function(request, accessToken, refreshToken, profile, done){
    return done(null,profile)
}
));

 