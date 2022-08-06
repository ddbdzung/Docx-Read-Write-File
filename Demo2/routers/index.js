const documentRouter= require("./file.router")

module.exports= (app)=>{
  app.use("/api", documentRouter)

  app.use("*", async(req, res, next)=>{
    res.json({
      statusCode: 404,
      message: "not found"
    })
  })
}