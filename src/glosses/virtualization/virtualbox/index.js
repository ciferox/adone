import scanCodes from "./scan_codes";

const { std, noop } = adone;
const exec = (cmd) => new Promise((resolve, reject) => {
    std.child_process.exec(cmd, (err, stdout, stderr) => {
        if (err) {
            return reject({ err, stderr, stdout });
        }
        resolve({ stdout, stderr });
    });
});

class Machine {
    constructor(vbox, name) {
        this.vbox = vbox;
        this.name = name;
    }

    reset() {
        return this.vbox.reset(this.name);
    }

    resume() {
        return this.vbox.resume(this.name);
    }

    start(options) {
        return this.vbox.start(this.name, options);
    }

    stop() {
        return this.vbox.stop(this.name);
    }

    savestate() {
        return this.vbox.savestate(this.name);
    }

    poweroff() {
        return this.vbox.poweroff(this.name);
    }

    acpiPowerButton() {
        return this.vbox.acpiPowerButton(this.name);
    }

    acpiSleepButton() {
        return this.vbox.acpiSleepButton(this.name);
    }

    getSnapshots() {
        return this.vbox.getSnapshots(this.name);
    }

    takeSnapshot(options) {
        return this.vbox.takeSnapshot(this.name, options);
    }

    deleteSnapshot(uuid) {
        return this.vbox.deleteSnapshot(this.name, uuid);
    }

    restoreSnapshot(uuid) {
        return this.vbox.restoreSnapshot(this.name, uuid);
    }

    putKeyboardScancode(codes) {
        return this.vbox.putKeyboardScancode(this.name, codes);
    }

    getOSType() {
        return this.vbox.getOSType(this.name);
    }

    getProperty(key) {
        return this.vbox.getProperty(this.name, key);
    }

    internalExec(options) {
        return this.vbox.internalExec(this.name, options);
    }

    internalKill(options) {
        return this.vbox.internalKill(this.name, options);
    }
}

class VirtualBox {
    constructor() {
        const { platform } = process;
        if (/^win/.test(platform)) {
            // what if it doesnt exist?
            const vBoxInstallPath = process.env.VBOX_INSTALL_PATH || process.env.VBOX_MSI_INSTALL_PATH;
            this.manageBinary = `"${vBoxInstallPath} \\VBoxManage.exe"`;
        } else if (/^darwin/.test(platform) || /^linux/.test(platform)) {
            // Mac OS X and most Linux use the same binary name, in the path
            this.manageBinary = "vboxmanage";
        } else {
            // Otherwise (e.g., SunOS) hope it's in the path
            this.manageBinary = "vboxmanage";
        }
    }

    version() {
        return exec(`${this.manageBinary} --version`).then(({ stdout }) => Number(stdout.split(".")[0]));
    }

    command(vmname) {
        return exec(vmname).catch(({ err, stdout, stderr }) => {
            if (stderr || stdout) {
                err = new Error(stderr || stdout);
            }
            throw err;
        }).then(({ stdout }) => stdout);
    }

    control(vmname) {
        return this.command(`VBoxControl ${vmname}`);
    }

    manage(vmname) {
        return this.command(`${this.manageBinary} ${vmname}`);
    }

    pause(vmname) {
        return this.manage(`controlvm "${vmname}" pause`).then(noop);
    }

    async list() {
        const rawRunning = await this.manage("list \"runningvms\"");
        const running = new Set(rawRunning.split(/\r?\n/g).map((row) => {
            // "name" {uuid}
            return row.slice(row.lastIndexOf(" ") + 2, -1);
        }));

        const rawVms = await this.manage("list \"vms\"");
        const vms = new Map();
        for (const row of rawVms.split(/\n/g)) {
            if (row === "") {
                continue;
            }
            const x = row.lastIndexOf(" ");
            const name = row.slice(1, x - 1);
            const uuid = row.slice(x + 2, -1);
            vms.set(uuid, { uuid, name, running: running.has(uuid) });
        }
        return vms;
    }

    reset(vmname) {
        return this.manage(`controlvm "${vmname}" reset`).then(noop);
    }

    resume(vmname) {
        return this.manage(`controlvm "${vmname}" reset`).then(noop);
    }

    start(vmname, { gui = false } = {}) {
        return this.manage(`-nologo startvm "${vmname}" --type ${gui ? "gui" : "headless"}`).catch((err) => {
            if (err.message.includes("VBOX_E_INVALID_OBJECT_STATE")) {
                return null;
            }
            throw err;
        }).then(noop);
    }

    stop(vmname) {
        return this.manage(`controlvm "${vmname}" savestate`).then(noop);
    }

    savestate(vmname) {
        return this.stop(vmname);
    }

