adone.run({
    async main() {
        adone.net.proxy.shadowsocks.createConnection({
            proxyHost: "localhost",
            proxyPort: 8388,
            host: "ipecho.net",
            port: 80,
            password: "test"
            // localDNS: false
        }, ({ readable, writable, socket }) => {
            readable.on("data", (chunk) => {
                adone.log(chunk.toString());
                writable.end();
            });
            writable.write("GET /plain HTTP/1.1\r\nHost: ipecho.net\r\n\r\n");
        });
    }
});
