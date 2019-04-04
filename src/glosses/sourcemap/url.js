// Note: This file is overridden in the 'package.json#browser' field to
// substitute lib/url-browser.js instead.

// Use the URL global for Node 10, and the 'url' module for Node 8.
module.exports = adone.is.function(URL) ? URL : adone.std.url.URL;