    poweroff(vmname) {
        return this.manage(`controlvm "${vmname}" poweroff`).then(noop);
    }

    acpiPowerButton(vmname) {
        return this.manage(`controlvm "${vmname}" acpipowerbutton`).then(noop);
    }

    acpiSleepButton(vmname) {
        return this.manage(`controlvm "${vmname}" acpisleepbutton`).then(noop);
    }

    getSnapshots(vmname) {
        return this.manage(`snapshot "${vmname}" list --machinereadable`).then((stdout) => {
            let current;
            let snapshot;
            const snapshots = new Map();
            for (const row of stdout.split("\n")) {
                row.replace(/^(CurrentSnapshotUUID|SnapshotName|SnapshotUUID).*="(.*)"$/, (line, key, value) => {
                    if (key === "CurrentSnapshotUUID") {
                        current = value;
                    } else if (key === "SnapshotName") {
                        snapshot = { name: value, uuid: null };
                    } else {
                        // SnapshotUUID
                        snapshot.uuid = value;
                        snapshots.set(value, snapshot);
                    }
                });
            }
            return snapshots.set("current", snapshots.get(current));
        });
    }

    takeSnapshot(vmname, { name, description, live = false } = {}) {
        if (!name) {
            throw new adone.x.InvalidArgument("You must set some name");
        }
        let cmd = `snapshot "${vmname}" take "${name}"`;
        if (description) {
            cmd += ` --description "${description}"`;
        }
        if (live === true) {
            cmd += " --live";
        }
        return this.manage(cmd).then((stdout) => stdout.trim().match(/UUID: ([a-f0-9\-]+)$/)[1]);
    }

    deleteSnapshot(vmname, uuid) {
        return this.manage(`snapshot "${vmname}" delete "${uuid}"`).then(noop);
    }

    restoreSnapshot(vmname, uuid) {
        return this.manage(`snapshot "${vmname}" restore "${uuid}"`).then(noop);
    }

    putKeyboardScancode(vmname, codes) {
        const scancodes = [];
        for (const code of codes) {
            const scan = code.type === "down" ? scanCodes[code.key] : scanCodes.getBreakCode(code.key);
            for (const i of scan) {
                let s = i.toString(16);
                if (s.length === 1) {
                    s = `0${s}`;
                }
                scancodes.push(s);
            }

        }
        return this.manage(`controlvm "${vmname}" keyboardputscancode ${scancodes.join(" ")}`);
    }

    getOSType(vmname) {
        return exec(`${this.manageBinary} showvminfo -machinereadable "${vmname}"`).then(({ stdout }) => {
            if (stdout.includes("ostype=\"Windows")) {
                return "windows";
            }
            if (stdout.includes("ostype=\"MacOS")) {
                return "mac";
            }
            return "linux";
        });
    }

    getProperty(vmname, key) {
        return this.manage(`guestproperty get "${vmname}" "${key}"`).then((stdout) => {
            return stdout.slice(7).trim();  // "Value: "
        });
    }

    async internalExec(vmname, { username = "Guest", password, path, params = "" } = {}) {
        if (adone.is.array(params)) {
            // $FlowIgnore it is an array
            params = params.join(" ");
        }
        const osType = await this.getOSType(vmname);
        let cmd = `guestcontrol "${vmname}"`;
        const runcmd = await this.version() === 5 ? " run" : " execute --image";
        if (osType === "windows") {
            path = path.replace(/\\/g, "\\\\");
            cmd += `${runcmd} "cmd.exe" --username "${username}" ${password ? ` --password "${password}"` : ""} -- /c "${path}" "${params}"`;
        } else if (osType === "mac") {
            cmd += `${runcmd} "/usr/bin/open -a" --username ${username} ${password ? ` --password "${password}"` : ""} -- -c "${path}" "${params}"`;
        } else if (osType === "linux") {
            cmd += `${runcmd} "/bin/sh" --username "${username}" ${password ? ` --password "${password}"` : ""} -- -c "${path}" "${params}"`;
        }
        // TODO: return stdout/stderr
        return this.manage(cmd).then(noop);
    }

    async internalKill(vmname, { path, params, username, password } = {}) {
        const osType = await this.getOSType(vmname);
        params = params || path;
        if (osType === "windows") {
            return this.internalExec(vmname, {
                username,
                password,
                path: "C:\\Windows\\System32\\taskkill.exe /im ",
                params
            });
        } else if (osType === "mac" || osType === "linux") {
            return this.internalExec(vmname, {
                username,
                password,
                path: "sudo killall",
                params
            });
        }
    }

    get(vmname) {
        return new Machine(this, vmname);
    }
}

const vbox = new VirtualBox();

vbox.scanCodes = scanCodes;

export default adone.asNamespace(vbox);
