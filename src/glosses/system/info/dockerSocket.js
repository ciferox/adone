const {
    std: { net, os }
} = adone;

const isWin = os.type() === "Windows_NT";
const socketPath = isWin ? "//./pipe/docker_engine" : "/var/run/docker.sock";

class DockerSocket {
    listContainers(all, callback) {
        try {

            let socket = net.createConnection({ path: socketPath });
            let alldata = "";
            let data;

            socket.on("connect", () => {
                socket.write(`GET http:/containers/json${all ? "?all=1" : ""} HTTP/1.0\r\n\r\n`);
            });

            socket.on("data", (data) => {
                alldata = alldata + data.toString();
            });

            socket.on("error", () => {
                socket = false;
                callback({});
            });

            socket.on("end", () => {
                const startbody = alldata.indexOf("\r\n\r\n");
                alldata = alldata.substring(startbody + 4);
                socket = false;
                try {
                    data = JSON.parse(alldata);
                    callback(data);
                } catch (err) {
                    callback({});
                }
            });
        } catch (err) {
            callback({});
        }
    }

    getStats(id, callback) {
        id = id || "";
        if (id) {
            try {
                let socket = net.createConnection({ path: socketPath });
                let alldata = "";
                let data;

                socket.on("connect", () => {
                    socket.write(`GET http:/containers/${id}/stats?stream=0 HTTP/1.0\r\n\r\n`);
                });

                socket.on("data", (data) => {
                    alldata = alldata + data.toString();
                });

                socket.on("error", () => {
                    socket = false;
                    callback({});
                });

                socket.on("end", () => {
                    const startbody = alldata.indexOf("\r\n\r\n");
                    alldata = alldata.substring(startbody + 4);
                    socket = false;
                    try {
                        data = JSON.parse(alldata);
                        callback(data);
                    } catch (err) {
                        callback({});
                    }
                });
            } catch (err) {
                callback({});
            }
        } else {
            callback({});
        }
    }

    getProcesses(id, callback) {
        id = id || "";
        if (id) {
            try {
                let socket = net.createConnection({ path: socketPath });
                let alldata = "";
                let data;

                socket.on("connect", () => {
                    socket.write(`GET http:/containers/${id}/top?ps_args=-opid,ppid,pgid,vsz,time,etime,nice,ruser,user,rgroup,group,stat,rss,args HTTP/1.0\r\n\r\n`);
                });

                socket.on("data", (data) => {
                    alldata = alldata + data.toString();
                });

                socket.on("error", () => {
                    socket = false;
                    callback({});
                });

                socket.on("end", () => {
                    const startbody = alldata.indexOf("\r\n\r\n");
                    alldata = alldata.substring(startbody + 4);
                    socket = false;
                    try {
                        data = JSON.parse(alldata);
                        callback(data);
                    } catch (err) {
                        callback({});
                    }
                });
            } catch (err) {
                callback({});
            }
        } else {
            callback({});
        }
    }
}

module.exports = DockerSocket;
