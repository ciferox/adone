const { std: { net, tls, url: urllib } } = adone;

export const createSocket = (proxyUrl, destinationPort, destinationHost) => new Promise((resolve, reject) => {
    const proxy = urllib.parse(proxyUrl);
    // create a socket connection to the proxy server

    const options = {
        host: proxy.hostname,
        port: Number(proxy.port) ? Number(proxy.port) : (proxy.protocol === "https:" ? 443 : 80)
    };

    let connect;

    if (proxy.protocol === "https:") {
        // we can use untrusted proxies as long as we verify actual SMTP certificates
        options.rejectUnauthorized = false;
        connect = tls.connect.bind(tls);
    } else {
        connect = net.connect.bind(net);
    }

    // Error harness for initial connection. Once connection is established, the responsibility
    // to handle errors is passed to whoever uses this socket
    let finished = false;
    const tempSocketErr = function (err) {
        if (finished) {
            return;
        }
        finished = true;
        try {
            socket.destroy();
        } catch (E) {
            // ignore
        }
        reject(err);
    };

    const socket = connect(options, () => {
        if (finished) {
            return;
        }

        const reqHeaders = {
            Host: `${destinationHost}:${destinationPort}`,
            Connection: "close"
        };
        if (proxy.auth) {
            reqHeaders["Proxy-Authorization"] = `Basic ${Buffer.from(proxy.auth).toString("base64")}`;
        }

        socket.write(
            // HTTP method
            `CONNECT ${destinationHost}:${destinationPort} HTTP/1.1\r\n${

            // HTTP request headers
            Object.keys(reqHeaders).map((key) => `${key}: ${reqHeaders[key]}`).join("\r\n")

            // End request
            }\r\n\r\n`);

        let headers = "";
        const onSocketEnd = () => {
            reject(new adone.x.Exception("Socket was prematurely closed"));
        };
        const onSocketData = (chunk) => {
            let match;
            let remainder;

            if (finished) {
                return;
            }

            headers += chunk.toString("binary");
            if ((match = headers.match(/\r\n\r\n/))) {
                socket.removeListener("data", onSocketData);

                remainder = headers.substr(match.index + match[0].length);
                headers = headers.substr(0, match.index);
                if (remainder) {
                    socket.unshift(Buffer.from(remainder, "binary"));
                }

                // proxy connection is now established
                finished = true;

                // check response code
                match = headers.match(/^HTTP\/\d+\.\d+ (\d+)/i);
                if (!match || (match[1] || "").charAt(0) !== "2") {
                    try {
                        socket.destroy();
                    } catch (E) {
                        // ignore
                    }
                    return reject(new Error(`Invalid response from proxy${match && `: ${match[1]}` || ""}`));
                }

                socket.removeListener("error", tempSocketErr);
                socket.removeListener("end", onSocketEnd);
                return resolve(socket);
            }
        };
        socket.on("data", onSocketData);
        socket.once("end", onSocketEnd);
    });

    socket.once("error", tempSocketErr);
});
