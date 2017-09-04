"use strict";

import adone from "adone";

const {
    Contextable,
    Private,
    Public
} = adone.netron.decorator;

function context(object) {
    @Contextable
    class O {}

    const t = new O;

    for (const [key, value] of adone.util.entries(object)) {
        t[key] = value;
    }

    return t;
}

@Contextable
@Private
class Server {
    constructor(netron) {
        this.netron = netron;
        this.users = new Map;
        this.rooms = new Map;
        this.createRoom("global");
        this.users.set("server", {});
        this.getRoom("global").add("server");

        this.netron.on("peer offline", (peer) => {
            for (const [userName, { peer: _peer }] of this.users.entries()) {
                if (peer !== _peer) {
                    continue;
                }
                for (const [roomName, members] of this.rooms.entries()) {
                    if (!members.has(userName)) {
                        continue;
                    }
                    members.delete(userName);
                    this.post("server", `${userName} disconnected`, roomName);
                }
                this.users.delete(userName);
                break;
            }
        });
    }

    createRoom(roomName) {
        if (this.rooms.has(roomName)) {
            throw new adone.x.Exception("A room with this name already exists");
        }
        const room = new Set;
        this.rooms.set(roomName, room);
        return room;
    }

    getRoom(roomName) {
        if (!this.rooms.has(roomName)) {
            throw new adone.x.Exception("There is no such room");
        }
        return this.rooms.get(roomName);
    }

    async post(userName, message, roomName = "global") {
        const room = this.getRoom(roomName);
        if (userName !== "server" && !room.has(userName)) {  // this user is not a member of this group
            return;
        }
        for (const name of room.keys()) {
            if (name === "server") {
                continue;
            }
            // if (name === userName) {
            //     continue;
            // }
            const client = this.users.get(name);  // redundantly?
            console.log("send message to", name);
            try {
                await client.api.newMessage(userName, message, roomName);
            } catch (err) {
                console.error("Client failed:", err);
            }
        }
    }

    @Public
    async login(user, api) {
        if (this.users.has(user)) {
            throw new adone.x.Exception("This name has been taken");
        }
        await this.post("server", `User ${user} joined`);
        this.users.set(user, { api, peer: this.netron.getPeerForInterface(api) });
        this.rooms.get("global").add(user);
        return context({
            post: (message, room) => {
                return this.post(user, message, room);
            },
            users: () => {
                return [...this.users.keys()];
            },
            createRoom: (roomName) => {
                return this.createRoom(roomName);
            },
            rooms: () => {
                return [...this.rooms.keys()];
            },
            join: (roomName) => {
                const room = this.getRoom(roomName);
                room.add(user);
            },
            leave: (roomName) => {
                const room = this.getRoom(roomName);
                room.delete(user);
            }
        });
    }
}

@Contextable
@Private
class Client {
    constructor(netron, server, name) {
        this.name = name;
        this.public = server;
        this.server = null;  // private api
        this.netron = netron;
        this.messageHandler = (user, message) => {
            console.log(`${name} got a new message from ${user}: ${message}`);
        };
    }

    disconnect() {
        return this.netron.disconnect();
    }

    async login() {
        this.server = await this.public.login(this.name, context({
            newMessage: (...args) => {
                this.messageHandler(...args);
            }
        }));
        for (const method of adone.util.keys(this.server)) {
            this[method] = (...args) => this.server[method](...args);
        }
    }
}

async function createServer() {
    const server = new adone.netron.Netron;
    server.attachContext(new Server(server), "chat");
    await server.bind();
    return server;
}

async function createClient(name) {
    const clientNetron = new adone.netron.Netron;
    const peer = await clientNetron.connect();
    const publicServerAPI = peer.getInterfaceByName("chat");
    const client = new Client(clientNetron, publicServerAPI, name);
    await client.login();
    return client;
}

async function test(type) {
    if (type === "server") {
        await createServer();
        return;
    }
    const client1 = await createClient("client1");
    const client2 = await createClient("client2");
    const client3 = await createClient("client3");
    console.log("2 and 3 should receive the message");
    await client1.post("hello");
    console.log();

    console.log("1 and 3 should receive the message");
    await client2.post("world");
    console.log();

    console.log("1 and 2 should receive the message");
    await client3.post("opa");
    console.log();

    console.log("should print all users");
    console.log(await client3.users());
    console.log();

    console.log("no one should receive the message");
    await client2.leave("global");
    await client2.post("world");
    console.log();

    console.log("1 and 3 users should receive the message");
    await client2.join("global");
    await client2.post("i am here");
    console.log();

    console.log("2 and 3 should receive the message");
    await client2.createRoom("secret");
    await client2.join("secret");
    await client3.join("secret");
    await client3.post("private", "secret");
    await client2.post("private", "secret");
    console.log();

    console.log("should print all rooms");
    console.log(await client1.rooms());
}

async function main(type) {
    if (type === "server") {
        const server = await createServer();
        console.log("server started");
        server.on("new:client", (name) => {
            console.log("new client", name);
        });
        return;
    }

    const screen = new adone.terminal.ui.Screen;

    // user name

    const prompt = new adone.terminal.ui.widget.Prompt({
        parent: screen,
        border: "line",
        height: "shrink",
        width: "half",
        top: "center",
        left: "center"
    });

    const msg = new adone.terminal.ui.widget.Message({
        parent: screen,
        border: "line",
        height: "shrink",
        width: "half",
        top: "center",
        left: "center",
        label: "{blue-fg}Message{/blue-fg} ",
        tags: true,
        hidden: true
    });

    // omg
    let name;
    let client;
    const destroy = () => {
        screen.destroy();
        if (client) {
            client.disconnect();
        }
    };
    screen.key("q", destroy);
    screen.render();
    while (true) {
        try {
            name = await new adone.Promise((resolve, reject) => {
                prompt.readInput("What is your name?", "", (err, value) => {
                    err ? reject(err) : resolve(value);
                });
            });
            if (!name) {
                await new adone.Promise((resolve) => {
                    msg.display("Name is required!", -1, resolve);
                });
            } else {
                client = await createClient(name);
                break;
            }
        } catch (err) {
            if (err) {
                await new adone.Promise((resolve) => {
                    msg.display(err.message, -1, resolve);
                });
            }
        }
    }

    // chat

    const grid = new adone.terminal.ui.layout.Grid({ rows: 12, cols: 12, screen });

    const logger = grid.set(0, 0, 11, 12, adone.terminal.ui.widget.Log, {
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        tags: true
    });

    const textarea = grid.set(11, 0, 1, 12, adone.terminal.ui.widget.TextArea, {
        top: 0,
        left: 0,
        width: "100%",
        height: "100%"
    });



    client.messageHandler = (user, message, room) => {
        if (room === "global") {
            logger.log(`[{green-fg}${user}{/green-fg}] ${message}`);
        } else {
            logger.log(`[{red}${room}{/red}][{green}${user}{/green}] ${message}`);
        }
        screen.render();
    };

    logger.log("connected");


    screen.key("enter", () => {
        textarea.readInput();
    });

    textarea.on("keypress", (ch, key) => {
        // logger.log(ch, key);
        if (key.name === "enter") {
            textarea.submit();
        }
    });

    textarea.on("submit", (value) => {
        textarea.clearInput();
        if (value) {
            if (!value.startsWith("/")) {
                // not a system command
                client.post(value);
                return;
            }
        }
    });
}

// test(process.argv[2] || "server").catch((err) => console.error(err));

main(process.argv[2] || "server").catch((err) => console.log(err));
