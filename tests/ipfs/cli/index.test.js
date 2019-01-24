const {
    std: { fs }
} = adone;

describe("cli", () => {
    fs.readdirSync(__dirname)
        .filter((file) => file !== "index.js")
        .forEach((file) => require(`./${file}`));
});
