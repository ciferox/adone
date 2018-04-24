const {
    is
} = adone;

// Exit on loss of parent process
const exit = () => process.exit(2);
process.on("disconnect", exit);

const fs = require("fs");
const http = require("http");
const spawn = require("child_process").spawn;

// Watching files should result in fs_event/fs_poll uv handles.
let watcher;
try {
    watcher = fs.watch(__filename);
} catch (exception) {
    // fs.watch() unavailable
}
fs.watchFile(__filename, () => { });

// Child should exist when this returns as child_process.pid must be set.
const child_process = spawn(process.execPath,
    ["-e", "process.stdin.on('data', (x) => console.log(x.toString()));"]);

let timeout_count = 0;
const timeout = setInterval(() => {
    timeout_count++; 
}, 1000);
// Make sure the timer doesn't keep the test alive and let
// us check we detect unref'd handles correctly.
timeout.unref();

// Datagram socket for udp uv handles.
const dgram = require("dgram");
const udp_socket = dgram.createSocket("udp4");
udp_socket.bind({});

// Simple server/connection to create tcp uv handles.
const server = http.createServer((req, res) => {
    req.on("end", () => {
        // Generate the report while the connection is active.
        console.log(adone.app.report.getReport());
        child_process.kill();

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end();

        // Tidy up to allow process to exit cleanly.
        server.close(() => {
            if (watcher) { 
                watcher.close(); 
            }
            fs.unwatchFile(__filename);
            udp_socket.close();
            process.removeListener("disconnect", exit);
        });
    });
    req.resume();
});
server.listen(() => {
    const data = {
        pid: child_process.pid,
        tcp_address: server.address(),
        udp_address: udp_socket.address(),
        skip_fs_watch: (is.undefined(watcher) ?
            "fs.watch() unavailable" :
            false)
    };
    process.send(data);
    http.get({ port: server.address().port });
});
