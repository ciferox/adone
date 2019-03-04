const {
    std: { fs }
} = adone;

describe("spdy-node-tests", () => {
    fs.readdirSync(__dirname)
        .forEach((file) => {
            require(`./${file}`);
        });
});
