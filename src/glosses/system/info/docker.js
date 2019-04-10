const util = require("./util");
const DockerSocket = require("./dockerSocket");

const _platform = process.platform;
const _windows = (_platform === "win32");

const _docker_container_stats = {};
let _docker_socket;
let _docker_last_read = 0;


// --------------------------
// get containers (parameter all: get also inactive/exited containers)

export const dockerContainers = (all, callback) => {
    const inContainers = (containers, id) => {
        const filtered = containers.filter((obj) => {
            /**
       * @namespace
       * @property {string}  Id
       */
            return (obj.Id && (obj.Id === id));
        });
        return (filtered.length > 0);
    };

    // fallback - if only callback is given
    if (util.isFunction(all) && !callback) {
        callback = all;
        all = false;
    }

    all = all || false;
    const result = [];
    return new Promise((resolve) => {
        process.nextTick(() => {
            if (!_docker_socket) {
                _docker_socket = new DockerSocket();
            }

            _docker_socket.listContainers(all, (data) => {
                let docker_containers = {};
                try {
                    docker_containers = data;
                    if (docker_containers && Object.prototype.toString.call(docker_containers) === "[object Array]" && docker_containers.length > 0) {
                        docker_containers.forEach((element) => {
                            /**
               * @namespace
               * @property {string}  Id
               * @property {string}  Name
               * @property {string}  Image
               * @property {string}  ImageID
               * @property {string}  Command
               * @property {number}  Created
               * @property {string}  State
               * @property {Array}  Names
               * @property {Array}  Ports
               * @property {Array}  Mounts
               */

                            if (element.Names && Object.prototype.toString.call(element.Names) === "[object Array]" && element.Names.length > 0) {
                                element.Name = element.Names[0].replace(/^\/|\/$/g, "");
                            }
                            result.push({
                                id: element.Id,
                                name: element.Name,
                                image: element.Image,
                                imageID: element.ImageID,
                                command: element.Command,
                                created: element.Created,
                                state: element.State,
                                ports: element.Ports,
                                mounts: element.Mounts
                                // hostconfig: element.HostConfig,
                                // network: element.NetworkSettings
                            });
                        });
                    }
                } catch (err) {
                    util.noop();
                }
                // }

                // GC in _docker_container_stats
                for (const key in _docker_container_stats) {
                    if (_docker_container_stats.hasOwnProperty(key)) {
                        if (!inContainers(docker_containers, key)) {
                            delete _docker_container_stats[key];
                        }
                    }
                }
                if (callback) {
                    callback(result);
                }
                resolve(result);
            });
        });
    });
};

// --------------------------
// helper functions for calculation of docker stats
const docker_calcCPUPercent = (cpu_stats, precpu_stats) => {
    /**
   * @namespace
   * @property {object}  cpu_usage
   * @property {number}  cpu_usage.total_usage
   * @property {number}  system_cpu_usage
   * @property {object}  cpu_usage
   * @property {Array}  cpu_usage.percpu_usage
   */

    if (!_windows) {
        let cpuPercent = 0.0;
        // calculate the change for the cpu usage of the container in between readings
        const cpuDelta = cpu_stats.cpu_usage.total_usage - precpu_stats.cpu_usage.total_usage;
        // calculate the change for the entire system between readings
        const systemDelta = cpu_stats.system_cpu_usage - precpu_stats.system_cpu_usage;

        if (systemDelta > 0.0 && cpuDelta > 0.0) {
            // calculate the change for the cpu usage of the container in between readings
            cpuPercent = (cpuDelta / systemDelta) * cpu_stats.cpu_usage.percpu_usage.length * 100.0;
        }

        return cpuPercent;
    }
    const nanoSecNow = util.nanoSeconds();
    let cpuPercent = 0.0;
    if (_docker_last_read > 0) {
        const possIntervals = (nanoSecNow - _docker_last_read); //  / 100 * os.cpus().length;
        const intervalsUsed = cpu_stats.cpu_usage.total_usage - precpu_stats.cpu_usage.total_usage;
        if (possIntervals > 0) {
            cpuPercent = 100.0 * intervalsUsed / possIntervals;
        }
    }
    _docker_last_read = nanoSecNow;
    return cpuPercent;
};

const docker_calcNetworkIO = (networks) => {
    let rx;
    let tx;
    for (const key in networks) {
        // skip loop if the property is from prototype
        if (!networks.hasOwnProperty(key)) {
            continue;
        }

        /**
         * @namespace
         * @property {number}  rx_bytes
         * @property {number}  tx_bytes
         */
        const obj = networks[key];
        rx = Number(obj.rx_bytes);
        tx = Number(obj.tx_bytes);
    }
    return {
        rx,
        tx
    };
};

