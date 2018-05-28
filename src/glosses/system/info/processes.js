
// ==================================================================================
// processes.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2018
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 10. Processes
// ----------------------------------------------------------------------------------

const os = require("os");
const exec = require("child_process").exec;
const util = require("./util");

const _platform = process.platform;

const _linux = (_platform === "linux");
const _darwin = (_platform === "darwin");
const _windows = (_platform === "win32");
const _freebsd = (_platform === "freebsd");
const _openbsd = (_platform === "openbsd");
const _sunos = (_platform === "sunos");

const NOT_SUPPORTED = "not supported";

const _process_cpu = {
    all: 0,
    list: {},
    ms: 0,
    result: {}
};

const _winStatusValues = {
    0: "unknown",
    1: "other",
    2: "ready",
    3: "running",
    4: "blocked",
    5: "suspended blocked",
    6: "suspended ready",
    7: "terminated",
    8: "stopped",
    9: "growing"
};


function parseTimeWin(time) {
    time = time || "";
    if (time) {
        return (`${time.substr(0, 4)}-${time.substr(4, 2)}-${time.substr(6, 2)} ${time.substr(8, 2)}:${time.substr(10, 2)}:${time.substr(12, 2)}`);
    }
    return "";


}

// --------------------------
// PS - services
// pass a comma separated string with services to check (mysql, apache, postgresql, ...)
// this function gives an array back, if the services are running.

function services(srv, callback) {

    // fallback - if only callback is given
    if (util.isFunction(srv) && !callback) {
        callback = srv;
        srv = "";
    }

    return new Promise((resolve) => {
        process.nextTick(() => {
            if (srv) {
                srv = srv.trim().toLowerCase().replace(/,+/g, " ").replace(/  +/g, " ").replace(/ +/g, "|");
                const srvs = srv.split("|");
                const data = [];
                const dataSrv = [];

                if (_linux || _freebsd || _openbsd || _darwin) {
                    const comm = (_darwin) ? "ps -caxo pcpu,pmem,comm" : "ps -axo pcpu,pmem,comm";
                    if (srv !== "" && srvs.length > 0) {
                        exec(`${comm} | grep -v grep | egrep "${srv}"`, (error, stdout) => {
                            if (!error) {
                                const lines = stdout.toString().replace(/ +/g, " ").replace(/,+/g, ".").split("\n");
                                srvs.forEach((srv) => {
                                    let ps = lines.filter(function (e) {
                                        return e.indexOf(srv) !== -1;
                                    });
                                    data.push({
                                        'name': srv,
                                        'running': ps.length > 0,
                                        'pcpu': parseFloat((ps.reduce(function (pv, cv) {
                                            return pv + parseFloat(cv.trim().split(' ')[0]);
                                        }, 0)).toFixed(2)),
                                        'pmem': parseFloat((ps.reduce(function (pv, cv) {
                                            return pv + parseFloat(cv.trim().split(' ')[1]);
                                        }, 0)).toFixed(2))
                                    });
                                });
                                if (callback) {
                                    callback(data);
                                }
                                resolve(data);
                            } else {
                                exec(`ps -o comm | grep -v grep | egrep "${srv}"`, (error, stdout) => {
                                    if (!error) {
                                        let lines = stdout.toString().replace(/ +/g, ' ').replace(/,+/g, '.').split('\n');
                                        srvs.forEach(function (srv) {
                                            let ps = lines.filter(function (e) {
                                                return e.indexOf(srv) !== -1;
                                            });
                                            data.push({
                                                'name': srv,
                                                'running': ps.length > 0,
                                                'pcpu': 0,
                                                'pmem': 0
                                            });
                                        });
                                        if (callback) { callback(data); }
                                        resolve(data);
                                    } else {
                                        srvs.forEach(function (srv) {
                                            data.push({
                                                'name': srv,
                                                'running': false,
                                                'pcpu': 0,
                                                'pmem': 0
                                            });
                                        });
                                        if (callback) { callback(data); }
                                        resolve(data);
                                    }
                                });
                            }
                        });
                    } else {
                        if (callback) {
                            callback(data);
                        }
                        resolve(data);
                    }
                }
                if (_windows) {
                    exec(`${util.getWmic()} service get /value`, { maxBuffer: 1024 * 1000, windowsHide: true }, (error, stdout) => {
                        if (!error) {
                            const serviceSections = stdout.split(/\n\s*\n/);
                            for (let i = 0; i < serviceSections.length; i++) {
                                if (serviceSections[i].trim() !== "") {
                                    const lines = serviceSections[i].trim().split("\r\n");
                                    const srv = util.getValue(lines, "Name", "=", true).toLowerCase();
                                    const started = util.getValue(lines, "Started", "=", true);
                                    if (srvs.indexOf(srv) >= 0) {
                                        data.push({
                                            "name": srv,
                                            running: (started === "TRUE"),
                                            pcpu: 0,
                                            "pmem": 0
                                        });
                                        dataSrv.push(srv);
                                    }
                                }
                            }
                            const srvsMissing = srvs.filter((e) => {
                                return dataSrv.indexOf(e) === -1;
                            });
                            srvsMissing.forEach((srv) => {
                                data.push({
                                    'name': srv,
                                    'running': false,
                                    'pcpu': 0,
                                    'pmem': 0
                                });
                            });

                            if (callback) {
                                callback(data);
                            }
                            resolve(data);
                        } else {
                            srvs.forEach((srv) => {
                                data.push({
                                    'name': srv,
                                    'running': false,
                                    'pcpu': 0,
                                    'pmem': 0
                                });
                            });
                            if (callback) {
                                callback(data);
                            }
                            resolve(data);
                        }
                    });
                }
            } else {
                if (callback) {
                    callback({});
                }
                resolve({});
            }
        });
    });
}

