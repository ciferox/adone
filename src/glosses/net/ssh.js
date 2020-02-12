adone.lazify({
    SSHClient: ["ssh2", "Client"],
    SSHServer: ["ssh2", "Server"],
    SSH2Stream: ["ssh2-streams", "SSH2Stream"],
    SFTPStream: ["ssh2-streams", "SFTPStream"],
    SFTPClient: "ssh2-sftp-client"
}, adone.asNamespace(exports), require);
