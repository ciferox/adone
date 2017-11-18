let driver;

driver = require("./node-mongodb-native");
if (global.MONGOOSE_DRIVER_PATH) {
    driver = require(global.MONGOOSE_DRIVER_PATH);
}

/*!
 * ignore
 */

module.exports = driver;
