const {
    std: { fs }
} = adone;

describe("nodejs only", () => {
    fs.readdirSync(__dirname)
        .forEach((file) => {
            require(`./${file}`);
        });
});
