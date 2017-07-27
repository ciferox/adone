// throw an error if any EventEmitter adds too many listeners
// require("throw-max-listeners-error");

const seedrandom = require("seedrandom");
const seed = `${process.env.SEED || Date.now()}`;
console.log(`Seeded with: ${seed}`);
seedrandom(seed, { global: true });

const testsDir = process.env.TESTS_DIR || "./tmp";
const exec = require("child_process").exec;
function cleanup() {
    // Remove test databases
    exec(`rm -r ${testsDir}`);
}
exec(`mkdir -p ${testsDir}`, () => {
    process.on("SIGINT", cleanup);
    process.on("exit", cleanup);
});

global.testUtils = require("./utils.js");
// const chai = require("chai");
// chai.use(require("chai-as-promised"));
// global.should = chai.should();
// global.assert = chai.assert;

if (process.env.PLUGINS && !process.env.COVERAGE) {
    // in coverage, these plugins are explicitly included
    // in pouchdb-for-coverage
    process.env.PLUGINS.split(",").forEach((plugin) => {
        PouchDB.plugin(require(`../../packages/node_modules/${plugin}`));
    });
}
