export default async function (host, path, user, group) {
    if (host.isLocal()) {
        return adone.fs.chown(path, adone.system.user.uid(user).uid, adone.system.user.gid(group));
    } else if (host.isSSH()) {
        const ssh = await host.getConnection();
        return ssh.chown(path, user, group);
    }
}
