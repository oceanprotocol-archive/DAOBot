const CoinGecko = require('coingecko-api');

const cgClient = new CoinGecko();
const CG_PARAMS = {
    market_data: true,
    tickers: false,
    community_data: false,
    developer_data: false,
    localization: false,
    sparkline: false,
}

const getTokenPrice = async () => {
    try {
        const result = await cgClient.coins.fetch(process.env.CG_TOKEN_SLUG, CG_PARAMS)
        return result.data.market_data.current_price['usd']
    } catch(err) {
        console.log(err)
    }
}

module.exports = {getTokenPrice}
