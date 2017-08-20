export const fixture = (file) => adone.std.fs.readFileSync(`${__dirname}/../fixtures/${file}`, "utf8");

export const getLibVirtVersion = () => {
    return new Promise(((resolve, reject) => {
        adone.std.child_process.exec("pkg-config --modversion libvirt", (err, stdout, stderr) => {
            if (err) {
                return reject(err);
            }
            // some versions return an extra "dot", e.g. Fedora 22 "1.2.13.1"
            // which semver can't handle
            let verString = stdout.trim();
            const verParts = verString.split(/\./);
            verParts.splice(3, verParts.length - 3);
            verString = verParts.join(".");
            resolve(verString);
        });
    }));
};
