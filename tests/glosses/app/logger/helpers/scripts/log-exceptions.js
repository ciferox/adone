const {
    app: { logger },
    std: { path }
} = adone;

const l = logger.create({
    transports: [
        new logger.transport.File({
            filename: path.join(__dirname, "..", "..", "fixtures", "logs", "exception.log"),
            handleExceptions: true
        })
    ]
});

l.exceptions.handle();

setTimeout(() => {
    throw new Error("OH NOES! It failed!");
}, 1000);
