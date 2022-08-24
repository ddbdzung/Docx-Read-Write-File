const express = require("express")
const router = express.Router()
const asyncHandle = require("../middlewares/asyncHandle")
const {
  getAllDocument,
  uploadDocument,
  getAllSegment
} = require("../controllers/file.controller")


const multer = require("multer")
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads")
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname.split(".")[0] + ".zip") //zip file upload
  }
})

const upload = multer({ storage: storage })

router
  .route("/document")
  // .get(asyncHandle(getAllDocument))
  // .post(upload.single("file"), asyncHandle(uploadDocument))
  .get(upload.single("file"), asyncHandle(uploadDocument))
// 1. Đổi file .docx thành .zip
// 2. Giải nén file zip vừa có được
// 3. Copy toàn bộ nội dung bên trong thư mục zip vừa giải vào thư mục Demo2/test/
// 4. Mở trình duyệt truy cập URL: localhost:3000/api/document để xem kết quả

// router
//   .route("/segment")
//   .get(asyncHandle(getAllSegment))
module.exports = router