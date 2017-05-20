const fs = require("fs");

const identity = process.argv[2];
const dest = process.argv[3];

fs.appendFileSync(dest, identity);

setInterval(adone.noop, 1000);