exports.services = services;

// --------------------------
// running processes

function processes(callback) {

    let parsedhead = [];

    function parseHead(head, rights) {
        let space = (rights > 0);
        let count = 1;
        let from = 0;
        let to = 0;
        const result = [];
        for (let i = 0; i < head.length; i++) {
            if (count <= rights) {
                if (head[i] === " " && !space) {
                    to = i - 1;
                    result.push({
                        from,
                        to: to + 1,
                        cap: head.substring(from, to + 1)
                    });
                    from = to + 2;
                    count++;
                }
                space = head[i] === " ";
            } else {
                if (head[i] !== " " && space) {
                    to = i - 1;
                    if (from < to) {
                        result.push({
                            from,
                            to,
                            cap: head.substring(from, to)
                        });
                    }
                    from = to + 1;
                    count++;
                }
                space = head[i] === " ";
            }
        }
        to = 1000;
        result.push({
            from,
            to,
            cap: head.substring(from, to)
        });
        return result;

    }

    function getName(command) {
        command = command || "";
        let result = command.split(" ")[0];
        if (result.substr(-1) === ":") {
            result = result.substr(0, result.length - 1);
        }
        if (result.substr(0, 1) !== "[") {
            const parts = result.split("/");
            result = parts[parts.length - 1];
        }
        return result;
    }

    function parseLine(line) {
        let offset = 0;
        let offset2 = 0;

        function checkColumn(i) {
            offset = offset2;
            offset2 = line.substring(parsedhead[i].to + offset, 1000).indexOf(" ");
        }

        checkColumn(0);
        const pid = parseInt(line.substring(parsedhead[0].from + offset, parsedhead[0].to + offset2));
        checkColumn(1);
        const pcpu = parseFloat(line.substring(parsedhead[1].from + offset, parsedhead[1].to + offset2).replace(/,/g, "."));
        checkColumn(2);
        const pmem = parseFloat(line.substring(parsedhead[2].from + offset, parsedhead[2].to + offset2).replace(/,/g, "."));
        checkColumn(3);
        const priority = parseInt(line.substring(parsedhead[3].from + offset, parsedhead[3].to + offset2));
        checkColumn(4);
        const vsz = parseInt(line.substring(parsedhead[4].from + offset, parsedhead[4].to + offset2));
        checkColumn(5);
        const rss = parseInt(line.substring(parsedhead[5].from + offset, parsedhead[5].to + offset2));
        checkColumn(6);
        const nice = parseInt(line.substring(parsedhead[6].from + offset, parsedhead[6].to + offset2)) || 0;
        checkColumn(7);
        const started = line.substring(parsedhead[7].from + offset, parsedhead[7].to + offset2).trim();
        checkColumn(8);
        let state = line.substring(parsedhead[8].from + offset, parsedhead[8].to + offset2).trim();
        state = (state[0] === "R" ? "running" : (state[0] === "S" ? "sleeping" : (state[0] === "T" ? "stopped" : (state[0] === "W" ? "paging" : (state[0] === "X" ? "dead" : (state[0] === "Z" ? "zombie" : ((state[0] === "D" || state[0] === "U") ? "blocked" : "unknown")))))));
        checkColumn(9);
        let tty = line.substring(parsedhead[9].from + offset, parsedhead[9].to + offset2).trim();
        if (tty === "?" || tty === "??") {
            tty = "";
        }
        checkColumn(10);
        const user = line.substring(parsedhead[10].from + offset, parsedhead[10].to + offset2).trim();
        checkColumn(11);
        const command = line.substring(parsedhead[11].from + offset, parsedhead[11].to + offset2).trim().replace(/\[/g, "").replace(/]/g, "");

        return ({
            pid,
            name: _linux ? getName(command) : command,
            pcpu,
            pcpuu: 0,
            pcpus: 0,
            pmem,
            priority,
            mem_vsz: vsz,
            mem_rss: rss,
            nice,
            started,
            state,
            tty,
            user,
            command
        });
    }

    function parseProcesses(lines) {
        const result = [];
        if (lines.length > 1) {
            const head = lines[0];
            parsedhead = parseHead(head, 8);
            lines.shift();
            lines.forEach((line) => {
                if (line.trim() !== "") {
                    result.push(parseLine(line));
                }
            });
        }
        return result;
    }
    function parseProcesses2(lines) {

        function formatDateTime(time) {
            const month = (`0${(time.getMonth() + 1).toString()}`).substr(-2);
            const year = time.getFullYear().toString();
            const day = (`0${time.getDay().toString()}`).substr(-2);
            const hours = time.getHours().toString();
            const mins = time.getMinutes().toString();
            const secs = (`0${time.getSeconds().toString()}`).substr(-2);

            return (`${year}-${month}-${day} ${hours}:${mins}:${secs}`);
        }

        const result = [];
        lines.forEach((line) => {
            if (line.trim() !== "") {
                line = line.trim().replace(/ +/g, " ").replace(/,+/g, ".");
                const parts = line.split(" ");
                const command = parts.slice(8).join(" ");
                const pmem = parseFloat((1.0 * parseInt(parts[2]) * 1024 / os.totalmem()).toFixed(1));
                const elapsed_parts = parts[4].split(":");
                const started = formatDateTime(new Date(Date.now() - (elapsed_parts.length > 1 ? (elapsed_parts[0] * 60 + elapsed_parts[1]) * 1000 : elapsed_parts[0] * 1000)));

                result.push({
                    pid: parseInt(parts[0]),
                    name: getName(command),
                    pcpu: 0,
                    pcpuu: 0,
                    pcpus: 0,
                    pmem,
                    priority: 0,
                    mem_vsz: parseInt(parts[1]),
                    mem_rss: parseInt(parts[2]),
                    nice: parseInt(parts[3]),
                    started,
                    state: (parts[5] === "R" ? "running" : (parts[5] === "S" ? "sleeping" : (parts[5] === "T" ? "stopped" : (parts[5] === "W" ? "paging" : (parts[5] === "X" ? "dead" : (parts[5] === "Z" ? "zombie" : ((parts[5] === "D" || parts[5] === "U") ? "blocked" : "unknown"))))))),
                    tty: parts[6],
                    user: parts[7],
                    command
                });
            }
        });
        return result;
    }

    function parseProcStat(line) {
        const parts = line.replace(/ +/g, " ").split(" ");
        const user = (parts.length >= 2 ? parseInt(parts[1]) : 0);
        const nice = (parts.length >= 3 ? parseInt(parts[2]) : 0);
        const system = (parts.length >= 4 ? parseInt(parts[3]) : 0);
        const idle = (parts.length >= 5 ? parseInt(parts[4]) : 0);
        const iowait = (parts.length >= 6 ? parseInt(parts[5]) : 0);
        const irq = (parts.length >= 7 ? parseInt(parts[6]) : 0);
        const softirq = (parts.length >= 8 ? parseInt(parts[7]) : 0);
        const steal = (parts.length >= 9 ? parseInt(parts[8]) : 0);
        const guest = (parts.length >= 10 ? parseInt(parts[9]) : 0);
        const guest_nice = (parts.length >= 11 ? parseInt(parts[10]) : 0);
        return user + nice + system + idle + iowait + irq + softirq + steal + guest + guest_nice;
    }

    function parseProcPidStat(line, all) {
        let statparts = line.replace(/ +/g, ' ').split(')');
        if (statparts.length >= 2) {
            let parts = statparts[1].split(' ');
            if (parts.length >= 16) {
                let pid = parseInt(statparts[0].split(' ')[0]);
                let utime = parseInt(parts[12]);
                let stime = parseInt(parts[13]);
                let cutime = parseInt(parts[14]);
                let cstime = parseInt(parts[15]);

                // calc
                let pcpuu = 0;
                let pcpus = 0;
                if (_process_cpu.all > 0 && _process_cpu.list[pid]) {
                    pcpuu = (utime + cutime - _process_cpu.list[pid].utime - _process_cpu.list[pid].cutime) / (all - _process_cpu.all) * 100; // user
                    pcpus = (stime + cstime - _process_cpu.list[pid].stime - _process_cpu.list[pid].cstime) / (all - _process_cpu.all) * 100; // system
                } else {
                    pcpuu = (utime + cutime) / (all) * 100; // user
                    pcpus = (stime + cstime) / (all) * 100; // system
                }
                return {
                    pid: pid,
                    utime: utime,
                    stime: stime,
                    cutime: cutime,
                    cstime: cstime,
                    pcpuu: pcpuu,
                    pcpus: pcpus
                };
            }
            return {
                pid: 0,
                utime: 0,
                stime: 0,
                cutime: 0,
                cstime: 0,
                pcpuu: 0,
                pcpus: 0
            };

        }
        return {
            pid: 0,
            utime: 0,
            stime: 0,
            cutime: 0,
            cstime: 0,
            pcpuu: 0,
            pcpus: 0
        };

    }

    function calcProcPidStat(procStat, all) {
        // calc
        let pcpuu = 0;
        let pcpus = 0;
        if (_process_cpu.all > 0 && _process_cpu.list[procStat.pid]) {
            pcpuu = (procStat.utime - _process_cpu.list[procStat.pid].utime) / (all - _process_cpu.all) * 100; // user
            pcpus = (procStat.stime - _process_cpu.list[procStat.pid].stime) / (all - _process_cpu.all) * 100; // system
        } else {
            pcpuu = (procStat.utime) / (all) * 100; // user
            pcpus = (procStat.stime) / (all) * 100; // system
        }
        return {
            pid: procStat.pid,
            utime: procStat.utime,
            stime: procStat.stime,
            pcpuu,
            pcpus
        };
    }

    return new Promise((resolve) => {
        process.nextTick(() => {
            const result = {
                all: 0,
                running: 0,
                blocked: 0,
                sleeping: 0,
                unknown: 0,
                list: []
            };

            let cmd = "";

            if ((_process_cpu.ms && Date.now() - _process_cpu.ms >= 500) || _process_cpu.ms === 0) {
                if (_linux || _freebsd || _openbsd || _darwin || _sunos) {
                    if (_linux) {
                        cmd = "ps -axo pid:10,pcpu:6,pmem:6,pri:5,vsz:10,rss:10,ni:5,start:20,state:20,tty:20,user:20,command";
                    }
                    if (_freebsd || _openbsd) {
                        cmd = "ps -axo pid,pcpu,pmem,pri,vsz,rss,ni,start,state,tty,user,command";
                    }
                    if (_darwin) {
                        cmd = "ps -acxo pid,pcpu,pmem,pri,vsz,rss,nice,start,state,tty,user,command -r";
                    }
                    if (_sunos) {
                        cmd = "ps -Ao pid,pcpu,pmem,pri,vsz,rss,nice,stime,s,tty,user,comm";
                    }
                    exec(cmd, (error, stdout) => {
                        if (!error) {
                            result.list = parseProcesses(stdout.toString().split("\n"));
                            result.all = result.list.length;
                            result.running = result.list.filter((e) => {
                                return e.state === 'running';
                            }).length;
                            result.blocked = result.list.filter((e) => {
                                return e.state === 'blocked';
                            }).length;
                            result.sleeping = result.list.filter((e) => {
                                return e.state === 'sleeping';
                            }).length;

                            if (_linux) {
                                // calc process_cpu - ps is not accurate in linux!
                                cmd = 'cat /proc/stat | grep "cpu "';
                                for (let i = 0; i < result.list.length; i++) {
                                    cmd += (";cat /proc/" + result.list[i].pid + "/stat");
                                }
                                exec(cmd, (error, stdout) => {
                                    let curr_processes = stdout.toString().split('\n');

                                    // first line (all - /proc/stat)
                                    let all = parseProcStat(curr_processes.shift());

                                    // process
                                    let list_new = {};
                                    let resultProcess = {};
                                    for (let i = 0; i < curr_processes.length; i++) {
                                        resultProcess = parseProcPidStat(curr_processes[i], all);

                                        if (resultProcess.pid) {

                                            // store pcpu in outer array
                                            let listPos = result.list.map(function (e) { return e.pid; }).indexOf(resultProcess.pid);
                                            if (listPos >= 0) {
                                                result.list[listPos].pcpu = resultProcess.pcpuu + resultProcess.pcpus;
                                                result.list[listPos].pcpuu = resultProcess.pcpuu;
                                                result.list[listPos].pcpus = resultProcess.pcpus;
                                            }

                                            // save new values
                                            list_new[resultProcess.pid] = {
                                                pcpuu: resultProcess.pcpuu,
                                                pcpus: resultProcess.pcpus,
                                                utime: resultProcess.utime,
                                                stime: resultProcess.stime,
                                                cutime: resultProcess.cutime,
                                                cstime: resultProcess.cstime
                                            };
                                        }
                                    }

                                    // store old values
                                    _process_cpu.all = all;
                                    _process_cpu.list = list_new;
                                    _process_cpu.ms = Date.now() - _process_cpu.ms;
                                    _process_cpu.result = result;
                                    if (callback) { callback(result); }
                                    resolve(result);
                                });
                            } else {
                                if (callback) {
                                    callback(result);
                                }
                                resolve(result);
                            }
                        } else {
                            cmd = "ps -o pid,vsz,rss,nice,etime,stat,tty,user,comm";
                            if (_sunos) {
                                cmd = "ps -o pid,vsz,rss,nice,etime,s,tty,user,comm";
                            }
                            exec(cmd, (error, stdout) => {
                                if (!error) {
                                    let lines = stdout.toString().split('\n');
                                    lines.shift();

                                    result.list = parseProcesses2(lines);
                                    result.all = result.list.length;
                                    result.running = result.list.filter(function (e) {
                                        return e.state === 'running';
                                    }).length;
                                    result.blocked = result.list.filter(function (e) {
                                        return e.state === 'blocked';
                                    }).length;
                                    result.sleeping = result.list.filter(function (e) {
                                        return e.state === 'sleeping';
                                    }).length;
                                    if (callback) { callback(result); }
                                    resolve(result);
                                } else {
                                    if (callback) { callback(result); }
                                    resolve(result);
                                }
                            });
                        }
                    });
                }
                if (_windows) {
                    exec(`${util.getWmic()} process get /value`, { maxBuffer: 1024 * 1000, windowsHide: true }, (error, stdout) => {
                        if (!error) {
                            const processSections = stdout.split(/\n\s*\n/);
                            const procs = [];
                            const procStats = [];
                            const list_new = {};
                            let allcpuu = 0;
                            let allcpus = 0;
                            for (let i = 0; i < processSections.length; i++) {
                                if (processSections[i].trim() !== "") {
                                    const lines = processSections[i].trim().split("\r\n");
                                    const pid = parseInt(util.getValue(lines, "ProcessId", "=", true), 10);
                                    const statusValue = util.getValue(lines, "ExecutionState", "=");
                                    const name = util.getValue(lines, "Caption", "=", true);
                                    const commandLine = util.getValue(lines, "CommandLine", "=", true);
                                    const utime = parseInt(util.getValue(lines, "UserModeTime", "=", true), 10);
                                    const stime = parseInt(util.getValue(lines, "KernelModeTime", "=", true), 10);
                                    const mem = parseInt(util.getValue(lines, "WorkingSetSize", "=", true), 10);
                                    allcpuu = allcpuu + utime;
                                    allcpus = allcpus + stime;
                                    result.all++;
                                    if (!statusValue) {
                                        result.unknown++;
                                    }
                                    if (statusValue === "3") {
                                        result.running++;
                                    }
                                    if (statusValue === "4" || statusValue === "5") {
                                        result.blocked++;
                                    }

                                    procStats.push({
                                        pid,
                                        utime,
                                        stime,
                                        pcpu: 0,
                                        pcpuu: 0,
                                        pcpus: 0
                                    });
                                    procs.push({
                                        pid,
                                        name,
                                        pcpu: 0,
                                        pcpuu: 0,
                                        pcpus: 0,
                                        pmem: mem / os.totalmem() * 100,
                                        priority: parseInt(util.getValue(lines, "Priority", "=", true), 10),
                                        mem_vsz: parseInt(util.getValue(lines, "PageFileUsage", "=", true), 10),
                                        mem_rss: Math.floor(parseInt(util.getValue(lines, "WorkingSetSize", "=", true), 10) / 1024),
                                        nice: 0,
                                        started: parseTimeWin(util.getValue(lines, "CreationDate", "=", true)),
                                        state: (!statusValue ? _winStatusValues[0] : _winStatusValues[statusValue]),
                                        tty: "",
                                        user: "",
                                        command: commandLine || name
                                    });
                                }
                            }
                            result.sleeping = result.all - result.running - result.blocked - result.unknown;
                            result.list = procs;
                            for (let i = 0; i < procStats.length; i++) {
                                const resultProcess = calcProcPidStat(procStats[i], allcpuu + allcpus);

                                // store pcpu in outer array
                                const listPos = result.list.map((e) => { return e.pid; }).indexOf(resultProcess.pid);
                                if (listPos >= 0) {
                                    result.list[listPos].pcpu = resultProcess.pcpuu + resultProcess.pcpus;
                                    result.list[listPos].pcpuu = resultProcess.pcpuu;
                                    result.list[listPos].pcpus = resultProcess.pcpus;
                                }

                                // save new values
                                list_new[resultProcess.pid] = {
                                    pcpuu: resultProcess.pcpuu,
                                    pcpus: resultProcess.pcpus,
                                    utime: resultProcess.utime,
                                    stime: resultProcess.stime
                                };
                            }
                            // store old values
                            _process_cpu.all = allcpuu + allcpus;
                            _process_cpu.list = list_new;
                            _process_cpu.ms = Date.now() - _process_cpu.ms;
                            _process_cpu.result = result;
                        }
                        if (callback) {
                            callback(result);
                        }
                        resolve(result);
                    });
                }
            } else {
                if (callback) {
                    callback(_process_cpu.result);
                }
                resolve(_process_cpu.result);
            }
        });
    });
}

