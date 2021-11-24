const { google } = require('googleapis')

// AUTOMATED
// EVENTS
// Snapshot -> Raw Data -> New Sheet (title: ipfsHash)
// Duplicate SummaryGranular (title: ipfsHashSummaryGranular) ->

// MANUAL (@ BEGIN ROUND)
// Duplicate RegistryGranular (title: Round5Registry)
// duplicateRoundRegistry() -- new proposal
// updateRoundRegistry() -- new proposal

// FUNCTIONS
// UpdateSheetCells w/ Functions
// UpdateSheetCells w/ Data
// DuplicateSheetRequest({sourceSheetId:'GranularSummary', insertSheetIndex:0, newSheetName:proposal.ipfsHash+'Summary'})
// AddSheetRequest({title:proposal.ipfsHash})

const spreadsheet = process.env.GSHEET_BASEID

// Executed queued requests on top of GSheets
const processRequests = async (oAuth, requests) => {
  const sheets = google.sheets({ version: 'v4', auth: oAuth })
  const batchUpdateRequest = { requests }
  try {
    return await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheet,
      resource: batchUpdateRequest
    })
  } catch (err) {
    console.log('[processRequests] The API returned an error: ' + err)
    return undefined
  }
}

// Create sheet sheet at index 0 w/ sheet name
const addSheet = async (oAuth, sheetName, indexOffset = 0) => {
  const requests = []
  requests.push({
    addSheet: {
      properties: {
        title: sheetName,
        index: indexOffset
      }
    }
  })
  return processRequests(oAuth, requests)
}

// Clear values from Sheet
const emptySheet = async (oAuth, sheetName, range) => {
  const sheets = google.sheets({ version: 'v4', auth: oAuth })
  try {
    return await sheets.spreadsheets.values.clear({
      spreadsheetId: spreadsheet,
      range: sheetName + '!' + range
    })
  } catch (err) {
    console.log('[getValues] The API returned an error: ' + err)
    return undefined
  }
}

// Dump values to Sheet
const updateValues = async (oAuth, sheetId, range, values) => {
  const sheets = google.sheets({ version: 'v4', auth: oAuth })
  await emptySheet(oAuth, sheetId, range)
  try {
    return await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheet,
      range: sheetId + '!' + range,
      valueInputOption: 'RAW',
      resource: {
        values: values
      }
    })
  } catch (err) {
    console.log('[updateValues] The API returned an error: ' + err)
    return undefined
  }
}

const getValues = async (oAuth, ipfsHash, range) => {
  const sheets = google.sheets({ version: 'v4', auth: oAuth })
  try {
    return await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheet,
      range: ipfsHash + '!' + range
    })
  } catch (err) {
    console.log('[getValues] The API returned an error: ' + err)
    return undefined
  }
}

module.exports = { getValues, addSheet, updateValues, emptySheet }
