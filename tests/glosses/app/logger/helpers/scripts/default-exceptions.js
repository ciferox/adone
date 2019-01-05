const {
    app: { logger },
    std: { path }
} = adone;

adone.runtime.logger.exceptions.handle([
    new logger.transport.File({
        filename: path.join(__dirname, "..", "..", "fixtures", "logs", "default-exception.log"),
        handleExceptions: true
    })
]);

adone.runtime.logger.info("Log something before error");

setTimeout(() => {
    throw new Error("OH NOES! It failed!");
}, 1000);
