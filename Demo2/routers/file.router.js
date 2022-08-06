const express= require("express")
const router= express.Router()
const asyncHandle= require("../middlewares/asyncHandle")
const {
  getAllDocument,
  uploadDocument,
  getAllSegment
}= require("../controllers/file.controller")


const multer= require("multer")
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads")
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname.split(".")[0] +".zip") //zip file upload
  }
})

const upload= multer({ storage: storage })

router
  .route("/document")
  .get(asyncHandle(getAllDocument))
  .post(upload.single("file"), asyncHandle(uploadDocument))

router
  .route("/segment")
  .get(asyncHandle(getAllSegment))
module.exports= router