import yahooFinance from 'yahoo-finance2';

async function testYahooFinance() {
  try {
    // Test with multiple methods
    
    // Method 1: Basic Quote
    console.log('--- Basic Quote ---');
    const quote = await yahooFinance.quote('AAPL');
    console.log('Basic Quote Result:', {
      symbol: quote.symbol,
      regularMarketPrice: quote.regularMarketPrice,
      regularMarketChange: quote.regularMarketChange,
      regularMarketChangePercent: quote.regularMarketChangePercent
    });

    // Method 2: Historical Data
    console.log('\n--- Historical Data ---');
    const historical = await yahooFinance.historical('AAPL', { 
      period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      period2: new Date()
    });
    console.log('Historical Data Length:', historical.length);
    console.log('First Historical Entry:', historical[0]);

    // Method 3: Quotation Type
    console.log('\n--- Quotation Type ---');
    const quotationType = await yahooFinance.quoteSummary('AAPL', { 
      modules: ['price', 'summaryDetail'] 
    });
    console.log('Quotation Summary:', {
      regularMarketPrice: quotationType.price?.regularMarketPrice,
      currency: quotationType.price?.currency,
      longName: quotationType.price?.longName
    });

  } catch (error) {
    console.error('Yahoo Finance Test Error:', error);
  }
}

// Run the test
testYahooFinance();
