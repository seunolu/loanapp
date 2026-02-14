const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Prevent Metro from traversing borrower node_modules (Windows EACCES path)
config.resolver.blockList = [
  /.*\/apps\/borrower\/node_modules\/.*/,
  /.*\\apps\\borrower\\node_modules\\.*/,
];

module.exports = config;
