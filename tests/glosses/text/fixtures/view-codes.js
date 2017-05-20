
const ansiRegex = require("../");
const ansiCodes = require("./ansi-codes");
const allCodes = {};
const supported = [];
const unsupported = [];

function addCodesToTest(codes) {
    for (const code in codes) {
        allCodes[code] = codes[code];
    }
}

function identifySupportedCodes() {
    let codeSupport = {};

    for (const code in allCodes) {
        codeSupport = {
            code,
            matches: (`\u001b${code}`).match(ansiRegex()),
            description: allCodes[code][0]
        };

        if (codeSupport.matches !== null && codeSupport.matches[0] === `\u001b${code}`) {
            supported.push(codeSupport);
        } else {
            unsupported.push(codeSupport);
        }
    }
}

function displaySupport() {
    process.stdout.write("\u001b[32m");

    console.log("SUPPORTED");
    for (let i = 0; i < supported.length; i++) {
        console.log(supported[i]);
    }

    process.stdout.write("\u001b[31m");
    console.log("UNSUPPORTED");

    for (let j = 0; j < unsupported.length; j++) {
        console.log(unsupported[j]);
    }

    process.stdout.write("\u001b[0m");
}

addCodesToTest(ansiCodes.vt52Codes);
addCodesToTest(ansiCodes.ansiCompatible);
addCodesToTest(ansiCodes.commonCodes);
addCodesToTest(ansiCodes.otherCodes);

identifySupportedCodes();
displaySupport();
