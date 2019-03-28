const {
    logging: { logger },
    std: { path }
} = adone;

    
const l = logger.createLogger({
    transports: [
        new logger.transport.File({
            filename: path.join(
                __dirname,
                "..",
                "..",
                "fixtures",
                "logs",
                "rejections.log"
            ),
            handleRejections: true
        })
    ]
});

l.rejections.handle();

setTimeout(() => {
    Promise.reject(new Error("OH NOES! It rejected!"));
}, 1000);
