"use strict";

import adone from "../../lib/glosses";
const readline = require("readline");
const { Contextable, Private, Public, Readonly } = adone.netron.decorator;

const default_port = 16901;
const default_host = "0.0.0.0";


class StdinWorker
{
    constructor() {
        let liner = readline.createInterface({ input: process.stdin });
        liner.on("line", (input) => {
            this.processInput(input);
        });
    }

    processInput(input){
        if (input.charAt(0) === "/"){
            let c = input.indexOf(" ");
            let command = input.slice(1, c !== -1 ? c : undefined);
            let args = c !== -1 ? input.slice(c+1).split(" ") : [];
            this.command(command, args);
        } else {
            this.message(input);
        }
    }

    command(){}
    message(){}
}

@Contextable
@Private
class Client extends StdinWorker
{
    constructor(netron) {
        super();
        this.netron = netron;
        console.log("Welcome to AdoChat!\nType /help for available commands.");
    }

    async connect(host="127.0.0.1", port=default_port){
        process.stdout.write(`Trying to connect to ${host}:${port}... `);
        try{
            let peer = await this.netron.connect(port, host);
            console.log("Connected!");
            this.server = await peer.getInterfaceByName("chat-server");

            this.netron.on("peer offline", (peer_off) => {
                if (peer_off === peer){
                    console.log("Server go offline.");
                    this.server = null;
                    this.uid = null;
                }
            });
        } catch(e){
            console.log("Cannot connect!");
        }
    }

    async login(name){
        this.name = name || this.name || "noname";
        try {
            var uid = await this.server.join(this);
        } catch(e){
            console.log(`Cannot connect with name: ${name}. Reason: ${e.message}`);
        }
        if (uid){
            console.log(`Joined to global room as '${this.name}'. You may print message now.`);
            this.uid = uid;
        }
    }

    command(command, args){
        if (command === "connect"){
            if (this.server === null){
                this.connect(...args).catch((e) => {
                    console.error(e);
                });
            } else {
                console.log("Already connected!");
            }
        } else if (command === "login"){
            if (this.server){
                this.login(...args);
            } else {
                console.log("You are not connected to server!");
            }
        } else if (command === "help"){
            console.log("Available commands: \n\tconnect [host] [port]\n\tlogin [name]");
        } else {
            console.log(`Unknown command: ${command}`);
        }
    }

    @Public
    receiveMessage(author, msg){
        if (this.uid){
            console.log(`${author}: ${msg}`);
        }
    }

    message(msg){
        if (this.server){
            if (this.uid){
                this.server.receiveMessage(this.uid, msg);
            } else {
                console.log("You didn't login to server.");
            }
        } else {
            console.log("You are not connected to server.");
        }
    }

    @Readonly
    @Public
    name = null;

    server = null;
    netron = null;
    uid = null;
}

@Contextable
@Private
class Server extends StdinWorker {
    constructor(netron) {
        super();

        this.netron = netron;
        this.netron.on("peer offline", (peer_off) => {
            this.clients.forEach((client, name)=> {
                if (peer_off === client.peer){
                    this.clients.delete(name);
                    this.broadcastMessage("Server", `${name} go offline.`);
                    return;
                }
            });
        });
    }

    @Public
    async join(client_int){
        let name = await client_int.name();
        if ( this.clients.has(name) ) {
            throw new adone.x.Exists(`User with name ${name} already exists. Choose another name.`);
        } else if ( ["server", "admin"].indexOf(name.toLowerCase()) > -1 ){
            throw new adone.x.NotValid(`Name ${name} is system. Choose another name.`);
        } else if ( !(/^[A-Za-z0-9]+$/.test(name)) ){
            throw new adone.x.NotValid("Invalid name. Mask: ^[A-Za-z0-9]+$.");
        }

        this.clients.set(name, {
            interface: client_int,
            peer: this.netron.getPeerForInterface(client_int),
            uid: adone.std.crypto.randomBytes(20).toString("hex")
        });
        this.broadcastMessage("Server", `${name} has connected!`);
        return this.clients.get(name).uid;
    }

    command(command, args){
        if (command === "list"){
            if (this.clients.size > 0){
                console.log(`Users on server: ${Array.from(this.clients.keys()).join(", ")}.`);
            } else {
                console.log("No clients on server now.");
            }
        } else if (command === "help"){
            console.log("Available commands: \n\tlist");
        } else {
            console.log(`Unknown command: ${command}`);
        }
    }

    message(msg){
        this.broadcastMessage("Server", msg);
    }

    broadcastMessage(author, text){
        console.log(`${author}: ${text}`);
        this.clients.forEach((client, name) => {
            if (name != author){
                client.interface.receiveMessage(author, text);
            }
        });
    }

    @Public
    receiveMessage(uid, text){
        this.clients.forEach((client, name) => {
            if (client.uid === uid){
                let message = {
                    author: name,
                    text: text
                };
                this.messages.push(message);
                this.broadcastMessage(name, text);
                return;
            }
        });
    }

    clients = new Map();
    messages = [];
    netron = null;
}

function be_server(host=default_host, port=default_port){
    console.log("Starting chat server...");
    const n = new adone.netron.Netron;
    const server = new Server(n);
    n.attachContext(server, "chat-server");
    n.bind(port, host).then(() => {
        console.log(`Listen on ${host}:${port}`);
    });
}

async function be_client(){
    const n = new adone.netron.Netron;
    new Client(n);
}

if ((process.argv.indexOf("server") == -1) && (process.argv.indexOf("client") == -1)){
    console.error("Usage: node chat.js <server|client>");
} else if ((process.argv.indexOf("server") != -1)) {
    be_server();
} else {
    be_client();
}
