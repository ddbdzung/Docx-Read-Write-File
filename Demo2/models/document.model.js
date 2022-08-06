const mongoose= require("mongoose")

const documentSchema= mongoose.Schema({
  filename: String,
  ext: String,
  path: String,
  pages: Number
}, {
  timestamps: false,
  versionKey: false
})

module.exports= mongoose.model("document", documentSchema)