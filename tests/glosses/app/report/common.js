const {
    is,
    fs,
    std: { child_process }
} = adone;

const osMap = {
    aix: "AIX",
    darwin: "Darwin",
    linux: "Linux",
    sunos: "SunOS",
    win32: "Windows"
};

const REPORT_SECTIONS = [
    "Node Report",
    "JavaScript Stack Trace",
    "JavaScript Heap",
    "System Information"
];

const reNewline = "(?:\\r*\\n)";

export const findReports = async (pid) => {
    // Default filenames are of the form node-report.<date>.<time>.<pid>.<seq>.txt
    const format = `^report\\.\\d+\\.\\d+\\.${pid}\\.\\d+\\.txt$`;
    const filePattern = new RegExp(format);
    const files = await fs.readdir(".");
    return files.filter((file) => filePattern.test(file));
};

export const isPPC = () => {
    return process.arch.startsWith("ppc");
};

const getLibcPath = (section) => {
    const libcMatch = /\n\s+(\/.*\/libc.so.6)\b/.exec(section);
    return (!is.nil(libcMatch) ? libcMatch[1] : undefined);
};

const getLibcVersion = (path) => {
    if (!path) {
        return undefined;
    }
    const child = child_process.spawnSync("strings", [path], { encoding: "utf8" });
    const match = /GNU C Library.*\bversion ([\d.]+)\b/.exec(child.stdout);
    return (!is.nil(match) ? match[1] : undefined);
};

export const getSection = (report, section) => {
    const re = new RegExp(`==== ${section} =+${reNewline}+([\\S\\s]+?)${
        reNewline}+={80}${reNewline}`);
    const match = re.exec(report);
    return match ? match[1] : "";
};


export const validateContent = function (data, options) {
    const pid = options ? options.pid : process.pid;
    const reportContents = data.toString();
    const nodeComponents = Object.keys(process.versions);
    const expectedVersions = options ? options.expectedVersions || nodeComponents : nodeComponents;
    const expectedException = options.expectedException;
    const sections = REPORT_SECTIONS.slice();
    if (expectedException) {
        sections.push("JavaScript Exception Details");
    }

    const glibcRE = /\(glibc:\s([\d.]+)/;
    const nodeReportSection = getSection(reportContents, "Node Report");
    const sysInfoSection = getSection(reportContents, "System Information");
    const exceptionSection = getSection(reportContents, "JavaScript Exception Details");
    const libcPath = getLibcPath(sysInfoSection);
    const libcVersion = getLibcVersion(libcPath);

    // Check all sections are present
    sections.forEach((section) => {
        assert.match(reportContents, new RegExp(`==== ${section}`), `Checking report contains ${section} section`);
    });

    // Check report header section
    assert.match(nodeReportSection, new RegExp(`Process ID: ${pid}`),
        "Node Report header section contains expected process ID");
    if (options && options.expectNodeVersion === false) {
        assert.match(nodeReportSection, /Unable to determine Node.js version/, "Node Report header section contains expected Node.js version");
    } else {
        assert.match(nodeReportSection, new RegExp(`Node.js version: ${process.version}`), "Node Report header section contains expected Node.js version");
    }
    if (options && expectedException) {
        assert.match(exceptionSection, new RegExp(`Uncaught Error: ${expectedException}`), "Node Report JavaScript Exception contains expected message");
    }
    if (options && options.commandline) {
        if (is.windows) {
            // On Windows we need to strip double quotes from the command line in
            // the report, and escape backslashes in the regex comparison string.
            assert.match(nodeReportSection.replace(/"/g, ""), new RegExp(`Command line: ${(options.commandline).replace(/\\/g, "\\\\")}`),
                "Checking report contains expected command line");
        } else {
            assert.match(nodeReportSection, new RegExp(`Command line: ${options.commandline}`), "Checking report contains expected command line");
        }
    }

    nodeComponents.forEach((c) => {
        if (c !== "node") {
            if (!expectedVersions.includes(c)) {
                assert.notMatch(nodeReportSection, new RegExp(`${c}: ${process.versions[c]}`), `Node Report header section does not contain ${c} version`);
            } else {
                assert.match(nodeReportSection, new RegExp(`${c}: ${process.versions[c]}`), `Node Report header section contains expected ${c} version`);
            }
        }
    });

    assert.match(nodeReportSection,
        new RegExp(`report version: ${adone.package.version}`),
        "Node Report header section contains expected Node Report version");
    const os = require("os");
    if (is.windows) {
        assert.match(nodeReportSection,
            new RegExp(`Machine: ${os.hostname()}`, "i"), // ignore case on Windows
            "Checking machine name in report header section contains os.hostname()");
    } else if (is.aix) {
        assert.match(nodeReportSection,
            new RegExp(`Machine: ${os.hostname().split(".")[0]}`), // truncate on AIX
            "Checking machine name in report header section contains os.hostname()");
    } else {
        assert.match(nodeReportSection,
            new RegExp(`Machine: ${os.hostname()}`), "Checking machine name in report header section contains os.hostname()");
    }

    const osName = osMap[os.platform()];
    const osVersion = nodeReportSection.match(/OS version: .*(?:\r*\n)/);
    if (is.windows) {
        assert.match(osVersion, new RegExp(`OS version: ${osName}`), "Checking OS version");
    } else if (is.aix && !os.release().includes(".")) {
        // For Node.js prior to os.release() fix for AIX:
        // https://github.com/nodejs/node/pull/10245
        assert.match(osVersion, new RegExp(`OS version: ${osName} \\d+.${os.release()}`), "Checking OS version");
    } else {
        assert.match(osVersion, new RegExp(`OS version: ${osName} .*${os.release()}`), "Checking OS version");
    }

    // Check report System Information section
    // If the report contains a glibc version, check it against libc.so.6
    const glibcMatch = glibcRE.exec(nodeReportSection);
    if (!is.nil(glibcMatch) && libcVersion) {
        assert.strictEqual(glibcMatch[1], libcVersion, `Checking reported runtime glibc version against ${libcPath}`);
    }
    // Find a line which ends with "/report.node" or "\report.node" (Unix or
    // Windows paths) to see if the library for node report was loaded.
    assert.match(sysInfoSection, / {2}.*(\/|\\)report\.node/, "System Information section contains report library.");
};

export const validate = async (report, options) => {
    const data = await fs.readFile(report);
    validateContent(data, options);
};
