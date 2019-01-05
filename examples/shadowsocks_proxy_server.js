adone.app.runCli({
    async main() {
        const server = new adone.net.proxy.shadowsocks.Server({
            password: "test"
        });
        server.on("connection", (header, accept, deny) => {
            console.log(header);
            if (header.dstAddr !== "ipecho.net") {
                accept();
                return;
            }
            const { socket, cipher, decipher, head } = accept(true);
            cipher.pipe(socket);
            cipher.end("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n8.8.8.8");
        });
        server.listen(8388);
    }
});
