const { is } = adone;

export default class Shell extends adone.event.Emitter {
    constructor(options) {
        super();

        this.options = options;
        this.command = "";
        this._stream = {};
        this._data = "";
        this._buffer = "";
        this._connections = [];
        this._pipes = [];
        this.idleTime = 5000;
        this.asciiFilter = "";
        this.textColorFilter = "";
        this.passwordPromt = "";
        this.passphrasePromt = "";
        this.standardPromt = "";

        this._loadDefaults();

        this.connection = new adone.net.ssh.Client();

        this.on("keyboard-interactive", (name, instructions, instructionsLang, prompts, finish) => {
            let str;
            if (this.options.debug) {
                this.emit("msg", `${this.options.server.host}: Class.keyboard-interactive`);
            }
            if (this.options.debug) {
                this.emit("msg", `${this.options.server.host}: Keyboard-interactive: finish([response, array]) not called in class event handler.`);
            }
            if (this.options.verbose) {
                this.emit("msg", `name: ${name}`);
                this.emit("msg", `instructions: ${instructions}`);
                str = JSON.stringify(prompts, null, 4);
                this.emit("msg", `Prompts object: ${str}`);
            }
            if (this.options.onKeyboardInteractive) {
                return this.options.onKeyboardInteractive(name, instructions, instructionsLang, prompts, finish);
            }
        });

        this.on("msg", this.options.msg.send);

        this.on("error", is.function(this.options.onError) ? this.options.onError : (err, type, close, callback) => {
            if (is.nil(close)) {
                close = false;
            }
            if (this.options.debug) {
                this.emit("msg", `${this.options.server.host}: Class.error`);
            }
            if (err instanceof Error) {
                this.emit("msg", `Error: ${err.message}, Level: ${err.level}`);
            } else {
                this.emit("msg", `${type} error: ${err}`);
            }
            if (callback) {
                callback(err, type);
            }
            if (close) {
                return this.connection.end();
            }
        });

        this.on("pipe", is.function(this.options.onPipe) ? this.options.onPipe : (source) => {
            if (this.options.debug) {
                return this.emit("msg", `${this.options.server.host}: Class.pipe`);
            }
        });

        this.on("unpipe", is.function(this.options.onUnpipe) ? this.options.onUnpipe : (source) => {
            if (this.options.debug) {
                return this.emit("msg", `${this.options.server.host}: Class.unpipe`);
            }
        });

        this.on("data", is.function(this.options.onData) ? this.options.onData : adone.noop);
        this.on("stderrData", is.function(this.options.onStderrData) ? this.options.onStderrData : (data) => adone.error(data));
    }

