/**
 * Browser 'URL' implementations have been found to handle non-standard URL
 * schemes poorly, and schemes like
 *
 *   webpack:///src/folder/file.js
 *
 * are very common in source maps. For the time being we use a JS
 * implementation in these contexts instead. See
 *
 * * https://bugzilla.mozilla.org/show_bug.cgi?id=1374505
 * * https://bugs.chromium.org/p/chromium/issues/detail?id=734880
 */
module.exports = require("whatwg-url").URL;