exports.processes = processes;

// --------------------------
// PS - process load
// get detailed information about a certain process
// (PID, CPU-Usage %, Mem-Usage %)

function processLoad(proc, callback) {

    // fallback - if only callback is given
    if (util.isFunction(proc) && !callback) {
        callback = proc;
        proc = "";
    }

    return new Promise((resolve, reject) => {
        process.nextTick(() => {
            if (_windows) {
                const error = new Error(NOT_SUPPORTED);
                if (callback) {
                    callback(NOT_SUPPORTED);
                }
                reject(error);
            }

            let result = {
                proc,
                pid: -1,
                cpu: 0,
                mem: 0
            };

            if (proc) {
                exec(`ps -axo pid,pcpu,pmem,comm | grep ${proc} | grep -v grep`, (error, stdout) => {
                    if (!error) {
                        const lines = stdout.toString().split("\n");

                        let pid = 0;
                        let cpu = 0;
                        let mem = 0;

                        lines.forEach((line) => {
                            let data = line.replace(/ +/g, ' ').split(' ');
                            if (data.length > 3) {
                                pid = (!pid ? parseInt(data[0]) : 0);
                                cpu = cpu + parseFloat(data[1].replace(',', '.'));
                                mem = mem + parseFloat(data[2].replace(',', '.'));
                            }
                        });
                        // TODO: calc process_cpu - ps is not accurate in linux!

                        result = {
                            proc: proc,
                            pid: pid,
                            "cpu": parseFloat((cpu / lines.length).toFixed(2)),
                            "mem": parseFloat((mem / lines.length).toFixed(2))
                        };
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
}

exports.processLoad = processLoad;



