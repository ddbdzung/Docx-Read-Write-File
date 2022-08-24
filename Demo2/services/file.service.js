const segmentModel = require("../models/segment.model")
const mapToArray = data => Array.isArray(data) ? data : [data];
const { ApiError } = require('../utils/')
/**
 * Create a segment based on text
 * @param {String} text 
 * @returns {Promise<segment>} segment promise
 */
const createSegment = async text => {
  return segmentModel.create({ text })
}

/**
 * @param {Object} documentBody
 * @param {String} xmlTag | ['w:r', 'w:tbl']
 * @returns {Promise<Object>} Paragraphs - 'w:r' | Tables - 'w:tbl'
 */
const handleSegment = (documentBody, xmlTag) => {
  return new Promise(resolve => {
    if (xmlTag === 'w:p') {
      // paragraphs = Output
      let paragraphs = mapToArray(documentBody[xmlTag]) // Format paragraphs (in case there is only one paragraph => [paragraph])
      let segmentPromise = [] // Store segment promise array to solve in Promise.all
      let paragraphIdx = [] // Store index of paragraph which contains [w:r] property and _text exists
      for (let [idx, paragraph] of paragraphs.entries()) {
        let text = paragraph?.['w:r']?.['w:t']?.['_text']
        if (!text) {
          continue
        }

        // Indexing segment in json file
        paragraphIdx.push(idx)
        // Push promise segmentCreation into segmentPromise array waitting for Promise.all
        segmentPromise.push(createSegment(text))
      }

      // Now save text as segment into DB
      Promise.all(segmentPromise)
        .then(segments => {
          segments.forEach((segment, idx) => {
            let id = segment._id.toString()
            paragraphs[paragraphIdx[idx]]['w:r']._attributes = paragraphs[paragraphIdx[idx]]['w:r']._attributes || {}
            paragraphs[paragraphIdx[idx]]['w:r']._attributes.key = id
          })
          resolve(paragraphs)
        })
        .catch(() => reject('Internal Server Error'))
    }

    if (xmlTag === 'w:tbl') {
      // tables = Output
      let tables = mapToArray(documentBody[xmlTag])
      let segmentPromise = []
      let tableIdx = []
      let tableRowIdx = []
      let tableCellIdx = []
      let paragraphIdx = []

      for (let [tblIdx, table] of tables.entries()) {
        let tableRows = mapToArray(table['w:tr'])
        for (let [tblRowIdx, tableRow] of tableRows.entries()) {
          let tableCells = mapToArray(tableRow['w:tc'])
          for (let [tblCellIdx, tableCell] of tableCells.entries()) {
            let paragraphs = mapToArray(tableCell['w:p'])
            for (let [idx, paragraph] of paragraphs.entries()) {
              let text = paragraph?.['w:r']?.['w:t']?.['_text']
              if (!text) {
                continue
              }

              tableCellIdx.push(tblCellIdx)
              tableRowIdx.push(tblRowIdx)
              tableIdx.push(tblIdx)
              paragraphIdx.push(idx)

              // Push promise segmentCreation into segmentPromise array waitting for Promise.all
              segmentPromise.push(createSegment(text))
            }
          }
        }
      }

      // Now save text as segment into DB
      Promise.all(segmentPromise)
        .then(segments => {
            segments.forEach((segment, idx) => {
              let id = segment._id.toString()
              let tempTable = tables[tableIdx[idx]]
              let tempTableRows = tempTable['w:tr']
              let tempTableRow = tempTableRows[tableRowIdx[idx]]
              let tempTableCells = tempTableRow['w:tc']
              let tempTableCell = tempTableCells[tableCellIdx[idx]]
              let tempParagraphs = mapToArray(tempTableCell['w:p'])
              let tempParagraph = tempParagraphs[paragraphIdx[idx]]
              let tempRow = tempParagraph['w:r']
              tempRow._attributes = tempRow._attributes || {}
              tempRow._attributes.key = id
            })
            resolve(tables)
          })
        .catch(() => reject('Internal Server Error'))
    }
  })
}

/**
 * Handle a document object converted from xml docx file.
 * @param {Object} document Document object selected in xml fileService
 * @param {String} xmlTag 'w:p' paragraphs | 'w:tbl' tables
 * @returns {Promise<Document>} Paragraphs | Tables
 */
const handleDocument =  async (document, xmlTag) => {
  let documentBody = document?.['w:body']
  if (!documentBody) throw new Error('<w:body> not found in document')
  
  try {
    return handleSegment(documentBody, xmlTag)
  } catch (err) {
    throw new ApiError(err.message)
  }
}

module.exports = {
  handleDocument,
}