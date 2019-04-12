const {
    std: { crypto: { createHash } }
} = adone;

const win32RegBinPath = {
    native: "%windir%\\System32",
    mixed: "%windir%\\sysnative\\cmd.exe /c %windir%\\System32"
};

const guid = {
    darwin: "ioreg -rd1 -c IOPlatformExpertDevice",
    win32: `${win32RegBinPath[(process.arch === "ia32" && process.env.hasOwnProperty("PROCESSOR_ARCHITEW6432") ? "mixed" : "native")]}\\REG ` +
    "QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography " +
    "/v MachineGuid",
    linux: "cat /var/lib/dbus/machine-id /etc/machine-id 2> /dev/null | head -n 1 || :",
    freebsd: "kenv -q smbios.system.uuid"
};

const expose = (result) => {
    switch (process.platform) {
        case "darwin":
            return result
                .split("IOPlatformUUID")[1]
                .split("\n")[0].replace(/\=|\s+|\"/ig, "")
                .toLowerCase();
        case "win32":
            return result
                .toString()
                .split("REG_SZ")[1]
                .replace(/\r+|\n+|\s+/ig, "")
                .toLowerCase();
        case "linux":
            return result
                .toString()
                .replace(/\r+|\n+|\s+/ig, "")
                .toLowerCase();
        case "freebsd":
            return result
                .toString()
                .replace(/\r+|\n+|\s+/ig, "")
                .toLowerCase();
        default:
            throw new Error(`Unsupported platform: ${process.platform}`);
    }
};

const machineId = async (original = false) => {
    const result = await adone.process.shell(guid[process.platform]);
    const id = expose(result.stdout.toString());
    return original ? id : adone.crypto.hash.sha256(id, "hex");
};

export default machineId;
