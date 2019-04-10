const {
    std: { childProcess: { exec } }
} = adone;

const util = require("./util");

const _platform = process.platform;

const _linux = (_platform === "linux");
const _darwin = (_platform === "darwin");
const _windows = (_platform === "win32");
const _freebsd = (_platform === "freebsd");
const _openbsd = (_platform === "openbsd");
const _sunos = (_platform === "sunos");

// --------------------------
// array of users online = sessions

const parseUsersLinux = (lines, phase) => {
    const result = [];
    const result_who = [];
    const result_w = {};
    let w_first = true;
    let w_header = [];
    const w_pos = [];
    let who_line = {};

    let is_whopart = true;
    lines.forEach((line) => {
        if (line === "---") {
            is_whopart = false;
        } else {
            const l = line.replace(/ +/g, " ").split(" ");

            // who part
            if (is_whopart) {
                result_who.push({
                    user: l[0],
                    tty: l[1],
                    date: l[2],
                    time: l[3],
                    ip: (l && l.length > 4) ? l[4].replace(/\(/g, "").replace(/\)/g, "") : ""
                });
            } else {
                // w part
                if (w_first) { // header
                    w_header = l;
                    w_header.forEach((item) => {
                        w_pos.push(line.indexOf(item));
                    });
                    w_first = false;
                } else {
                    // split by w_pos
                    result_w.user = line.substring(w_pos[0], w_pos[1] - 1).trim();
                    result_w.tty = line.substring(w_pos[1], w_pos[2] - 1).trim();
                    result_w.ip = line.substring(w_pos[2], w_pos[3] - 1).replace(/\(/g, "").replace(/\)/g, "").trim();
                    result_w.command = line.substring(w_pos[7], 1000).trim();
                    // find corresponding 'who' line
                    who_line = result_who.filter((obj) => {
                        return (obj.user.substring(0, 8).trim() === result_w.user && obj.tty === result_w.tty);
                    });
                    if (who_line.length === 1) {
                        result.push({
                            user: who_line[0].user,
                            tty: who_line[0].tty,
                            date: who_line[0].date,
                            time: who_line[0].time,
                            ip: who_line[0].ip,
                            command: result_w.command
                        });
                    }
                }
            }
        }
    });
    if (result.length === 0 && phase === 2) {
        return result_who;
    }
    return result;
};

const parseUsersDarwin = (lines) => {
    const result = [];
    const result_who = [];
    const result_w = {};
    let who_line = {};

    let is_whopart = true;
    lines.forEach((line) => {
        if (line === "---") {
            is_whopart = false;
        } else {
            const l = line.replace(/ +/g, " ").split(" ");

            // who part
            if (is_whopart) {
                result_who.push({
                    user: l[0],
                    tty: l[1],
                    date: `${new Date().getFullYear()}-${(`0${"JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC".indexOf(l[2].toUpperCase()) / 3 + 1}`).slice(-2)}-${(`0${l[3]}`).slice(-2)}`,
                    time: l[4]
                });
            } else {
                // w part
                // split by w_pos
                result_w.user = l[0];
                result_w.tty = l[1];
                result_w.ip = (l[2] !== "-") ? l[2] : "";
                result_w.command = l.slice(5, 1000).join(" ");
                // find corresponding 'who' line
                who_line = result_who.filter((obj) => {
                    return (obj.user === result_w.user && (obj.tty.substring(3, 1000) === result_w.tty || obj.tty === result_w.tty));
                });
                if (who_line.length === 1) {
                    result.push({
                        user: who_line[0].user,
                        tty: who_line[0].tty,
                        date: who_line[0].date,
                        time: who_line[0].time,
                        ip: result_w.ip,
                        command: result_w.command
                    });
                }
            }
        }
    });
    return result;
};

const parseUsersWin = (lines) => {
    const result = [];
    const header = lines[0];
    const headerDelimiter = [];
    if (header) {
        const start = (header[0] === " ") ? 1 : 0;
        headerDelimiter.push(start - 1);
        let nextSpace = 0;
        for (let i = start + 1; i < header.length; i++) {
            if (header[i] === " " && header[i - 1] === " ") {
                nextSpace = i;
            } else {
                if (nextSpace) {
                    headerDelimiter.push(nextSpace);
                    nextSpace = 0;
                }
            }
        }
    }
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const user = lines[i].substring(headerDelimiter[0] + 1, headerDelimiter[1]).trim() || "";
            const tty = lines[i].substring(headerDelimiter[1] + 1, headerDelimiter[2] - 2).trim() || "";
            const dateTime = util.parseDateTime(lines[i].substring(headerDelimiter[5] + 1, 2000).trim()) || "";
            result.push({
                user,
                tty,
                date: dateTime.date,
                time: dateTime.time,
                ip: "",
                command: ""
            });
        }
    }
    return result;
};

export const users = (callback) => {
    return new Promise((resolve) => {
        process.nextTick(() => {
            let result = [];

            // linux
            if (_linux) {
                exec('who --ips; echo "---"; w | tail -n +2', (error, stdout) => {
                    if (!error) {
                        // lines / split
                        let lines = stdout.toString().split("\n");
                        result = parseUsersLinux(lines, 1);
                        if (result.length === 0) {
                            exec('who; echo "---"; w | tail -n +2', (error, stdout) => {
                                if (!error) {
                                    // lines / split
                                    lines = stdout.toString().split("\n");
                                    result = parseUsersLinux(lines, 2);
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
                    } else {
                        if (callback) {
                            callback(result);
                        }
                        resolve(result);
                    }
                });
            }
            if (_freebsd || _openbsd) {
                exec('who; echo "---"; w -ih', (error, stdout) => {
                    if (!error) {
                        // lines / split
                        const lines = stdout.toString().split("\n");
                        result = parseUsersDarwin(lines);
                    }
                    if (callback) {
                        callback(result);
                    }
                    resolve(result);
                });
            }
            if (_sunos) {
                exec('who; echo "---"; w -h', (error, stdout) => {
                    if (!error) {
                        // lines / split
                        const lines = stdout.toString().split("\n");
                        result = parseUsersDarwin(lines);
                    }
                    if (callback) {
                        callback(result);
                    }
                    resolve(result);
                });
            }

            if (_darwin) {
                exec('who; echo "---"; w -ih', (error, stdout) => {
                    if (!error) {
                        // lines / split
                        const lines = stdout.toString().split("\n");
                        result = parseUsersDarwin(lines);
                    }
                    if (callback) {
                        callback(result);
                    }
                    resolve(result);
                });
            }
            if (_windows) {
                try {
                    exec("query user", util.execOptsWin, (error, stdout) => {
                        if (stdout) {
                            // lines / split
                            const lines = stdout.toString().split("\r\n");
                            result = parseUsersWin(lines);
                        }
                        if (callback) {
                            callback(result);
                        }
                        resolve(result);
                    });
                } catch (e) {
                    if (callback) {
                        callback(result);
                    }
                    resolve(result);
                }
            }

        });
    });
};
