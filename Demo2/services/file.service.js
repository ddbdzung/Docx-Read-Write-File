const segmentModel = require("../models/segment.model")
const mapToArray = data => Array.isArray(data) ? data : [data];

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
      paragraphs = paragraphs.map((paragraph, idx) => {
        // If paragraph contains no <w:r> => No text => Return synchronously
        if (!paragraph.hasOwnProperty('w:r')) {
          return paragraph
        } 
  
        let row = paragraph['w:r']
        // If row has <w:t> and inside <w:t> row has text and text is not blank => Save segment
        if (row.hasOwnProperty('w:t') 
        && row['w:t'].hasOwnProperty('_text') 
        && row['w:t']['_text']) {
          paragraphIdx.push(idx)
          let text = row['w:t']['_text']

          // Push promise segmentCreation into segmentPromise array waitting for Promise.all
          segmentPromise.push(createSegment(text))
          return paragraph
        } else {
          // Otherwise => Return synchronously
          return paragraph
        }
      })

      // Now save text as segment into DB
      Promise.all(segmentPromise)
        .then(segments => {
          segments.forEach((segment, idx) => {
            let id = segment._id.toString()
            paragraphs[paragraphIdx[idx]]['w:r']._attributes = paragraphs[paragraphIdx[idx]]['w:r']._attributes || {}
            paragraphs[paragraphIdx[idx]]['w:r']._attributes.key = id
          })
        })
        .then(() => {
          resolve(paragraphs)
        })
    }

    if (xmlTag === 'w:tbl') {
      // tables = Output
      let tables = mapToArray(documentBody[xmlTag])
      let segmentPromise = []
      let tableIdx = []
      let tableRowIdx = []
      let tableCellIdx = []
      let paragraphIdx = []
      tables = tables.map((table, tblIdx) => {
        let tableRows = mapToArray(table['w:tr'])
        tableRows = tableRows.map((tableRow, tblRowIdx) => {
          let tableCells = mapToArray(tableRow['w:tc'])
          tableCells = tableCells.map((tableCell, tblCellIdx) => {
            let paragraphs = mapToArray(tableCell['w:p'])
            paragraphs = paragraphs.map((paragraph, pIdx) => {
              // If table cell contains no <w:r> => No text => return cell
              if (!paragraph.hasOwnProperty('w:r')) {
                return paragraph
              }

              let row = paragraph['w:r']
              if (row.hasOwnProperty('w:t') 
              && row['w:t'].hasOwnProperty('_text') 
              && row['w:t']['_text']) {
                let text = row['w:t']['_text']
                tableCellIdx.push(tblCellIdx)
                tableRowIdx.push(tblRowIdx)
                tableIdx.push(tblIdx)
                paragraphIdx.push(pIdx)
  
                // Push promise segmentCreation into segmentPromise array waitting for Promise.all
                segmentPromise.push(createSegment(text))
                return paragraph
              } else {
                return paragraph
              }
            })
            return tableCell
          })
          return tableRows
        })
        return table
      })

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
          })
        .then(() => {
          resolve(tables)
        })
    }
  })
}

/**
 * Handle a document object converted from xml docx file.
 * @param {Object} document Document object selected in xml fileService
 * @param {String} xmlTag 'w:r' paragraphs | 'w:tbl' tables
 * @returns {Promise<Document>} Paragraphs | Tables
 */
const handleDocument =  async (document, xmlTag) => {
  let documentBody = document['w:body'];
  let newDocument = handleSegment(documentBody, xmlTag)
  return newDocument
}

module.exports = {
  handleDocument,
}