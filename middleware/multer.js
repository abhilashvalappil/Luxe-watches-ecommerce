const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null,'public/uploadedImages')
    },
    filename:(req, file, cb) => {
        const ext = path.extname(file.originalname)
        const fileName = file.originalname.replace(ext, '')
        cb(null, `${fileName}-${Date.now()}${ext}`)
    },
})

const fileFilter = function( req, file, cb){
    const allowedTypes = ['image/jpeg','image/jpg','image/png'];

    if(allowedTypes.includes(file.mimetype)){
        return cb(null, true)
    }else{
        cb('Error: Only Images!');
    }
}

// const upload = multer({
//     storage: storage, 
//     limits: { fileSize: 1024 * 1024 * 5 },
//     fileFilter: fileFilter
//  }).fields([
//     {name: 'image1', maxCount: 1 },
//     {name: 'image2', maxCount: 1},
//     {name: 'image3', maxCount: 1}
//  ]);

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 // 5 MB limit per file
    }
}).array('images', 10);

const Upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5, // 5 MB limit per file
    },
    fileFilter: fileFilter,
}).fields([{ name: 'image1' }, { name: 'image2' }, { name: 'image3' }]);

module.exports = {upload,Upload}