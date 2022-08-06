const documentModel= require("../models/document.model")
const segmentModel= require("../models/segment.model")


const fs= require("fs")
const AdmZip= require("adm-zip")

const convertXMLToJson= require('xml-js')

module.exports= {
  getAllDocument: async(req, res, next)=>{
    return res.status(200).json(await documentModel.find())
  },
  getAllSegment: async(req, res, next)=>{
    return res.status(200).json(await segmentModel.find().populate("document_id"))
  },
  uploadDocument: async(req, res, next)=>{
    let fileUpload= req.file

    //unzip
    let unzip= new AdmZip(fileUpload.path)
    let filePath= "../unzip/"+fileUpload.originalname.split(".")[0]
    unzip.extractAllTo(filePath, true)
  
    //read file xml 
    let documentBuffer= fs.readFileSync(filePath+ "/word/document.xml")
    let docPropBuffer= fs.readFileSync(filePath+ "/docProps/app.xml")
    //convert xml to json
    let documentJson= JSON.parse(convertXMLToJson.xml2json(documentBuffer, {compact: true, spaces: 4}))
    let docPropsJson= JSON.parse(convertXMLToJson.xml2json(docPropBuffer, {compact: true, spaces: 4}))
  
    // write result to file json 
    let err = fs.writeFileSync("./result/"+ fileUpload.originalname.split(".")[0]+ ".json", JSON.stringify(documentJson), "utf-8")
    if (err){
      console.log("Ghi file loi: "+ err)
    }else {
      console.log("Ghi file thanh cong");
    }

    //create document
    let originalname= fileUpload.originalname.split(".")
    let document= {
      filename: originalname[0],
      ext: originalname[1],
      path: fileUpload.path,
      pages: docPropsJson?.Properties?.Pages?._text
    }

    let newDoc= await documentModel.create(document)
    // create segment
    for(let p of documentJson?.["w:document"]?.["w:body"]?.["w:p"]){
      let item= p?.["w:r"]
      if (item?.["w:t"]){
        let props= item?.["w:rPr"];
        await segmentModel.create({
          document_id: newDoc._id,
          text: item["w:t"]["_text"],
          bold: props? !!props["w:b"]: false,
          underline: props? !!props["w:u"]:false,
          strike: props? !!props["w:strike"]:false,
          italic: props? !!props["w:i"]:false
        })
      }
    }

    res.status(200).json({
      document: newDoc,
      segment: await segmentModel.find({document_id: newDoc._id})
    })
  }
}