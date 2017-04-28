
const { is } = adone;
const { Process } = adone.metrics;

let HZ = 1000;
let bootTime = 0;

const getSystemUptimeFromProc = () => {
    const parts = adone.fs.readWordsSync("/proc/uptime");
    if (parts.length > 0) {
        return Number.parseFloat(parts[0]);
    }
};

export default class LinuxProcess extends Process {
    constructor(name, path, state, pid, parentPid, threadCount, priority, virtualSize, residentSetSize, kernelTime, userTime, startTime, bytesRead, bytesWritten, now) {
        super();
        this.name = name;
        this.path = path;
        switch (state) {
            case "R": this.state = Process.RUNNING; break;
            case "S": this.state = Process.SLEEPING; break;
            case "D": this.state = Process.WAITING; break;
            case "Z": this.state = Process.ZOMBIE; break;
            case "T": this.state = Process.STOPPED; break;
            default: this.state = Process.OTHER; break;
        }
        this.pid = pid;
        this.parentPid = parentPid;
        this.threadCount = threadCount;
        this.priority = priority;
        this.virtualSize = virtualSize;
        this.residentSetSize = residentSetSize;
        this.kernelTime = (kernelTime * 1000 / HZ) >>> 0;
        this.userTime = (userTime * 1000 / HZ) >>> 0;
        this.startTime = (bootTime + ((startTime * 1000 / HZ) >>> 0));
        this.upTime = now - this.startTime;
        this.bytesRead = bytesRead;
        this.bytesWritten = bytesWritten;
    }

    static _initialize() {
        // Search through all processes to find the youngest one, with the latest start time since boot.
        // Iterate /proc/[pid]/stat checking the creation time (field 22, jiffies since boot) for the largest value
        const pids = LinuxProcess.getPids();

        let youngestJiffies = 0;
        let youngestPid = null;
        for (const pid of pids) {
            const parts = adone.fs.readWordsSync(adone.sprintf("/proc/%s/stat", pid));
            if (is.nil(parts) || parts.length < 22) continue;
            const jiffies = Number.parseInt(parts[21]);
            if (jiffies > youngestJiffies) {
                youngestJiffies = jiffies;
                youngestPid = pid;
            }
        }

        if (is.null(youngestPid)) return;

        let startTimeSecsSinceBoot = getSystemUptimeFromProc();
        bootTime = (new Date()).getTime() -  ((1000 * startTimeSecsSinceBoot) >>> 0);
        // Now execute `ps -p <pid> -o etimes=` to get the elapsed time of this
        // process in seconds.Timeline:
        // BOOT|<----jiffies---->|<----etime---->|NOW
        // BOOT|<------------uptime------------->|NOW

        // // This takes advantage of the fact that ps does all the heavy lifting of sorting out HZ internally.
        let etime = adone.std.child_process.execSync(adone.sprintf("ps -p %d -o etimes=", youngestPid));
        if (is.buffer(etime)) {
            etime = etime.toString();
        }
        etime = etime.trim();
        // Since we picked the youngest process, it's safe to assume an etime close to 0 in case this command fails; the longer the system has been up, the less impact this assumption will have
        startTimeSecsSinceBoot -= Number.parseFloat(etime);
        // By subtracting etime (secs) from uptime (secs) we get uptime (in secs) when the process was started. This correlates with startTime in jiffies for this process
        if (startTimeSecsSinceBoot <= 0) return;

        // divide jiffies (since boot) by seconds (since boot)
        HZ = (youngestJiffies / startTimeSecsSinceBoot + 0.5) >>> 0;
    }

    static getPids() {
        const re = new RegExp("\\d+");
        return adone.std.fs.readdirSync("/proc").map((path) => adone.std.path.basename(path)).filter((file) => re.test(file));
    }
}
