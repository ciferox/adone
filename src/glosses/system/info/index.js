const util = require("./util");
const system = require("./system");
const osInfo = require("./osinfo");
const cpu = require("./cpu");
const memory = require("./memory");
const battery = require("./battery");
const graphics = require("./graphics");
const filesystem = require("./filesystem");
const network = require("./network");
const processes = require("./processes");
const users = require("./users");
const internet = require("./internet");
const docker = require("./docker");

const _platform = process.platform;
const _windows = (_platform === "win32");
const _freebsd = (_platform === "freebsd");
const _openbsd = (_platform === "openbsd");
const _sunos = (_platform === "sunos");


// ----------------------------------------------------------------------------------
// 14. get all
// ----------------------------------------------------------------------------------

// --------------------------
// get static data - they should not change until restarted

const getStaticData = function (callback) {
    return new Promise((resolve) => {
        process.nextTick(() => {

            const data = {};

            Promise.all([
                system.system(),
                system.bios(),
                system.baseboard(),
                osInfo.osInfo(),
                osInfo.versions(),
                cpu.cpu(),
                cpu.cpuFlags(),
                graphics.graphics(),
                network.networkInterfaces(),
                memory.memLayout(),
                filesystem.diskLayout()
            ]).then((res) => {
                data.system = res[0];
                data.bios = res[1];
                data.baseboard = res[2];
                data.os = res[3];
                data.versions = res[4];
                data.cpu = res[5];
                data.cpu.flags = res[6];
                data.graphics = res[7];
                data.net = res[8];
                data.memLayout = res[9];
                data.diskLayout = res[10];
                if (callback) {
                    callback(data);
                }
                resolve(data);
            });
        });
    });
};

// --------------------------
// get all dynamic data - e.g. for monitoring agents
// may take some seconds to get all data
// --------------------------
// 2 additional parameters needed
// - srv: 		comma separated list of services to monitor e.g. "mysql, apache, postgresql"
// - iface:	define network interface for which you like to monitor network speed e.g. "eth0"
const getDynamicData = function (srv, iface, callback) {
    if (util.isFunction(iface)) {
        callback = iface;
        iface = "";
    }
    if (util.isFunction(srv)) {
        callback = srv;
        srv = "";
    }

    return new Promise((resolve) => {
        process.nextTick(() => {

            iface = iface || network.getDefaultNetworkInterface();
            srv = srv || "";

            // use closure to track ƒ completion
            const functionProcessed = (function () {
                let totalFunctions = 14;
                if (_windows) {
                    totalFunctions = 10;
                }
                if (_freebsd || _openbsd) {
                    totalFunctions = 11;
                }
                if (_sunos) {
                    totalFunctions = 6;
                }

                return function () {
                    if (--totalFunctions === 0) {
                        if (callback) {
                            callback(data);
                        }
                        resolve(data);
                    }
                };
            })();

            // var totalFunctions = 14;
            // function functionProcessed() {
            //   if (--totalFunctions === 0) {
            //     if (callback) { callback(data) }
            //     resolve(data);
            //   }
            // }

            const data = {};

            // get time
            data.time = osInfo.time();

            /**
             * @namespace
             * @property {Object}  versions
             * @property {string}  versions.node
             * @property {string}  versions.v8
             */
            data.node = process.versions.node;
            data.v8 = process.versions.v8;

            cpu.cpuCurrentspeed().then((res) => {
                data.cpuCurrentspeed = res;
                functionProcessed();
            });

            users.users().then((res) => {
                data.users = res;
                functionProcessed();
            });

            if (!_windows) {
                processes.processes().then((res) => {
                    data.processes = res;
                    functionProcessed();
                });
            }

            cpu.currentLoad().then((res) => {
                data.currentLoad = res;
                functionProcessed();
            });

            if (!_sunos) {
                cpu.cpuTemperature().then((res) => {
                    data.temp = res;
                    functionProcessed();
                });
            }

            if (!_openbsd && !_freebsd && !_sunos) {
                network.networkStats(iface).then((res) => {
                    data.networkStats = res;
                    functionProcessed();
                });
            }

            if (!_sunos) {
                network.networkConnections().then((res) => {
                    data.networkConnections = res;
                    functionProcessed();
                });
            }

            memory.mem().then((res) => {
                data.mem = res;
                functionProcessed();
            });

            if (!_sunos) {
                battery().then((res) => {
                    data.battery = res;
                    functionProcessed();
                });
            }

            if (!_windows && !_sunos) {
                processes.services(srv).then((res) => {
                    data.services = res;
                    functionProcessed();
                });
            }

            if (!_sunos) {
                filesystem.fsSize().then((res) => {
                    data.fsSize = res;
                    functionProcessed();
                });
            }

            if (!_windows && !_openbsd && !_freebsd && !_sunos) {
                filesystem.fsStats().then((res) => {
                    data.fsStats = res;
                    functionProcessed();
                });
            }

            if (!_windows && !_openbsd && !_freebsd && !_sunos) {
                filesystem.disksIO().then((res) => {
                    data.disksIO = res;
                    functionProcessed();
                });
            }

            internet.inetLatency().then((res) => {
                data.inetLatency = res;
                functionProcessed();
            });
        });
    });
};

