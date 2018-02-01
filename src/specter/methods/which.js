const { is } = adone;

export default async function (host, program) {
    if (host.isLocal()) {
        const result = await adone.shell.which(program);
        if (is.null(result)) {
            return null;
        }
        if (result.code === 0) {
            return result.stdout;
        } 
        throw new adone.exception.Runtime(result.stderr);
        
    } else if (host.isSSH()) {
        const ssh = await host.getConnection();
        const result = adone.text.stripLastCRLF(await ssh.exec(`which ${program}`)).trim();
        return result === "" ? null : result;
    }
}
