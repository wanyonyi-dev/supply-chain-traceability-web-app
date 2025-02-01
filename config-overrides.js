const path = require('path');

module.exports = function override(config, env) {
    // Ignore source-map-loader warnings
    config.ignoreWarnings = [
        { module: /node_modules\/web3/ },
        { module: /node_modules\/@ethersproject/ },
        /Failed to parse source map/
    ];

    // Add fallback for node polyfills
    config.resolve.fallback = {
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "url": require.resolve("url")
    };

    return config;
}; 