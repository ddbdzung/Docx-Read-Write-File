const express= require("express")
const app= express()
const connectDB= require("./configs/database")
const router= require("./routers")

connectDB()
router(app)

app.listen(3000, ()=>{
  console.log("server run at port 3000")
})