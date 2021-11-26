const snapshot = require('@snapshot-labs/snapshot.js')
const sampleSpace = require('@snapshot-labs/snapshot.js/src/schemas/proposal.json')
const Logger = require('../utils/logger')

const valid = snapshot.utils.validateSchema(snapshot.schemas.space, sampleSpace)
Logger.log(valid)
