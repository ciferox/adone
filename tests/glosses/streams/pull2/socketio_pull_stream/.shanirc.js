import { Server } from "https";

export default (ctx) => {
    const {
        stream: { pull2: { socketioPullStream } },
        std: { http }
    } = adone;

    const SIO = require("socket.io");
    let io;
    let serv;

    const routingTable = {};

    ctx.before((done) => {
        serv = http.createServer(() => { });
        io = SIO(serv);
        io.on("connection", (client) => {
            socketioPullStream(client, { codec: "buffer" });

            client.on("ack", (ack) => ack());

            client.on("createProxy", (id, to, f) => {
                to = routingTable[to];
                client.createProxy(id, to);
                if (f) {
                    to.emit("ack", f);
                }
            });

            client.on("hello", () => client.emit("world", client.id));

            routingTable[client.id] = client;
        });

        serv.listen(5982, done);
    });

    ctx.after((done) => {
        serv.close(/*done*/);
        done();
    });
};
