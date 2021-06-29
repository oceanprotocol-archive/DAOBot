const snapshot = require('@snapshot-labs/snapshot.js')

const main = async () => {
    // currentBlockHeight => https://etherscan.io/blocks
    const curTimestamp = Date.now()/1000
    const targetTimestamp = 1622764740;
    const avgBlockTime = 13
    const blockNumber = 12564135

    // avgBlockTime (in seconds) => https://bitinfocharts.com/ethereum/
    const estBlockHeight = blockNumber + ((targetTimestamp - curTimestamp) / avgBlockTime)
    console.log('Estimated block height: ', estBlockHeight)
}

main()
