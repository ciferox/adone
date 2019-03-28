const {
    logging: { logger },
    std: { path }
} = adone;

const l = logger.create({
    transports: [
        new logger.transport.File({
            filename: path.join(__dirname, "..", "..", "fixtures", "logs", "string-exception.log"),
            handleExceptions: true
        })
    ]
});

l.exceptions.handle();

setTimeout(() => {
    throw "OMG NEVER DO THIS STRING EXCEPTIONS ARE AWFUL";
}, 1000);
