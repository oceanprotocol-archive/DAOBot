// const snapshot = require('@snapshot-labs/snapshot.js')
const { calcTargetBlockHeight } = require('../snapshot/snapshot_utils')
const { assert } = require('../functions/utils')
const Logger = require('../utils/logger')

const main = async () => {
  const blockNumber = 12787964
  const targetTimestamp = 1625788799
  const avgBlockTime = 13
  const curTimestamp = Date.now() / 1000

  const estBlockHeight = Math.floor(
    blockNumber + (targetTimestamp - curTimestamp) / avgBlockTime
  )

  assert(
    estBlockHeight ===
      calcTargetBlockHeight(blockNumber, targetTimestamp, avgBlockTime),
    'Estimated and calculated block heights do not match'
  )
  Logger.log('Estimated block height: ', estBlockHeight)
}

main()
