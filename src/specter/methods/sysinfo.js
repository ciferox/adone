const normalizeMachine = (val) => {
    switch (val) {
        case "x86_64": return "x64";
        default: return val;
    }
};

const lsbValue = (str) => str.split(":")[1].trim();

export default async function (host) {
    if (host.isLocal()) {
        const { system } = adone.metrics;
        return {
            manufacturer: system.manufacturer,
            family: system.family,
            version: system.version,
            codeName: system.codeName,
            buildNumber: system.buildNumber,
            machine: process.arch
        };
    } else if (host.isSSH()) {
        const ssh = await host.getConnection();
        const result = (await ssh.execMulti(["uname -o", "uname -r", "uname -m", "lsb_release -i", "lsb_release -r", "lsb_release -c"]));
        return {
            manufacturer: adone.text.stripLastCRLF(result.stdout[0]),
            version: lsbValue(result.stdout[4]),
            family: lsbValue(result.stdout[3]),
            codeName: lsbValue(result.stdout[5]),
            buildNumber: adone.text.stripLastCRLF(result.stdout[1]),
            machine: normalizeMachine(adone.text.stripLastCRLF(result.stdout[2]))       
        };
    }
}
