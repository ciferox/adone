adone.application.run({
    async main() {
        adone.logInfo("socket");

        await new Promise((resolve, reject) => {
            adone.net.proxy.shadowsocks.createConnection({
                proxyHost: "localhost",
                proxyPort: 8388,
                host: "ipecho.net",
                port: 80,
                password: "test"
                // localDNS: false
            }, (socket) => {
                socket.on("data", (chunk) => {
                    adone.log(chunk.toString());
                    socket.end();
                });
                socket.write("GET /plain HTTP/1.1\r\nHost: ipecho.net\r\n\r\n");
                socket.on("close", () => {
                    resolve();
                });
            }).once("error", (err) => {
                reject(err);
            });
        });

        adone.logInfo("agent");

        await new Promise((resolve, reject) => {
            adone.std.http.request({
                method: "GET",
                host: "ipecho.net",
                path: "/plain",
                port: 80,
                agent: new adone.net.proxy.shadowsocks.Agent({
                    password: "test",
                    https: false,
                    keepAlive: true
                })
            })
                .once("response", (res) => {
                    res.once("data", (chunk) => {
                        console.log(chunk.toString());
                    });
                    res.once("end", () => {
                        resolve();
                    });
                })
                .once("error", (err) => {
                    reject(err);
                })
                .end();
        });
    }
});