const docker_calcBlockIO = (blkio_stats) => {
    const result = {
        r: 0,
        w: 0
    };

    /**
   * @namespace
   * @property {Array}  io_service_bytes_recursive
   */
    if (blkio_stats && blkio_stats.io_service_bytes_recursive && Object.prototype.toString.call(blkio_stats.io_service_bytes_recursive) === "[object Array]" && blkio_stats.io_service_bytes_recursive.length > 0) {
        blkio_stats.io_service_bytes_recursive.forEach((element) => {
            /**
       * @namespace
       * @property {string}  op
       * @property {number}  value
       */

            if (element.op && element.op.toLowerCase() === "read" && element.value) {
                result.r += element.value;
            }
            if (element.op && element.op.toLowerCase() === "write" && element.value) {
                result.w += element.value;
            }
        });
    }
    return result;
};

export const dockerContainerStats = (containerIDs, callback) => {
    let containerArray = [];
    // fallback - if only callback is given
    if (util.isFunction(containerIDs) && !callback) {
        callback = containerIDs;
        containerArray = ["*"];
    } else {
        containerIDs = containerIDs || "*";
        containerIDs = containerIDs.trim().toLowerCase().replace(/,+/g, "|");
        containerArray = containerIDs.split("|");
    }

    return new Promise((resolve) => {
        process.nextTick(() => {

            const result = [];

            const workload = [];
            if (containerArray.length && containerArray[0].trim() === "*") {
                containerArray = [];
                dockerContainers().then((allContainers) => {
                    for (const container of allContainers) {
                        containerArray.push(container.id);
                    }
                    dockerContainerStats(containerArray.join(",")).then((result) => {
                        if (callback) {
                            callback(result);
                        }
                        resolve(result);
                    });
                });
            } else {
                for (const containerID of containerArray) {
                    workload.push(dockerContainerStatsSingle(containerID.trim()));
                }
                if (workload.length) {
                    Promise.all(
                        workload
                    ).then((data) => {
                        if (callback) {
                            callback(data);
                        }
                        resolve(data);
                    });
                } else {
                    if (callback) {
                        callback(result);
                    }
                    resolve(result);
                }
            }
        });
    });
};

// --------------------------
// container stats (for one container)
const dockerContainerStatsSingle = (containerID) => {
    containerID = containerID || "";
    const result = {
        id: containerID,
        mem_usage: 0,
        mem_limit: 0,
        mem_percent: 0,
        cpu_percent: 0,
        pids: 0,
        netIO: {
            rx: 0,
            wx: 0
        },
        blockIO: {
            r: 0,
            w: 0
        }
    };
    return new Promise((resolve) => {
        process.nextTick(() => {
            if (containerID) {

                if (!_docker_socket) {
                    _docker_socket = new DockerSocket();
                }

                _docker_socket.getStats(containerID, (data) => {
                    try {
                        const stats = data;
                        /**
             * @namespace
             * @property {Object}  memory_stats
             * @property {number}  memory_stats.usage
             * @property {number}  memory_stats.limit
             * @property {Object}  cpu_stats
             * @property {Object}  pids_stats
             * @property {number}  pids_stats.current
             * @property {Object}  networks
             * @property {Object}  blkio_stats
             */

                        if (!stats.message) {
                            result.mem_usage = (stats.memory_stats && stats.memory_stats.usage ? stats.memory_stats.usage : 0);
                            result.mem_limit = (stats.memory_stats && stats.memory_stats.limit ? stats.memory_stats.limit : 0);
                            result.mem_percent = (stats.memory_stats && stats.memory_stats.usage && stats.memory_stats.limit ? stats.memory_stats.usage / stats.memory_stats.limit * 100.0 : 0);
                            result.cpu_percent = (stats.cpu_stats && stats.precpu_stats ? docker_calcCPUPercent(stats.cpu_stats, stats.precpu_stats) : 0);
                            result.pids = (stats.pids_stats && stats.pids_stats.current ? stats.pids_stats.current : 0);
                            if (stats.networks) {
                                result.netIO = docker_calcNetworkIO(stats.networks);
                            }
                            if (stats.blkio_stats) {
                                result.blockIO = docker_calcBlockIO(stats.blkio_stats);
                            }
                            result.cpu_stats = (stats.cpu_stats ? stats.cpu_stats : {});
                            result.precpu_stats = (stats.precpu_stats ? stats.precpu_stats : {});
                            result.memory_stats = (stats.memory_stats ? stats.memory_stats : {});
                            result.networks = (stats.networks ? stats.networks : {});
                        }
                    } catch (err) {
                        util.noop();
                    }
                    // }
                    resolve(result);
                });
            } else {
                resolve(result);
            }
        });
    });
};


