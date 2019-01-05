const {
    app: { logger },
    std: { path }
} = adone;

  
const l = logger.createLogger({
    transports: [
        new logger.transport.File({
            filename: path.join(__dirname, "..", "logs", "unhandle-rejections.log")
        })
    ]
});

l.transports[0].transport.handleRejections;

l.rejections.handle();
l.rejections.unhandle();

setTimeout(() => {
    Promise.reject(new Error("OH NOES! It rejected!"));
}, 200);
