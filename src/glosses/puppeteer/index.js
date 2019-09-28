const { helper } = require("./lib/helper");
const api = require("./lib/api");
for (const className in api) {
    // Puppeteer-web excludes certain classes from bundle, e.g. BrowserFetcher.
    if (typeof api[className] === "function")
        helper.installAsyncStackHooks(api[className]);
}

// If node does not support async await, use the compiled version.
export const Puppeteer = require("./lib/Puppeteer");
// const packageJson = require("./package.json");
const preferredRevision = "686378";
const isPuppeteerCore = true;//packageJson.name === "puppeteer-core";

const instance = new Puppeteer(__dirname, preferredRevision, isPuppeteerCore);
instance.Puppeteer = Puppeteer;
export default instance;
