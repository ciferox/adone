import enableDestroy from "./server_destroy";
const {
    is,
    std: { net },
    event,
    database: { redis }
} = adone;

const { util, parser: { createParser } } = adone.private(redis);

export default class MockServer extends event.Emitter {
    constructor(port, handler) {
        super();
        this.port = port;
        this.handler = handler;

        this.clients = [];

        this.connect();
    }

    connect() {
        const _this = this;
        this.socket = net.createServer((c) => {
            const clientIndex = _this.clients.push(c) - 1;
            process.nextTick(() => {
                _this.emit("connect", c);
            });

            const parser = createParser({
                name: "javascript",
                returnBuffers: true,
                returnReply(reply) {
                    reply = util.convertBufferToString(reply);
                    _this.write(c, _this.handler && _this.handler(reply));
                },
                returnError() { }
            });

            c.on("end", () => {
                _this.clients[clientIndex] = null;
                _this.emit("disconnect", c);
            });

            c.on("data", (data) => {
                parser.execute(data);
            });
        });

        this.socket.listen(this.port);
        enableDestroy(this.socket);
    }

    disconnect(callback) {
        if (!is.function(callback)) {
            return new Promise((resolve) => this.socket.destroy(resolve));
        }
        this.socket.destroy(callback);
    }

    broadcast(data) {
        for (let i = 0; i < this.clients.length; ++i) {
            if (this.clients[i]) {
                this.write(this.clients[i], data);
            }
        }
    }

    write(c, data) {
        const convert = (str, data) => {
            let result;
            if (is.undefined(data)) {
                data = MockServer.REDIS_OK;
            }
            if (data === MockServer.REDIS_OK) {
                result = "+OK\r\n";
            } else if (is.error(data)) {
                result = `-${data.message}\r\n`;
            } else if (is.array(data)) {
                result = `*${data.length}\r\n`;
                data.forEach((item) => {
                    result += convert(str, item);
                });
            } else if (is.number(data)) {
                result = `:${data}\r\n`;
            } else if (is.null(data)) {
                result = "$-1\r\n";
            } else {
                data = data.toString();
                result = `$${data.length}\r\n`;
                result += `${data}\r\n`;
            }
            return str + result;
        };
        if (c.writable) {
            c.write(convert("", data));
        }
    }
}

MockServer.REDIS_OK = "+OK";
