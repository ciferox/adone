const native = adone.bind("git.node");

const Cred = native.Cred;

Cred.TYPE = {
    USERPASS_PLAINTEXT: 1,
    SSH_KEY: 2,
    SSH_CUSTOM: 4,
    DEFAULT: 8,
    SSH_INTERACTIVE: 16,
    USERNAME: 32,
    SSH_MEMORY: 64
};

Cred.sshKeyMemoryNew = adone.promise.promisifyAll(Cred.sshKeyMemoryNew);
Cred.usernameNew = adone.promise.promisifyAll(Cred.usernameNew);

export default Cred;