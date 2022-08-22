const documentModel = require("../models/document.model")
const segmentModel = require("../models/segment.model")
const path = require('path')
const { fileService } = require('../services')

const fs = require("fs")
const AdmZip = require("adm-zip")

const convertXMLToJson = require('xml-js')

const mapToArray = data => Array.isArray(data) ? data : [data];

const handleSavingSegment = (row) => {
  return new Promise(resolve => {
    // Khởi tạo row mới với deep copy
    let newRow = JSON.parse(JSON.stringify(row))
    // Chỉ lấy mình text
    const text = row?.['w:t']?.['_text']
    // Nếu không có text trả về row ban đầu
    if (!text) return resolve(row)

    // Nếu có text => Trả về row mới có gắn ID của segment
    segmentModel.create({ text })
      .then(segment => {
        newRow._attributes = newRow._attributes || {}
        newRow._attributes.key = segment._id.toString()
        return resolve(newRow)
      })
  })
}
// Return promise array of rows
const handleRows = (paragraph) => {
  return new Promise(resolve => {
    if (paragraph.hasOwnProperty('w:r')) {
      let rows = mapToArray(paragraph['w:r'])
      paragraph['w:r'] = []
      rows.map(row => {
        let tmp = handleSavingSegment(row)
        paragraph['w:r'].push(tmp)
      })
      Promise.all(paragraph['w:r'])
        .then(rows => resolve(rows))
    }
  })
}

module.exports = {
  getAllDocument: async (req, res, next) => {
    return res.status(200).json(await documentModel.find())
  },
  getAllSegment: async (req, res, next) => {
    return res.status(200).json(await segmentModel.find().populate("document_id"))
  },
  uploadDocument: async (req, res, next) => {
    // let fileUpload= req.file

    // //unzip
    // let unzip= new AdmZip(fileUpload.path)
    // let filePath= "../unzip/"+fileUpload.originalname.split(".")[0]
    // unzip.extractAllTo(filePath, true)

    //read file xml in fixed path
    // let documentBuffer= fs.readFileSync("/test/word/document.xml")
    let documentBuffer = fs.readFileSync(`${path.join(__dirname, '..', 'test', 'word')}\\document.xml`)
    // console.log(`${path.join(__dirname, '..', 'test', 'word')}\\document.xml`)
    // let docPropBuffer= fs.readFileSync("/test/docProps/app.xml")
    let docPropBuffer = fs.readFileSync(`${path.join(__dirname, '..', 'test', 'docProps')}\\app.xml`)
    //convert xml to json
    let documentJson = JSON.parse(convertXMLToJson.xml2json(documentBuffer, { compact: true, spaces: 4 }))
    let docPropsJson = JSON.parse(convertXMLToJson.xml2json(docPropBuffer, { compact: true, spaces: 4 }))

    // // write result to file json 
    // let err = fs.writeFileSync("./result/" + 'BM04' + ".json", JSON.stringify(documentJson), "utf-8")
    // if (err) {
    //   console.log("Ghi file loi: " + err)
    // } else {
    //   console.log("Ghi file thanh cong");
    // }
    // //create document
    // let originalname= fileUpload.originalname.split(".")
    // // let document= {
    //   // filename: originalname[0],
    //   // ext: originalname[1],
    //   // path: fileUpload.path,
    //   // pages: docPropsJson?.Properties?.Pages?._text
    // // }
    // // let newDoc= await documentModel.create(document)

    let document = documentJson['w:document'];

    let paragraphs = await fileService.handleDocument(document, 'w:p')
    let tables = await fileService.handleDocument(document, 'w:tbl')

    return res.status(200).json({
      document
    })
  }
}