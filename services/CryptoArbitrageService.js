const axios = require("axios");
require("dotenv").config();
const cron = require("node-cron");

class CryptoArbitrageService {
  constructor() {
    this.COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
    this.RATE_LIMIT_DELAY = 3000;
    this.BATCH_SIZE = 3;
    this.MAX_RETRIES = 5;

    // Map trading pairs to exchanges that actually support them
    this.exchangePairMap = new Map();

    this.supportedExchanges = [
      "Binance",
      "Bybit",
      "Coinbase Exchange",
      "OKX",
      "Kraken",
      "Gate.io",
      "MEXC",
      "Crypto.com Exchange",
      "Bitget",
      "HTX",
      "BitMart",
      "KuCoin",
      "BVOX",
      "WhiteBIT",
    ];

    this.coinIdMap = {
      DOGE: "dogecoin",
      ETH: "ethereum",
      SOL: "solana",
      BNB: "binancecoin",
      ADA: "cardano",
      TRX: "tron",
      AVAX: "avalanche-2",
      SHIB: "shiba-inu",
      XLM: "stellar",
      DOT: "polkadot",
      LINK: "chainlink",
      BCH: "bitcoin-cash",
      SUI: "sui",
      LTC: "litecoin",
      UNI: "uniswap",
      PEPE: "pepe",
      APT: "aptos",
    };
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchWithRetry(url, options) {
    let lastError;
    const delays = [1000, 2000, 4000, 8000, 16000];

    for (let i = 0; i < this.MAX_RETRIES; i++) {
      try {
        const response = await axios.get(url, {
          ...options,
          timeout: 10000,
        });

        if (response.data && Object.keys(response.data).length > 0) {
          return response;
        }
        throw new Error("Empty response received");
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);

        if (error.response?.status === 429) {
          await this.delay(this.RATE_LIMIT_DELAY * 2);
          continue;
        }

        if (i < this.MAX_RETRIES - 1) {
          await this.delay(delays[i] || delays[delays.length - 1]);
        }
      }
    }
    throw lastError;
  }

  async fetchCryptoDataBatch(batch) {
    const batchData = {};

    for (const coin of batch) {
      try {
        const response = await this.fetchWithRetry(
          `https://pro-api.coingecko.com/api/v3/coins/${coin}/tickers`,
          { headers: { "x-cg-pro-api-key": this.COINGECKO_API_KEY } }
        );

        if (!response.data.tickers?.length) {
          continue;
        }

        // Filter and process tickers
        response.data.tickers.forEach((ticker) => {
          const exchangeName = ticker.market.name;

          if (
            this.supportedExchanges.includes(exchangeName) &&
            ticker.target === "USDT" &&
            ticker.last > 0 &&
            ticker.volume > 0
          ) {
            if (!batchData[exchangeName]) {
              batchData[exchangeName] = {};
            }

            // Store the trading pair information
            const symbol = this.getSymbolFromCoinId(coin);
            if (symbol) {
              const pairKey = `${symbol}-USDT`;
              if (!this.exchangePairMap.has(pairKey)) {
                this.exchangePairMap.set(pairKey, new Set());
              }
              this.exchangePairMap.get(pairKey).add(exchangeName);

              batchData[exchangeName][coin] = {
                price: parseFloat(ticker.last),
                volume: parseFloat(ticker.volume),
                timestamp: Date.now(),
              };
            }
          }
        });

        await this.delay(this.RATE_LIMIT_DELAY);
      } catch (error) {
        console.error(`Error fetching data for ${coin}:`, error);
      }
    }

    return batchData;
  }

  getSymbolFromCoinId(coinId) {
    return Object.entries(this.coinIdMap).find(
      ([symbol, id]) => id === coinId
    )?.[0];
  }

  validatePriceData(price1, price2, exchange, pair) {
    if (!price1 || !price2 || price1 <= 0 || price2 <= 0) {
      // Only log if at least one price exists but is invalid
      if (
        (price1 !== undefined && price1 <= 0) ||
        (price2 !== undefined && price2 <= 0)
      ) {
        console.warn(
          `Invalid prices for ${pair} on ${exchange}: ${price1}/${price2}`
        );
      }
      return false;
    }
    return true;
  }

  isPairTradedOnExchange(coin1, coin2, exchange, cryptoData) {
    const exchangeData = cryptoData[exchange];
    if (!exchangeData) return false;

    const coin1Id = this.coinIdMap[coin1];
    const coin2Id = this.coinIdMap[coin2];

    return exchangeData[coin1Id]?.price > 0 && exchangeData[coin2Id]?.price > 0;
  }

