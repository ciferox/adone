export default (options, throwError = false) => {
    return new Promise((resolve, reject) => {
        const server = adone.std.net.createServer();
        server.unref();
        server.once("error", (err) => {
            if (throwError) {
                return reject(err);
            }
            resolve(false);
        });
        server.listen(options, () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
    });
};
