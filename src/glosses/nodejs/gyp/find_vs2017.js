const {
    path,
    std: { childProcess: { execFile } }
} = adone;

module.exports = function findVS2017() {
    const ps = path.join(process.env.SystemRoot, "System32", "WindowsPowerShell",
        "v1.0", "powershell.exe");
    const csFile = path.join(__dirname, "find_vs2017.cs");
    const psArgs = ["-ExecutionPolicy", "Unrestricted", "-NoProfile",
        "-Command", `&{Add-Type -Path '${csFile}';` +
                "[VisualStudioConfiguration.Main]::Query()}"];

    return new Promise((resolve, reject) => {
        const child = execFile(ps, psArgs, { encoding: "utf8" }, (err, stdout, stderr) => {
            if (err) {
                return reject(new Error("Could not use PowerShell to find VS2017")); 
            }
    
            let vsSetup;
            try {
                vsSetup = JSON.parse(stdout);
            } catch (e) {
                return reject(new Error("Could not use PowerShell to find VS2017"));
            }
    
            if (!vsSetup || !vsSetup.path || !vsSetup.sdk) {
                return reject(new Error("No usable installation of VS2017 found"));
            }
    
            resolve({ path: vsSetup.path, sdk: vsSetup.sdk });
        });
    
        child.stdin.end();
    });
};