// --------------------------
// get all data at once
// --------------------------
// 2 additional parameters needed
// - srv: 		comma separated list of services to monitor e.g. "mysql, apache, postgresql"
// - iface:	define network interface for which you like to monitor network speed e.g. "eth0"
const getAllData = function (srv, iface, callback) {
    return new Promise((resolve) => {
        process.nextTick(() => {
            let data = {};

            if (iface && util.isFunction(iface) && !callback) {
                callback = iface;
                iface = "";
            }

            if (srv && util.isFunction(srv) && !iface && !callback) {
                callback = srv;
                srv = "";
                iface = "";
            }

            getStaticData().then((res) => {
                data = res;
                getDynamicData(srv, iface).then((res) => {
                    for (const key in res) {
                        if (res.hasOwnProperty(key)) {
                            data[key] = res[key];
                        }
                    }
                    if (callback) {
                        callback(data);
                    }
                    resolve(data);
                });
            });
        });
    });
};

exports.system = system.system;
exports.bios = system.bios;
exports.baseboard = system.baseboard;

exports.time = osInfo.time;
exports.osInfo = osInfo.osInfo;
exports.versions = osInfo.versions;
exports.shell = osInfo.shell;

exports.cpu = cpu.cpu;
exports.cpuFlags = cpu.cpuFlags;
exports.cpuCache = cpu.cpuCache;
exports.cpuCurrentspeed = cpu.cpuCurrentspeed;
exports.cpuTemperature = cpu.cpuTemperature;
exports.currentLoad = cpu.currentLoad;
exports.fullLoad = cpu.fullLoad;

exports.mem = memory.mem;
exports.memLayout = memory.memLayout;

exports.battery = battery;

exports.graphics = graphics.graphics;

exports.fsSize = filesystem.fsSize;
exports.blockDevices = filesystem.blockDevices;
exports.fsStats = filesystem.fsStats;
exports.disksIO = filesystem.disksIO;
exports.diskLayout = filesystem.diskLayout;

exports.networkInterfaceDefault = network.networkInterfaceDefault;
exports.networkInterfaces = network.networkInterfaces;
exports.networkStats = network.networkStats;
exports.networkConnections = network.networkConnections;

exports.services = processes.services;
exports.processes = processes.processes;
exports.processLoad = processes.processLoad;

exports.users = users.users;

exports.inetChecksite = internet.inetChecksite;
exports.inetLatency = internet.inetLatency;

exports.dockerContainers = docker.dockerContainers;
exports.dockerContainerStats = docker.dockerContainerStats;
exports.dockerContainerProcesses = docker.dockerContainerProcesses;
exports.dockerAll = docker.dockerAll;

exports.getStaticData = getStaticData;
exports.getDynamicData = getDynamicData;
exports.getAllData = getAllData;
