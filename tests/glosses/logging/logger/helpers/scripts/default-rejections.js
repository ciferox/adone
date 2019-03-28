const {
    logging: { logger },
    std: { path }
} = adone;

logger.rejections.handle([
    new logger.transport.File({
        filename: path.join(
            __dirname,
            "..",
            "..",
            "fixtures",
            "logs",
            "default-rejection.log"
        ),
        handleRejections: true
    })
]);

logger.info("Log something before error");

setTimeout(() => {
    Promise.reject(new Error("OH NOES! It rejected!"));
}, 1000);
