
const axios = require('axios');
require('dotenv').config(); 


class CryptoPriceFetcher {
  constructor() {
    this.COINGECKO_API_KEY =process.env.COINGECKO_API_KEY;
    this.supportedExchanges = [
      "Binance", "Bybit", "Coinbase Exchange", "OKX", "Kraken",
      "Gate.io", "MEXC", "Crypto.com Exchange", "Bitget", "HTX",
      "BitMart", "KuCoin", "BVOX", "WhiteBIT", "DigiFinex",
      "Azbit", "CoinW", "BiFinance"
    ];
    this.coinIdMap = {
      DOGE: "dogecoin", ETH: "ethereum", SOL: "solana", BNB: "binancecoin",
      ADA: "cardano", TRX: "tron", AVAX: "avalanche-2", SHIB: "shiba-inu",
      XLM: "stellar", DOT: "polkadot", LINK: "chainlink", BCH: "bitcoin-cash",
      SUI: "sui", LTC: "litecoin", UNI: "uniswap", PEPE: "pepe",
      APT: "aptos", ICP: "internet-computer", VET: "vechain",
      ETC: "ethereum-classic", TAO: "bittensor", FIL: "filecoin",BTC:"bitcoin"
    };
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          headers: { "x-cg-pro-api-key": this.COINGECKO_API_KEY }
        });
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.delay(1000);
      }
    }
  }

  async fetchCryptoDataBatch(batch) {
    const batchData = {};
  
    for (const coin of batch) {
      try {
        const response = await this.fetchWithRetry(
          `https://pro-api.coingecko.com/api/v3/coins/${this.coinIdMap[coin]}/tickers`
        );
  
        if (!response.data.tickers || response.data.tickers.length === 0) continue;
  
        const filteredTickers = response.data.tickers.filter(
          ticker =>
            this.supportedExchanges.includes(ticker.market.name) &&
            ticker.target === 'USDT'
        );
  
        if (filteredTickers.length === 0) continue;
  
        const prices = filteredTickers.map(ticker => ({
          exchange: ticker.market.name,
          price: parseFloat(ticker.last),
        }));
  
        const highest = prices.reduce((max, ticker) => (ticker.price > max.price ? ticker : max), prices[0]);
        const lowest = prices.reduce((min, ticker) => (ticker.price < min.price ? ticker : min), prices[0]);
  
        const profit = ((highest.price - lowest.price) / lowest.price) * 100;
  
        // Include coin data in the batchData
        batchData[coin] = {
          coin: coin,  // Add coin to the JSON output
          highestExchange: highest.exchange,
          lowestExchange: lowest.exchange,
          highestPrice: highest.price,
          lowestPrice: lowest.price,
          profitPercentage: profit.toFixed(2),
        };
  
        await this.delay(1000);
      } catch (error) {
        console.error(`Error fetching data for ${coin}:`, error);
      }
    }
  
    return batchData;
  }
  
}

module.exports = CryptoPriceFetcher;
