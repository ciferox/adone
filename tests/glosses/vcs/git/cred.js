const {
    std: { fs, path },
    vcs: { git: { Cred } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Cred", () => {
    const sshPublicKey = local("id_rsa.pub");
    const sshPrivateKey = local("id_rsa");

    it("can create default credentials", () => {
        const defaultCreds = Cred.defaultNew();
        assert.ok(defaultCreds instanceof Cred);
    });

    it("can create ssh credentials using passed keys", () => {
        const cred = Cred.sshKeyNew("username", sshPublicKey, sshPrivateKey, "");

        assert.ok(cred instanceof Cred);
    });

    it("can create ssh credentials using passed keys in memory", () => {
        const publicKeyContents = fs.readFileSync(sshPublicKey, {
            encoding: "ascii"
        });
        const privateKeyContents = fs.readFileSync(sshPrivateKey, {
            encoding: "ascii"
        });

        return Cred.sshKeyMemoryNew("username", publicKeyContents, privateKeyContents, "").then((cred) => {
            assert.ok(cred instanceof Cred);
        });
    });

    it("can create credentials using plaintext", () => {
        const plaintextCreds = Cred.userpassPlaintextNew("username", "password");
        assert.ok(plaintextCreds instanceof Cred);
    });

    it("can create credentials using agent", () => {
        const fromAgentCreds = Cred.sshKeyFromAgent("username");
        assert.ok(fromAgentCreds instanceof Cred);
    });

    it("can create credentials using username", () => {
        return Cred.usernameNew("username").then((cred) => {
            assert.ok(cred instanceof Cred);
        });
    });

    it("can return 1 if a username exists", () => {
        const plaintextCreds = Cred.userpassPlaintextNew("username", "password");
        assert.ok(plaintextCreds.hasUsername() === 1);
    });

    it("can return 0 if a username does not exist", () => {
        const defaultCreds = Cred.defaultNew();
        assert.ok(defaultCreds.hasUsername() === 0);
    });
});
