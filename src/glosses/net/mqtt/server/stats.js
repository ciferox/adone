const movingAverage = require("moving-average");

class Load {
    constructor(minutes) {
        this.maPublishedMessages = movingAverage(minutes * 60 * 1000);
        this.maPublishedMessages.push(Date.now(), 0);
        this.maConnectedClients = movingAverage(minutes * 60 * 1000);
        this.maConnectedClients.push(Date.now(), 0);
    }

    get publishedMessages() {
        let value = this.maPublishedMessages.movingAverage();
        value = Math.round(value * 100) / 100;
        return value;
    }

    get connectedClients() {
        let value = this.maConnectedClients.movingAverage();
        value = Math.round(value * 100) / 100;
        return value;
    }
}

// Inlinable method for adding a connected client.
function clientConnected() {
    this.stats.connectedClients++;
    this.stats.lastIntervalConnectedClients++;
    if (this.stats.connectedClients > this.stats.maxConnectedClients) {
        this.stats.maxConnectedClients = this.stats.connectedClients;
    }
}

// Inlinable method for removing a connected client.
function clientDisconnected() {
    this.stats.connectedClients--;
    this.stats.lastIntervalConnectedClients--;
}

// Inlinable method for counting published messages
function published(packet) {
    if (packet && packet.topic && packet.topic.indexOf("$SYS") < 0) { // count only publishes in user namespace
        this.stats.publishedMessages++;
        this.stats.lastIntervalPublishedMessages++;
    }
}

// Events that update the stats
const events = [
    clientConnected,
    clientDisconnected,
    published
];

export default class Stats {
    constructor() {
        this.maxConnectedClients = 0;
        this.connectedClients = 0;
        this.lastIntervalConnectedClients = 0;
        this.publishedMessages = 0;
        this.lastIntervalPublishedMessages = 0;
        this.started = new Date();

        this.load = {
            m15: new Load(15),
            m5: new Load(5),
            m1: new Load(1)
        };
    }

    wire(server) {
        server.stats = this;

        function doPublish(topic, value) {
            server.publish({
                topic: `$SYS/${server.id}/${topic}`,
                payload: `${value}`
            });
        }

        const timer = setInterval(() => {
            const stats = server.stats;
            const mem = process.memoryUsage();

            const date = new Date();

            stats.load.m1.maConnectedClients.push(date, stats.lastIntervalConnectedClients);
            stats.load.m5.maConnectedClients.push(date, stats.lastIntervalConnectedClients);
            stats.load.m15.maConnectedClients.push(date, stats.lastIntervalConnectedClients);
            stats.lastIntervalConnectedClients = 0;

            stats.load.m1.maPublishedMessages.push(date, stats.lastIntervalPublishedMessages);
            stats.load.m5.maPublishedMessages.push(date, stats.lastIntervalPublishedMessages);
            stats.load.m15.maPublishedMessages.push(date, stats.lastIntervalPublishedMessages);
            stats.lastIntervalPublishedMessages = 0;

            doPublish("version", adone.package.version);
            doPublish("started_at", server.stats.started.toISOString());
            doPublish("uptime", `${Math.ceil((Date.now() - server.stats.started) / 1000)} seconds`);
            doPublish("clients/maximum", stats.maxConnectedClients);
            doPublish("clients/connected", stats.connectedClients);
            doPublish("publish/received", stats.publishedMessages);
            doPublish("load/connections/15min", stats.load.m15.connectedClients);
            doPublish("load/publish/received/15min", stats.load.m15.publishedMessages);
            doPublish("load/connections/5min", stats.load.m5.connectedClients);
            doPublish("load/publish/received/5min", stats.load.m5.publishedMessages);
            doPublish("load/connections/1min", stats.load.m1.connectedClients);
            doPublish("load/publish/received/1min", stats.load.m1.publishedMessages);
            doPublish("memory/rss", mem.rss);
            doPublish("memory/heap/current", mem.heapUsed);
            doPublish("memory/heap/maximum", mem.heapTotal);
        }, 10 * 1000);

        events.forEach((event) => {
            server.on(event.name, event);
        });

        server.once("closed", () => {
            clearInterval(timer);

            events.forEach((event) => {
                server.removeListener(event.name, event);
            });
        });
    }
}
