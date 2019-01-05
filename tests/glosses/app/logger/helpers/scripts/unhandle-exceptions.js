const {
    app: { logger },
    std: { path }
} = adone;

const l = logger.create({
    transports: [
        new logger.transport.File({
            filename: path.join(__dirname, "..", "logs", "unhandle-exception.log")
        })
    ]
});

l.exceptions.handle();
l.exceptions.unhandle();

setTimeout(() => {
    throw new Error("OH NOES! It failed!");
}, 200);