    connect(callback) {
        let e;
        if (is.plainObject(this.options.server) && is.array(this.options.commands)) {
            try {
                if (callback) {
                    this._callback = callback;
                }
                this.connection.on("keyboard-interactive", (name, instructions, instructionsLang, prompts, finish) => {
                    if (this.options.debug) {
                        this.emit("msg", `${this.options.server.host}: Connection.keyboard-interactive`);
                    }
                    return this.emit("keyboard-interactive", name, instructions, instructionsLang, prompts, finish);
                });

                this.connection.on("connect", () => {
                    if (this.options.debug) {
                        this.emit("msg", `${this.options.server.host}: Connection.connect`);
                    }
                    return this.emit("msg", this.options.connectedMessage);
                });

                this.connection.on("ready", () => {
                    if (this.options.debug) {
                        this.emit("msg", `${this.options.server.host}: Connection.ready`);
                    }
                    this.emit("msg", this.options.readyMessage);
                    return this.connection.shell({
                        pty: true
                    }, (err, _stream) => {
                        let i;
                        let len;
                        let pipe;

                        this._stream = _stream;
                        if (err) {
                            this.emit("error", err, "Shell", true);
                        }
                        if (this.options.debug) {
                            this.emit("msg", `${this.options.server.host}: Connection.shell`);
                        }
                        this.options.sessionText = `Connected to ${this.options.server.host}${this.options.enter}`;
                        this._stream.setEncoding("utf8");

                        const ref = this._pipes;
                        for (i = 0, len = ref.length; i < len; i++) {
                            pipe = ref[i];
                            this._stream.pipe(pipe);
                        }
                        this.unpipe = this._stream.unpipe;
                        this._stream.on("error", (err) => {
                            if (this.options.debug) {
                                this.emit("msg", `${this.options.server.host}: Stream.error`);
                            }
                            return this.emit("error", err, "Stream");
                        });
                        this._stream.stderr.on("data", (data) => {
                            if (this.options.debug) {
                                this.emit("msg", `${this.options.server.host}: Stream.stderr.data`);
                            }
                            return this.emit("stderrData", data);
                        });
                        this._stream.on("data", (data) => {
                            let e;
                            try {
                                this._processData(data);
                                return this.emit("data", data);
                            } catch (error) {
                                e = error;
                                err = new Error(`${e} ${e.stack}`);
                                err.level = "Data handling";
                                return this.emit("error", err, "Stream.read", true);
                            }
                        });
                        this._stream.on("pipe", (source) => {
                            return this.emit("pipe", source);
                        });
                        this._stream.on("unpipe", (source) => {
                            return this.emit("unpipe", source);
                        });
                        this._stream.on("finish", () => {
                            if (this.options.debug) {
                                this.emit("msg", `${this.options.server.host}: Stream.finish`);
                            }
                            this.emit("end", this.options.sessionText, this.options);
                            this.options.commands = "";
                            if (this._callback) {
                                return this._callback(this.options.sessionText);
                            }
                        });
                        return this._stream.on("close", (code, signal) => {
                            if (this.options.debug) {
                                this.emit("msg", `${this.options.server.host}: Stream.close`);
                            }
                            return this.connection.end();
                        });
                    });
                });

                this.connection.on("error", (err) => {
                    if (this.options.debug) {
                        this.emit("msg", `${this.options.server.host}: Connection.error`);
                    }
                    return this.emit("error", err, "Connection");
                });

                this.connection.on("close", (hadError) => {
                    if (this.options.debug) {
                        this.emit("msg", `${this.options.server.host}: Connection.close`);
                    }
                    if (this.options.idleTimer) {
                        clearTimeout(this.options.idleTimer);
                    }
                    if (hadError) {
                        return this.emit("error", hadError, "Connection close");
                    }
                    return this.emit("msg", this.options.closedMessage);
                });

                this.connection.connect({
                    host: this.options.server.host,
                    port: this.options.server.port,
                    forceIPv4: this.options.server.forceIPv4,
                    forceIPv6: this.options.server.forceIPv6,
                    hostHash: this.options.server.hashMethod,
                    hostVerifier: this.options.server.hostVerifier,
                    username: this.options.server.userName,
                    password: this.options.server.password,
                    agent: this.options.server.agent,
                    agentForward: this.options.server.agentForward,
                    privateKey: this.options.server.privateKey,
                    passphrase: this.options.server.passPhrase,
                    localHostname: this.options.server.localHostname,
                    localUsername: this.options.server.localUsername,
                    tryKeyboard: this.options.server.tryKeyboard,
                    keepaliveInterval: this.options.server.keepaliveInterval,
                    keepaliveCountMax: this.options.server.keepaliveCountMax,
                    readyTimeout: this.options.server.readyTimeout,
                    sock: this.options.server.sock,
                    strictVendor: this.options.server.strictVendor,
                    algorithms: this.options.server.algorithms,
                    compress: this.options.server.compress,
                    debug: this.options.server.debug
                });
                return this._stream;
            } catch (error) {
                e = error;
                return this.emit("error", `${e} ${e.stack}`, "Connection.connect", true);
            }
        } else {
            return this.emit("error", "Missing connection parameters", "Parameters", false, (err, type, close) => {
                this.emit("msg", this.options.server);
                return this.emit("msg", this.options.commands);
            });
        }
    }

    pipe(destination) {
        this._pipes.push(destination);
        return this;
    }

    unpipe() {

    }

    _processData(data) {
        this._buffer += data;
        if (this.command.indexOf("ll -al") !== -1) {
            this.emit("msg", `${this.options.server.host}: Password prompt: \nBuffer: \n${this._buffer} \nresponse: ${this._buffer}`);
        }
        if (this.command && this.command.indexOf("sudo ") !== -1) {
            return this._processPasswordPrompt();
        } else if (this.command && this.command.indexOf("ssh ") !== -1) {
            return this._processSSHPrompt();
        } else if (this.standardPromt.test(this._buffer.replace(this.command.substr(0, this._buffer.length), ""))) {
            if (this.options.debug) {
                this.emit("msg", `${this.options.server.host}: Normal prompt detected`);
            }
            this.options.pwSent = false;
            return this._commandComplete();
        }
        this.emit("commandProcessing", this.command, this._buffer, this.options, this._stream);
        if (this.options.idleTimer) {
            clearTimeout(this.options.idleTimer);
        }
        return this.options.idleTimer = setTimeout((function (_this) {
            return function () {
                return _this.emit("commandTimeout", _this.command, _this._buffer, _this._stream, _this._connection);
            };
        })(this), this.idleTime);

    }