// --------------------------
// container processes (for one container)
export const dockerContainerProcesses = (containerID, callback) => {
    containerID = containerID || "";
    const result = [];
    return new Promise((resolve) => {
        process.nextTick(() => {
            if (containerID) {

                if (!_docker_socket) {
                    _docker_socket = new DockerSocket();
                }

                _docker_socket.getProcesses(containerID, (data) => {
                    /**
           * @namespace
           * @property {Array}  Titles
           * @property {Array}  Processes
           **/
                    try {
                        if (data && data.Titles && data.Processes) {
                            const titles = data.Titles.map((value) => {
                                return value.toUpperCase();
                            });
                            const pos_pid = titles.indexOf("PID");
                            const pos_ppid = titles.indexOf("PPID");
                            const pos_pgid = titles.indexOf("PGID");
                            const pos_vsz = titles.indexOf("VSZ");
                            const pos_time = titles.indexOf("TIME");
                            const pos_elapsed = titles.indexOf("ELAPSED");
                            const pos_ni = titles.indexOf("NI");
                            const pos_ruser = titles.indexOf("RUSER");
                            const pos_user = titles.indexOf("USER");
                            const pos_rgroup = titles.indexOf("RGROUP");
                            const pos_group = titles.indexOf("GROUP");
                            const pos_stat = titles.indexOf("STAT");
                            const pos_rss = titles.indexOf("RSS");
                            const pos_command = titles.indexOf("COMMAND");

                            data.Processes.forEach((process) => {
                                result.push({
                                    pid_host: (pos_pid >= 0 ? process[pos_pid] : ""),
                                    ppid: (pos_ppid >= 0 ? process[pos_ppid] : ""),
                                    pgid: (pos_pgid >= 0 ? process[pos_pgid] : ""),
                                    user: (pos_user >= 0 ? process[pos_user] : ""),
                                    ruser: (pos_ruser >= 0 ? process[pos_ruser] : ""),
                                    group: (pos_group >= 0 ? process[pos_group] : ""),
                                    rgroup: (pos_rgroup >= 0 ? process[pos_rgroup] : ""),
                                    stat: (pos_stat >= 0 ? process[pos_stat] : ""),
                                    time: (pos_time >= 0 ? process[pos_time] : ""),
                                    elapsed: (pos_elapsed >= 0 ? process[pos_elapsed] : ""),
                                    nice: (pos_ni >= 0 ? process[pos_ni] : ""),
                                    rss: (pos_rss >= 0 ? process[pos_rss] : ""),
                                    vsz: (pos_vsz >= 0 ? process[pos_vsz] : ""),
                                    command: (pos_command >= 0 ? process[pos_command] : "")
                                });
                            });
                        }
                    } catch (err) {
                        util.noop();
                    }
                    if (callback) {
                        callback(result);
                    }
                    resolve(result);
                });
            } else {
                if (callback) {
                    callback(result);
                }
                resolve(result);
            }
        });
    });
};

export const dockerAll = (callback) => new Promise((resolve) => {
    process.nextTick(() => {
        dockerContainers(true).then((result) => {
            if (result && Object.prototype.toString.call(result) === "[object Array]" && result.length > 0) {
                let l = result.length;
                result.forEach((element) => {
                    dockerContainerStats(element.id).then((res) => {
                        // include stats in array
                        element.mem_usage = res.mem_usage;
                        element.mem_limit = res.mem_limit;
                        element.mem_percent = res.mem_percent;
                        element.cpu_percent = res.cpu_percent;
                        element.pids = res.pids;
                        element.netIO = res.netIO;
                        element.blockIO = res.blockIO;
                        element.cpu_stats = res.cpu_stats;
                        element.precpu_stats = res.precpu_stats;
                        element.memory_stats = res.memory_stats;
                        element.networks = res.networks;

                        dockerContainerProcesses(element.id).then((processes) => {
                            element.processes = processes;

                            l -= 1;
                            if (l === 0) {
                                if (callback) {
                                    callback(result);
                                }
                                resolve(result);
                            }
                        });
                        // all done??
                    });
                });
            } else {
                if (callback) {
                    callback(result);
                }
                resolve(result);
            }
        });
    });
});
