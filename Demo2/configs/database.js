const mongoose= require("mongoose")
const conectDB= async()=>{
  try {
    const conn= await mongoose.connect("mongodb://localhost:27017/btvn2", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log("Connect DB success")
  } catch (error) {
    console.log("Connect fail: ", error)
  }
}

module.exports= conectDB