    _processPasswordPrompt() {
        const response = this._buffer.replace(this.command.substr(0, this._buffer.length), "");
        if (this.options.debug) {
            this.emit("msg", `${this.options.server.host}: Password prompt: Password Sent: ${this.options.pwSent}`);
        }
        if (!this.options.pwSent) {
            if (this.options.verbose) {
                this.emit("msg", `${this.options.server.host}: Password prompt: Buffer: ${response}`);
            }
            if (this.passwordPromt.test(response)) {
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: Password prompt: Send password `);
                }
                if (this.options.verbose) {
                    this.emit("msg", `${this.options.server.host}: Sent password: ${this.options.server.password}`);
                }
                this.options.pwSent = true;
                return this._stream.write(String(this.options.server.password) + this.options.enter);
            } else if (this.standardPromt.test(response)) {
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: Password prompt: Standard prompt after password sent`);
                }
                return this._commandComplete();
            }
        } else if (this.standardPromt.test(response)) {
            if (this.options.debug) {
                this.emit("msg", `${this.options.server.host}: Password prompt: Standard prompt detected`);
            }
            return this._commandComplete();
        } else {
            if (this.passwordPromt.test(response)) {
                if (this.options.verbose) {
                    this.emit("msg", `${this.options.server.host}: Sudo password faied: response: ${response}`);
                }
                this.emit("error", `Sudo password was incorrect for ${this.options.server.userName}`, "Sudo authentication");
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: Failed password prompt: Password: [${this.options.server.password}]`);
                }
                this.options.sessionText += String(this._buffer);
                this._buffer = "";
                this.options.commands = [];
                this.command = "";
                return this._stream.write("\x03");
            }
        }
    }

    _processSSHPrompt() {
        let password;
        const response = this._buffer.replace(this.command.substr(0, this._buffer.length), "");
        if (!this.options.sshAuth) {
            if (this.passwordPromt.test(response)) {
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: SSH password prompt`);
                }
                this.options.sshAuth = true;
                return this._stream.write(String(this.options.server.password) + this.options.enter);
            } else if (this.passphrasePromt.test(response)) {
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: SSH passphrase prompt`);
                }
                this.options.sshAuth = "true";
                return this._stream.write(String(this.options.server.passPhrase) + this.options.enter);
            } else if (this.standardPromt.test(response)) {
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: SSH auth normal prompt`);
                }
                this.options.sshAuth = true;
                this.options.sessionText += `Connected to ${this.options.server.host}${this.options.enter}`;
                return this._commandComplete();
            }
        } else {
            if ((password = this.passwordPromt.test(response) || this.passphrasePromt.test(response))) {
                this.options.sshAuth = false;
                this.emit("error", `SSH authentication failed for ${this.options.server.userName}@${this.options.server.host}`, "Nested host authentication");
                if (this.options.debug) {
                    this.emit("msg", `Using ${password ? `password: [${this.options.server.password}]` : `passphrase: [${this.options.server.passPhrase}]`}`);
                }
                if (this._connections.length > 0) {
                    this._previousConnection();
                }
                this.options.sessionText += String(this._buffer);
                return this._stream.write("\x03");
            } else if (this.standardPromt.test(response)) {
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: SSH complete: normal prompt`);
                }
                return this._sshConnectionTest(response);
            }
        }
    }

    _processNotifications() {
        let msgNote;
        let sessionNote;
        if (this.command) {
            if ((sessionNote = this.command.match(/^`(.*)`$/))) {
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: Notifications: sessionText output`);
                }
                this.options.sessionText += `${this.options.server.host}: Note: ${sessionNote[1]}${this.options.enter}`;
                if (this.options.verbose) {
                    this.emit("msg", sessionNote[1]);
                }
                return this._nextCommand();
            } else if ((msgNote = this.command.match(/^msg:(.*)$/))) {
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: Notifications: msg to output`);
                }
                this.emit("msg", `${this.options.server.host}: Note: ${msgNote[1]}`);
                return this._nextCommand();
            }
            if (this.options.debug) {
                this.emit("msg", `${this.options.server.host}: Notifications: Normal Command to run`);
            }
            return this._checkCommand();

        }
    }

    _commandComplete() {
        const response = this._buffer.replace(this.command, "");
        if (this.command.indexOf("sudo su") !== -1) {
            if (this.options.debug) {
                this.emit("msg", `${this.options.server.host}: Sudo su adding exit.`);
            }
            this.options.exitCommands.push("exit");
        }
        if (this.command !== "" && this.command !== "exit" && this.command.indexOf("ssh ") === -1) {
            if (this.options.verbose) {
                this.emit("msg", `${this.options.server.host}: Command complete:\nCommand:\n ${this.command}\nResponse: ${response}`);
            }
            if (!this.options.disableASCIIFilter) {
                this._buffer = this._buffer.replace(this.asciiFilter, "");
            }
            if (!this.options.disableColorFilter) {
                this._buffer = this._buffer.replace(this.textColorFilter, "");
            }
            this.options.sessionText += this._buffer;
            if (this.options.debug) {
                this.emit("msg", `${this.options.server.host}: Raising commandComplete event`);
            }
            this.emit("commandComplete", this.command, this._buffer, this.options);
        }
        if (this.command.indexOf("exit") !== -1) {
            return this._runExit();
        }
        return this._nextCommand();

    }

    _nextCommand() {
        this._buffer = "";
        if (this.options.commands.length > 0) {
            if (this.options.verbose) {
                this.emit("msg", `${this.options.server.host}: Host.commands: ${this.options.commands}`);
            }
            this.command = this.options.commands.shift();
            if (this.options.verbose) {
                this.emit("msg", `${this.options.server.host}: Next command from host.commands: ${this.command}`);
            }
            return this._processNotifications();
        }
        if (this.options.debug) {
            this.emit("msg", `${this.options.server.host}: No commands so exit`);
        }
        return this._runExit();

    }

    _checkCommand() {
        if (this.command) {
            return this._runCommand(this.command);
        }
        if (this.options.debug) {
            this.emit("msg", `${this.options.server.host}: No command so exit`);
        }
        return this._runExit();

    }

    _runCommand(command) {
        if (this.options.verbose) {
            this.emit("msg", `${this.options.server.host}: running: ${command}`);
        }
        return this._stream.write(String(command) + this.options.enter);
    }

    _previousHost() {
        if (this.options.debug) {
            this.emit("msg", `${this.options.server.host}: Switching host configs`);
        }
        const host = this.options.server.host;
        this.emit("end", this.options.sessionText, this.options);
        if (this._connections.length > 0) {
            this._connections[0].sessionText += this.options.sessionText;
            if (this.options.debug) {
                this.emit("msg", `${this.options.server.host}: Pushed exit command to disconnect SSH session for ${host}`);
            }
            this.options.exitCommands.push("exit");
            if (this.options.idleTimer) {
                clearTimeout(this.options.idleTimer);
            }
            this._removeEvents();
            this.options = this._connections.pop();
            this._loadDefaults();
            if (this.options.verbose) {
                this.emit("msg", `${this.options.enter}Previous host object:\n${this.options}`);
            }
            if (this.options.debug) {
                this.emit("msg", `${this.options.server.host}: Reload previous host object`);
            }
        }
        return this._runExit();
    }

    _nextHost() {
        this._buffer = "";
        const nextHost = this.options.hosts.shift();
        if (this.options.debug) {
            this.emit("msg", `${this.options.server.host}: SSH to ${nextHost.server.host}`);
        }
        this._removeEvents();
        this._connections.push(this.options);
        this.options = nextHost;
        this._loadDefaults();
        this.options.testConnection = true;
        const sshCommand = `ssh -q ${this.options.server.userName}@${this.options.server.host} "echo 2>&1" && echo OK || echo NOK`;
        if (this.options.debug) {
            this.emit("msg", `${this.options.server.host}: SSH checking conectivity`);
        }
        this.options.commands.unshift(sshCommand);
        return this._nextCommand();
    }

    _sshConnectionTest(response) {
        if (this.options.testConnection) {
            if (this.options.verbose) {
                this.emit("msg", `${this.options.server.host}: SSH: Connection test response: ${response}.`);
            }
            if (response.indexOf("NOK") === -1) {
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: SSH: Okay to connect`);
                }
                this.options.testConnection = false;
                this._sshConnect();
            } else {
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: SSH: Connection not possible reverting host`);
                }
                this.options.commands = [];
                this.command = "";
                this._runExit();
            }
        } else {
            this.options.sessionText += `Connected to ${this.options.server.host}${this.options.enter}`;
            if (this.options.debug) {
                this.emit("msg", `${this.options.server.host}: SSH: Connected`);
            }
            if (this.options.hosts && this.options.hosts.length === 0) {
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: SSH: Connected: added exit command`);
                }
                this.options.exitCommands.push("exit");
            }
            return this._nextCommand();
        }
    }

    _sshConnect() {
        let option;
        let ref;
        let sshFlags;
        let sshOptions;

        sshFlags = "-x";
        sshOptions = "";
        if (this.options.server.ssh) {
            if (this.options.server.ssh.forceProtocolVersion) {
                sshFlags += this.options.server.ssh.forceProtocolVersion;
            }
            if (this.options.server.ssh.forceAddressType) {
                sshFlags += this.options.server.ssh.forceAddressType;
            }
            if (this.options.server.ssh.disablePseudoTTY) {
                sshFlags += "T";
            }
            if (this.options.server.ssh.forcePseudoTTY) {
                sshFlags += "t";
            }
            if (this.options.server.ssh.verbose) {
                sshFlags += "v";
            }
            if (this.options.server.ssh.cipherSpec) {
                sshOptions += ` -c ${this.options.server.ssh.cipherSpec}`;
            }
            if (this.options.server.ssh.escape) {
                sshOptions += ` -e ${this.options.server.ssh.escape}`;
            }
            if (this.options.server.ssh.logFile) {
                sshOptions += ` -E ${this.options.server.ssh.logFile}`;
            }
            if (this.options.server.ssh.configFile) {
                sshOptions += ` -F ${this.options.server.ssh.configFile}`;
            }
            if (this.options.server.ssh.identityFile) {
                sshOptions += ` -i ${this.options.server.ssh.identityFile}`;
            }
            if (this.options.server.ssh.loginName) {
                sshOptions += ` -l ${this.options.server.ssh.loginName}`;
            }
            if (this.options.server.ssh.macSpec) {
                sshOptions += ` -m ${this.options.server.ssh.macSpec}`;
            }
            ref = this.options.server.ssh.Options;
            for (option in ref) {
                sshOptions += ` -o "${option}=${ref[option]}"`;
            }
        }
        sshOptions += ' -o "StrictHostKeyChecking=no"';
        sshOptions += ` -p ${this.options.server.port}`;
        this.options.sshAuth = false;
        const sshCommand = `ssh ${sshFlags} ${sshOptions} ${this.options.server.userName}@${this.options.server.host}`;
        if (this.options.debug) {
            this.emit("msg", `${this.options.server.host}: SSH: connect`);
        }
        this.options.commands.unshift(sshCommand);
        return this._nextCommand();
    }

    _runExit() {
        if (this.options.debug) {
            this.emit("msg", `${this.options.server.host}: Run exit`);
        }
        if (this.options.exitCommands && this.options.exitCommands.length > 0) {
            if (this.options.verbose) {
                this.emit("msg", `${this.options.server.host}: Queued exit commands: ${this.options.exitCommands}`);
            }
            this.command = this.options.exitCommands.pop();
            return this._runCommand(this.command);
        } else if (this.options.hosts && this.options.hosts.length > 0) {
            if (this.options.debug) {
                this.emit("msg", `${this.options.server.host}: Next host from this host`);
            }
            if (this.options.verbose) {
                this.emit("msg", this.options.hosts);
            }
            return this._nextHost();
        } else if (this._connections && this._connections.length > 0) {
            return this._previousHost();
        }
        if (this.options.debug) {
            this.emit("msg", `${this.options.server.host}: Exit command: Stream: close`);
        }
        return this._stream.close();

    }

    _removeEvents() {
        if (this.options.debug) {
            this.emit("msg", `${this.options.server.host}: Clearing previous event handlers`);
        }
        this.removeListener("commandProcessing", this.onCommandProcessing);
        this.removeListener("commandComplete", this.onCommandComplete);
        this.removeListener("commandTimeout", this.onCommandTimeout);
        return this.removeListener("end", this.onEnd);
    }

    _loadDefaults() {
        if (!is.plainObject(this.options.msg)) {
            this.options.msg = {
                send: (message) => adone.log(message)
            };
        }
        if (!is.string(this.options.connectedMessage)) {
            this.options.connectedMessage = "Connected";
        }
        if (!is.string(this.options.readyMessage)) {
            this.options.readyMessage = "Ready";
        }
        if (!is.string(this.options.closedMessage)) {
            this.options.closedMessage = "Closed";
        }
        if (!is.boolean(this.options.verbose)) {
            this.options.verbose = false;
        }
        if (!is.boolean(this.options.debug)) {
            this.options.debug = false;
        }
        if (!is.array(this.options.hosts)) {
            this.options.hosts = [];
        }
        if (!is.string(this.options.standardPrompt)) {
            this.options.standardPrompt = ">$%#";
        }
        if (!is.string(this.options.passwordPromt)) {
            this.options.passwordPromt = ":";
        }
        if (!is.string(this.options.passphrasePromt)) {
            this.options.passphrasePromt = ":";
        }
        if (!is.string(this.options.enter)) {
            this.options.enter = "\n";
        }
        if (!is.string(this.options.asciiFilter)) {
            this.options.asciiFilter = "[^\r\n\x20-\x7e]";
        }
        if (!is.boolean(this.options.disableColorFilter)) {
            this.options.disableColorFilter = false;
        }
        if (!is.boolean(this.options.disableASCIIFilter)) {
            this.options.disableASCIIFilter = false;
        }
        if (!is.string(this.options.textColorFilter)) {
            this.options.textColorFilter = "([{1}[0-9;]+m{1})";
        }
        if (!is.array(this.options.exitCommands)) {
            this.options.exitCommands = [];
        }
        if (!is.boolean(this.options.pwSent)) {
            this.options.pwSent = false;
        }
        if (!is.boolean(this.options.sshAuth)) {
            this.options.sshAuth = false;
        }
        this.options.server.hashKey = is.string(this.options.server.hashKey) ? this.options.server.hashKey : "";
        if (!is.string(this.options.sessionText)) {
            this.options.sessionText = "";
        }
        this.idleTime = is.number(this.options.idleTimeOut) ? this.options.idleTimeOut : 5000;
        if (!this.asciiFilter) {
            this.asciiFilter = new RegExp(this.options.asciiFilter, "g");
        }
        if (!this.textColorFilter) {
            this.textColorFilter = new RegExp(this.options.textColorFilter, "g");
        }
        if (!this.passwordPromt) {
            this.passwordPromt = new RegExp(`password.*${this.options.passwordPromt}\\s$`, "i");
        }
        if (!this.passphrasePromt) {
            this.passphrasePromt = new RegExp(`password.*${this.options.passphrasePromt}\\s$`, "i");
        }
        if (!this.standardPromt) {
            this.standardPromt = new RegExp(`[${this.options.standardPrompt}]\\s$`);
        }
        if (is.function(this.options.callback)) {
            this._callback = this.options.callback;
        } else {
            this._callback = adone.noop;
        }

        if (is.function(this.options.onCommandProcessing)) {
            this.onCommandProcessing = this.options.onCommandProcessing;
        } else {
            this.onCommandProcessing = adone.noop;
        }

        if (is.function(this.options.onCommandComplete)) {
            this.onCommandComplete = this.options.onCommandComplete;
        } else {
            this.onCommandComplete = (command, response, opts) => {
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: Class.commandComplete`);
                }
            };
        }

        if (is.function(this.options.onCommandTimeout)) {
            this.onCommandTimeout = this.options.onCommandTimeout;
        } else {
            this.onCommandTimeout = (command, response, stream, connection) => {
                response = response.replace(this.command, "");
                if (this.options.debug) {
                    this.emit("msg", `${this.options.server.host}: Class.commandTimeout`);
                }
                if (this.options.verbose) {
                    this.emit("msg", `${this.options.server.host}: Timeout command: ${command} response: ${response}`);
                }
                this._runExit();
                return this.emit("error", `${this.options.server.host}: Command timed out after ${this.idleTime / 1000} seconds`, "Timeout", true, (err, type) => {
                    return this.options.sessionText += this._buffer;
                });
            };
        }

        if (is.function(this.options.onEnd)) {
            this.onEnd = this.options.onEnd;
        } else {
            this.onEnd = (sessionText, opts) => {
                if (this.options.debug) {
                    return this.emit("msg", `${this.options.server.host}: Class.end`);
                }
            };
        }

        this.on("commandProcessing", this.onCommandProcessing);
        this.on("commandComplete", this.onCommandComplete);
        this.on("commandTimeout", this.onCommandTimeout);
        return this.on("end", this.onEnd);
    }
}
