const documentModel = require("../models/document.model")
const segmentModel = require("../models/segment.model")
const path = require('path')

const fs = require("fs")
const AdmZip = require("adm-zip")

const convertXMLToJson = require('xml-js')

const mapToArray = data => Array.isArray(data) ? data : [data];

const handleSavingSegment = (row) => {
  return new Promise((resolve) => {
    let newRow = row
    const text = row?.['w:t']?.['_text']
    if (text) {
      segmentModel.create({ text })
        .then((segment) => {
          newRow._attributes = newRow._attributes || {}
          newRow._attributes.key = segment._id.toString()
          return newRow
        })
        .then((newRow) => {
          resolve(newRow)
        })
    }
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

const handleParagraph = (promiseArrayOfRows) => {
  return new Promise((resolve, reject) => {
    Promise.all(promiseArrayOfRows)
      .then(rows => resolve(rows))
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
    // // console.log(documentJson)

    let document = documentJson['w:document'];

    let documentBody = document['w:body'];

    // Xử lý dọc <w:p> -> Tạo segment -> Gán key=segment._id
    let paragraphs = mapToArray(documentBody['w:p']);
    let promiseRowsOfParagraph = []
    for (let paragraph of paragraphs) {
      let tmp = handleRows(paragraph)
      promiseRowsOfParagraph.push(tmp)

      let rows = await (async function(promiseRowsOfParagraph) {
        for (let rowsPromise of promiseRowsOfParagraph) {
          const row = await rowsPromise
          return row
        }
      }(promiseRowsOfParagraph))
      paragraph['w:r'] = rows
    }

/*
    const tables = mapToArray(documentBody['w:tbl'])

    tables.forEach(table => {
      const tableRows = mapToArray(table['w:tr'])
      for (let tableRow of tableRows) {
        const tableColumnsInRow = mapToArray(tableRow['w:tc'])
        for (let tableColumn of tableColumnsInRow) {
          const paragraphs = mapToArray(tableColumn['w:p'])
          for (let paragraph of paragraphs) {
            const rows = mapToArray(paragraph['w:r']);
            for (const row of rows) {
              const textObject = row?.['w:t'];
              const text = textObject?._text
              if (text) {
                row._attributes = row._attributes || {}
                // console.log(text)
                segmentModel.create({
                  text,
                }).then(segment => {
                  // row._attributes = row._attributes || {}
                  let id = segment._id.toString()
                  row._attributes.key = id
                }).catch(e => {
                  // console.log(e)
                })
                // if (segment) {
                //   row._attributes = row._attributes || {}
                //   const id = segment._id.toString()
                //   row._attributes.key = id
                //   // console.log(`Id have just added into T:row: ${row._attributes.key}`)
                // }
              }
            }
          }
        }
      }
    })
    */
    // let err = fs.writeFileSync("./result/" + 'test' + ".json", JSON.stringify(documentJson), "utf-8")
    // if (err) {
    //   console.log("Ghi file loi: " + err)
    // } else {
    //   console.log("Ghi file thanh cong");
    // }
    return res.status(200).json({
      paragraphs,
    })
  }
}