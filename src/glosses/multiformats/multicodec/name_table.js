
const baseTable = require("./base_table");

// this creates a map for code as hexString -> codecName

const nameTable = {};
module.exports = nameTable;

for (const encodingName in baseTable) {
    const code = baseTable[encodingName];
    nameTable[code.toString("hex")] = encodingName;
}
