const {
    is
} = adone;

const WebSocketServer = require("ws").Server;
const mapleTree = require("mapleTree");
const port = process.env.ZUUL_PORT || process.env.PORT || 3000;

module.exports = function () {
    const router = new mapleTree.RouteTree();
    const wss = new WebSocketServer({ port });

    router.define("/read", (ws) => {
        const values = ["a", "b", "c", "d"];
        const timer = setInterval(() => {
            const next = values.shift();
            if (next) {
                ws.send(next);
            } else {
                clearInterval(timer);
                ws.close();
            }
        }, 100);
    });

    router.define("/echo", (ws) => {
        ws.on("message", (data) => {
            // console.log("received message: ", data);
            ws.send(data);
        });
    });

    wss.on("connection", (ws) => {
        const match = router.match(ws.upgradeReq.url);
        if (match && is.function(match.fn)) {
            match.fn(ws);
        }
    });

    return wss;
};
