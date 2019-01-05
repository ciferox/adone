const {
    app: { logger },
    std: { path }
} = adone;

adone.runtime.logger.exitOnError = function (err) {
    process.stdout.write(err.message);
    return err.message !== "Ignore this error";
};

adone.runtime.logger.exceptions.handle(
    new logger.transport.File({
        filename: path.join(__dirname, "..", "logs", "exit-on-error.log"),
        handleExceptions: true
    }));

setTimeout(() => {
    throw new Error("Ignore this error");
}, 100);
