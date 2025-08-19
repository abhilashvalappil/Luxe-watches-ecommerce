const PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    NAME: /^[a-zA-Z\s'-]{3,50}$/,
    PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
    PHONE: /^[6-9]\d{9}$/,
    FULLNAME: /^[^\s][a-zA-Z]+(?: [a-zA-Z]+)*$/,
    ADDRESS: /^[A-Za-z0-9.,' -]{5,}$/,
    LOCALITY: /^[A-Za-z ]{5,}$/,
    LANDMARK: /^[A-Za-z ]{5,}$/,
    CITY: /^[A-Za-z ]{5,}$/,
    STATE: /^[A-Za-z ]{5,}$/,
    PINCODE: /^[0-9]{1,6}$/,
    
};

module.exports = PATTERNS;