const snapshot = require('@snapshot-labs/snapshot.js')

const main = async () => {
    // 1. Update Current blockNumber
    // get current block height => https://etherscan.io/blocks
    // 2. Set targetTimestamp
    // get the unix second timestamp in seconds for the target date => https://www.epochconverter.com/
    // 3. Get the average block time in seconds
    // avgBlockTime (in seconds) => https://bitinfocharts.com/ethereum/
    // 4. Run()
    // Get estimated block height
    const blockNumber = 12782006 // output: 12790055
    const targetTimestamp = 1625788799; // Jul 8 2021 23:59:59
    const avgBlockTime = 13
    const curTimestamp = Date.now()/1000

    const estBlockHeight = blockNumber + ((targetTimestamp - curTimestamp) / avgBlockTime)
    console.log('Estimated block height: ', estBlockHeight)
}

main()
