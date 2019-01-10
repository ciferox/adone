export default async function (host, program) {
    if (host.isLocal()) {
        const { exec } = adone.std.child_process;
        const sysInfo = await specter.sysinfoRaw(host);
        console.log(sysInfo);
        return null;
        // exec(`apt-cache sho`, (err, stdout, stderr));
        // return adone.shell.which(program);
    } else if (host.isSSH()) {
        const ssh = await host.getConnection();
        const result = adone.text.stripLastCRLF(await ssh.exec(`which ${program}`)).trim();
        return result === "" ? undefined : result;
    }
}
