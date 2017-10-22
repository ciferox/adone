export default async function (host, path, mode = 0o777) {
    if (host.isLocal()) {
        return adone.fs.chmod(path, mode);
    } else if (host.isSSH()) {
        const ssh = await host.getConnection();
        return ssh.chmod(path, adone.sprintf("%o", mode));
    }
}
