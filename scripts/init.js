const cp = require("child_process");
const path = require("path");

const adoneRoot = (dir) => path.join(__dirname, "..", dir).replace(/ /g, "\\ ");

const configureLibssh2 = () => {
    return new Promise(((resolve, reject) => {
        console.info("configuring libssh2");
        const opensslDir = adoneRoot("src/native/vcs/git/deps/openssl/openssl");
        const env = {};
        Object.keys(process.env).forEach((key) => {
            env[key] = process.env[key];
        });
        env.CPPFLAGS = env.CPPFLAGS || "";
        env.CPPFLAGS += ` -I${path.join(opensslDir, "include")}`;
        env.CPPFLAGS = env.CPPFLAGS.trim();

        cp.exec(`${adoneRoot("src/native/vcs/git/deps/libssh2/configure")} --with-libssl-prefix=${opensslDir}`, {
            cwd: adoneRoot("src/native/vcs/git/deps/libssh2/"),
            env
        }, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                console.error(stderr);
                reject(err, stderr);
            } else {
                resolve(stdout);
            }
        });
    }));
};

const init = async () => {
    if (process.platform !== "win32") {
        await configureLibssh2();
    }
};

init();
