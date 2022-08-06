const mongoose= require("mongoose")

const segmentSchema= mongoose.Schema({
  document_id: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "document",
  },
  text: String,
  bold: {
    type: Boolean,
    default: false
  },
  underline: {
    type: Boolean,
    default: false
  },
  strike: {
    type: Boolean,
    default: false
  },
  italic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: false,
  versionKey: false
})

module.exports= mongoose.model("segment", segmentSchema)