  calculateArbitrageProfit(cryptoData, initialInvestment) {
    if (!cryptoData || Object.keys(cryptoData).length === 0) {
      throw new Error("No crypto data available");
    }

    const results = [];
    const coinPairs = this.createCoinPairs();

    for (const [coin1, coin2] of coinPairs) {
      // Find exchanges that trade both coins
      const validExchanges = this.supportedExchanges.filter((exchange) =>
        this.isPairTradedOnExchange(coin1, coin2, exchange, cryptoData)
      );

      if (validExchanges.length < 2) continue;

      const opportunities = [];

      for (const exchange of validExchanges) {
        const coin1Price = cryptoData[exchange][this.coinIdMap[coin1]]?.price;
        const coin2Price = cryptoData[exchange][this.coinIdMap[coin2]]?.price;

        if (
          this.validatePriceData(
            coin1Price,
            coin2Price,
            exchange,
            `${coin1}/${coin2}`
          )
        ) {
          opportunities.push({
            exchange,
            price1: coin1Price,
            price2: coin2Price,
          });
        }
      }

      if (opportunities.length < 2) continue;

      // Find best opportunities
      opportunities.sort((a, b) => a.price1 - b.price1);
      const minOpp = opportunities[0];
      opportunities.sort((a, b) => b.price1 - a.price1);
      const maxOpp = opportunities[0];

      if (minOpp && maxOpp && minOpp.exchange !== maxOpp.exchange) {
        const profit = this.calculateProfitForPair(
          initialInvestment,
          minOpp.price1,
          minOpp.price2,
          maxOpp.price1,
          maxOpp.price2
        );

        if (profit.profit > 0) {
          results.push({
            pair: `${coin1} / ${coin2}`,
            coin1,
            coin2,
            minExchange: minOpp.exchange,
            maxExchange: maxOpp.exchange,
            minPrice1: Number(minOpp.price1.toFixed(8)),
            minPrice2: Number(minOpp.price2.toFixed(8)),
            maxPrice1: Number(maxOpp.price1.toFixed(8)),
            maxPrice2: Number(maxOpp.price2.toFixed(8)),
            profit: Number(profit.profit.toFixed(2)),
            profitPercentage: Number(profit.profitPercentage.toFixed(2)),
            investmentAmount: initialInvestment,
          });
        }
      }
    }

    return results.sort((a, b) => b.profit - a.profit);
  }

  calculateProfitForPair(
    investment,
    minPrice1,
    minPrice2,
    maxPrice1,
    maxPrice2
  ) {
    const coin1Bought = investment / minPrice1;
    const moneyAfterSellingCoin1 = coin1Bought * maxPrice1;
    const coin2Bought = moneyAfterSellingCoin1 / maxPrice2;
    const finalAmount = coin2Bought * minPrice2;

    const profit = finalAmount - investment;
    const profitPercentage = (profit / investment) * 100;

    return { profit, profitPercentage };
  }

  async getArbitrageOpportunities(investment) {
    try {
      const allCoins = Object.values(this.coinIdMap);
      const cryptoData = {};

      for (let i = 0; i < allCoins.length; i += this.BATCH_SIZE) {
        const batch = allCoins.slice(i, i + this.BATCH_SIZE);
        const batchData = await this.fetchCryptoDataBatch(batch);

        Object.entries(batchData).forEach(([exchange, coins]) => {
          if (!cryptoData[exchange]) {
            cryptoData[exchange] = {};
          }
          Object.assign(cryptoData[exchange], coins);
        });
      }

      const results = this.calculateArbitrageProfit(cryptoData, investment);

      return {
        results: results.slice(0, 20),
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error calculating arbitrage opportunities:", error);
      throw error;
    }
  }

  createCoinPairs() {
    const coins = Object.keys(this.coinIdMap);
    const pairs = [];

    for (let i = 0; i < coins.length; i++) {
      for (let j = i + 1; j < coins.length; j++) {
        pairs.push([coins[i], coins[j]]);
      }
    }

    return pairs;
  }

  async startAutomaticUpdates(investmentAmount) {
    await this.getArbitrageOpportunities(investmentAmount);

    cron.schedule("*/15 * * * *", async () => {
      try {
        await this.getArbitrageOpportunities(investmentAmount);
      } catch (error) {
        console.error("Error in scheduled update:", error);
      }
    });

    console.log("Automatic updates scheduled every 15 minutes");
  }
}

module.exports = CryptoArbitrageService;
