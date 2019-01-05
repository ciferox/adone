const {
    app: { logger }
} = adone;

const format = logger.format.combine(
    logger.format.colorize({ message: true }),
    logger.format.simple()
);

const l = logger.create({
    format,
    transports: [
        new logger.transport.Console()
    ]
});

l.info("Simply a test");
