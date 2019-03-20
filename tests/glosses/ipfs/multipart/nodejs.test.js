const fs = require("fs");

describe("multipart", () => {
    const tests = fs.readdirSync(__dirname);
    tests
        .filter((file) => file !== "fixtures" && file !== "index.js")
        .forEach((file) => {
            require(`./${file}`);
        });
});
