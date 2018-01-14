const {
  is,
  std: {
    os
  },
  system: {
    process: {
      execStdout
    }
  }
} = adone;
adone.asNamespace(exports);

const wrap = function (key, lookup, fallback) {
  exports[key] = async () => {
    let val = lookup();

    if (!val && fallback) {
      val = await execStdout(fallback);
    }

    return val;
  };
};

wrap("user", () => is.windows ? `${process.env.USERDOMAIN}\\${process.env.USERNAME}` : process.env.USER, "whoami");
wrap("prompt", () => is.windows ? process.env.PROMPT : process.env.PS1);
wrap("hostname", () => is.windows ? process.env.COMPUTERNAME : process.env.HOSTNAME, "hostname");
wrap("tmpdir", () => os.tmpdir());
wrap("home", () => os.homedir());
wrap("path", () => (process.env.PATH || process.env.Path || process.env.path).split(is.windows ? ";" : ":"));
wrap("editor", () => process.env.EDITOR || process.env.VISUAL || (is.windows ? "notepad.exe" : "vi"));
wrap("shell", () => is.windows ? process.env.ComSpec || "cmd" : process.env.SHELL || "bash");
//# sourceMappingURL=env.js.map
