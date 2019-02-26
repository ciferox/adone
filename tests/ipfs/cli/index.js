describe("cli", () => {
    adone.std.fs.readdirSync(__dirname)
        .filter((file) => file !== "index.js")
        .forEach((file) => require(`./${file}`));
});
