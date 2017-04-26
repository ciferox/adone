const {
    database: { mongo: { core: {
        auth: { MongoCR, X509, Plain, ScramSHA1 },
        Connection,
        MongoError,
        Query,
        CommandResult
    } } },
    std: { events: EventEmitter },
    is, x
} = adone;


const DISCONNECTED = "disconnected";
const CONNECTING = "connecting";
const CONNECTED = "connected";
const DESTROYING = "destroying";
const DESTROYED = "destroyed";

let _id = 0;

const stateTransition = (self, newState) => {
    const legalTransitions = {
        disconnected: [CONNECTING, DESTROYING, DISCONNECTED],
        connecting: [CONNECTING, DESTROYING, CONNECTED, DISCONNECTED],
        connected: [CONNECTED, DISCONNECTED, DESTROYING],
        destroying: [DESTROYING, DESTROYED],
        destroyed: [DESTROYED]
    };

    // Get current state
    const legalStates = legalTransitions[self.state];
    if (legalStates && legalStates.includes(newState)) {
        self.state = newState;
    } else {
        adone.error(`Pool with id [${self.id}] failed attempted illegal state transition from [${self.state}] to [${newState}] only following state allowed [${legalStates}]`);
    }
};

// The write function used by the authentication mechanism (bypasses external)
const write = (self) => {
    return (connection, command, callback) => {
        // Get the raw buffer
        // Ensure we stop auth if pool was destroyed
        if (self.state === DESTROYED || self.state === DESTROYING) {
            return callback(new MongoError("pool destroyed"));
        }

        // Set the connection workItem callback
        connection.workItems.push({
            cb: callback, command: true, requestId: command.requestId
        });

        // Write the buffer out to the connection
        connection.write(command.toBin());
    };
};

const authenticate = (pool, auth, connection, cb) => {
    if (is.undefined(auth[0])) {
        return cb(null);
    }
    // We need to authenticate the server
    const [mechanism, db] = auth;
    // Validate if the mechanism exists
    if (!pool.authProviders[mechanism]) {
        throw new MongoError(`authMechanism ${mechanism} not supported`);
    }

    // Get the provider
    const provider = pool.authProviders[mechanism];

    // Authenticate using the provided mechanism
    provider.auth(write(pool), [connection], db, ...auth.slice(2), cb);
};

const reauthenticate = (pool, connection, cb) => {
    // Authenticate
    const authenticateAgainstProvider = (pool, connection, providers, cb) => {
        // Finished re-authenticating against providers
        if (providers.length === 0) {
            return cb();
        }
        // Get the provider name
        const provider = pool.authProviders[providers.pop()];

        // Auth provider
        provider.reauthenticate(write(pool), [connection], (err) => {
            // We got an error return immediately
            if (err) {
                return cb(err);
            }
            // Continue authenticating the connection
            authenticateAgainstProvider(pool, connection, providers, cb);
        });
    };

    // Start re-authenticating process
    authenticateAgainstProvider(pool, connection, Object.keys(pool.authProviders), cb);
};

// Remove connection method
const remove = (connection, connections) => {
    for (let i = 0; i < connections.length; i++) {
        if (connections[i] === connection) {
            connections.splice(i, 1);
            return true;
        }
    }
};

const removeConnection = (self, connection) => {
    if (remove(connection, self.availableConnections)) {
        return;
    }
    if (remove(connection, self.inUseConnections)) {
        return;
    }
    if (remove(connection, self.connectingConnections)) {
        return;
    }
    remove(connection, self.nonAuthenticatedConnections);
};

const connectionFailureHandler = (self, event) => {
    return function (err) {
        if (this._connectionFailHandled) {
            return;
        }
        this._connectionFailHandled = true;
        // Destroy the connection
        this.destroy();

        // Remove the connection
        removeConnection(self, this);

        // Flush all work Items on this connection
        while (this.workItems.length > 0) {
            const workItem = this.workItems.shift();
            // if(workItem.cb) workItem.cb(err);
            if (workItem.cb) {
                workItem.cb(err);
            }
        }

        // Did we catch a timeout, increment the numberOfConsecutiveTimeouts
        if (event === "timeout") {
            self.numberOfConsecutiveTimeouts = self.numberOfConsecutiveTimeouts + 1;

            // Have we timed out more than reconnectTries in a row ?
            // Force close the pool as we are trying to connect to tcp sink hole
            if (self.numberOfConsecutiveTimeouts > self.options.reconnectTries) {
                self.numberOfConsecutiveTimeouts = 0;
                // Destroy all connections and pool
                self.destroy(true);
                // Emit close event
                return self.emit("close", self);
            }
        }

        // No more socket available propegate the event
        if (self.socketCount() === 0) {
            if (self.state !== DESTROYED && self.state !== DESTROYING) {
                stateTransition(self, DISCONNECTED);
            }

            // Do not emit error events, they are always close events
            // do not trigger the low level error handler in node
            event = event === "error" ? "close" : event;
            self.emit(event, err);
        }

        // Start reconnection attempts
        if (!self.reconnectId && self.options.reconnect) {
            // eslint-disable-next-line no-use-before-define
            self.reconnectId = setTimeout(attemptReconnect(self), self.options.reconnectInterval);
        }
    };
};

const moveConnectionBetween = (connection, from, to) => {
    const index = from.indexOf(connection);
    // Move the connection from connecting to available
    if (index !== -1) {
        from.splice(index, 1);
        to.push(connection);
    }
};

const flushMonitoringOperations = (queue) => {
    for (let i = 0; i < queue.length; i++) {
        if (queue[i].monitoring) {
            const workItem = queue[i];
            queue.splice(i, 1);
            workItem.cb(new MongoError({ message: "no connection available for monitoring", driver: true }));
        }
    }
};

const _execute = (self) => {
    return () => {
        // console.log("==== _execute")
        if (self.state === DESTROYED) {
            return;
        }
        // Already executing, skip
        if (self.executing) {
            return;
        }
        // Set pool as executing
        self.executing = true;

        // Wait for auth to clear before continuing
        const waitForAuth = (cb) => {
            if (!self.authenticating) {
                return cb();
            }
            // Wait for a milisecond and try again
            setTimeout(() => {
                waitForAuth(cb);
            }, 1);
        };

        // Block on any auth in process
        waitForAuth(() => {
            // New pool connections are in progress, wait them to finish
            // before executing any more operation to ensure distribution of
            // operations
            if (self.connectingConnections.length > 0) {
                return;
            }
            // As long as we have available connections
            for (; ;) {
                // Total availble connections
                const totalConnections = self.availableConnections.length
                    + self.connectingConnections.length
                    + self.inUseConnections.length;

                // No available connections available, flush any monitoring ops
                if (self.availableConnections.length === 0) {
                    // Flush any monitoring operations
                    flushMonitoringOperations(self.queue);
                    break;
                }

                // No queue break
                if (self.queue.length === 0) {
                    break;
                }

                // Get a connection
                let connection = null;

                // Locate all connections that have no work
                const connections = [];
                // Get a list of all connections
                for (const conn of self.availableConnections) {
                    if (conn.workItems.length === 0) {
                        connections.push(conn);
                    }
                }

                // No connection found that has no work on it, just pick one for pipelining
                if (connections.length === 0) {
                    connection = self.availableConnections[self.connectionIndex++ % self.availableConnections.length];
                } else {
                    connection = connections[self.connectionIndex++ % connections.length];
                }
                // Is the connection connected
                if (connection.isConnected()) {
                    // Get the next work item
                    const workItem = self.queue.shift();

                    // If we are monitoring we need to use a connection that is not
                    // running another operation to avoid socket timeout changes
                    // affecting an existing operation
                    if (workItem.monitoring) {
                        let foundValidConnection = false;

                        for (const conn of self.availableConnections) {
                            // If the connection is connected
                            // And there are no pending workItems on it
                            // Then we can safely use it for monitoring.
                            if (
                                conn.isConnected() &&
                                conn.workItems.length === 0
                            ) {
                                foundValidConnection = true;
                                connection = conn;
                                break;
                            }
                        }

                        // No safe connection found, attempt to grow the connections
                        // if possible and break from the loop
                        if (!foundValidConnection) {
                            // console.log("!!!!!!!!!!!!!!!!!!!!!! foundValidConnection failed")
                            // console.log("============== :: " + self.queue.length)
                            // Put workItem back on the queue
                            self.queue.unshift(workItem);

                            // // Flush any monitoring operations in the queue, failing fast
                            // flushMonitoringOperations(self.queue);

                            // Attempt to grow the pool if it's not yet maxsize
                            if (totalConnections < self.options.size
                                && self.queue.length > 0) {
                                // Create a new connection
                                // eslint-disable-next-line no-use-before-define
                                _createConnection(self);
                            }

                            // Re-execute the operation
                            setTimeout(() => {
                                _execute(self)();
                            }, 10);

                            break;
                        }
                    }

                    // Don't execute operation until we have a full pool
                    if (totalConnections < self.options.size) {
                        // Connection has work items, then put it back on the queue
                        // and create a new connection
                        if (connection.workItems.length > 0) {
                            // Lets put the workItem back on the list
                            self.queue.unshift(workItem);
                            // Create a new connection
                            // eslint-disable-next-line no-use-before-define
                            _createConnection(self);
                            // Break from the loop

                            break;
                        }
                    }

                    // Get actual binary commands
                    const buffer = workItem.buffer;

                    // Set current status of authentication process
                    workItem.authenticating = self.authenticating;
                    workItem.authenticatingTimestamp = self.authenticatingTimestamp;

                    // If we are monitoring take the connection of the availableConnections
                    if (workItem.monitoring) {
                        moveConnectionBetween(connection, self.availableConnections, self.inUseConnections);
                    }

                    // Track the executing commands on the mongo server
                    // as long as there is an expected response
                    if (!workItem.noResponse) {
                        connection.workItems.push(workItem);
                    }

                    // We have a custom socketTimeout
                    if (!workItem.immediateRelease && is.number(workItem.socketTimeout)) {
                        connection.setSocketTimeout(workItem.socketTimeout);
                    }

                    // Put operation on the wire
                    if (is.array(buffer)) {
                        for (const b of buffer) {
                            connection.write(b);
                        }
                    } else {
                        connection.write(buffer);
                    }

                    if (workItem.immediateRelease && self.authenticating) {
                        self.nonAuthenticatedConnections.push(connection);
                    }
                } else {
                    // Remove the disconnected connection
                    removeConnection(self, connection);
                    // Flush any monitoring operations in the queue, failing fast
                    flushMonitoringOperations(self.queue);
                }
            }
        });

        self.executing = false;
    };
};

const messageHandler = (self) => {
    return (message, connection) => {
        // workItem to execute
        let workItem = null;

        // Locate the workItem
        for (let i = 0; i < connection.workItems.length; i++) {
            if (connection.workItems[i].requestId === message.responseTo) {
                // Get the callback
                workItem = connection.workItems[i];
                // Remove from list of workItems
                connection.workItems.splice(i, 1);
            }
        }


        // Reset timeout counter
        self.numberOfConsecutiveTimeouts = 0;

        // Reset the connection timeout if we modified it for
        // this operation
        if (workItem.socketTimeout) {
            connection.resetSocketTimeout();
        }

        // Authenticate any straggler connections
        const authenticateStragglers = (self, connection, callback) => {
            // Get any non authenticated connections
            const connections = self.nonAuthenticatedConnections.slice(0);
            const nonAuthenticatedConnections = self.nonAuthenticatedConnections;
            self.nonAuthenticatedConnections = [];

            // Establish if the connection need to be authenticated
            // Add to authentication list if
            // 1. we were in an authentication process when the operation was executed
            // 2. our current authentication timestamp is from the workItem one, meaning an auth has happened
            if (
                connection.workItems.length === 1 &&
                (
                    connection.workItems[0].authenticating === true ||
                    (
                        is.number(connection.workItems[0].authenticatingTimestamp) &&
                        connection.workItems[0].authenticatingTimestamp !== self.authenticatingTimestamp
                    )
                )
            ) {
                // Add connection to the list
                connections.push(connection);
            }

            // No connections need to be re-authenticated
            if (connections.length === 0) {
                // Release the connection back to the pool
                moveConnectionBetween(connection, self.inUseConnections, self.availableConnections);
                // Finish
                return callback();
            }

            // Apply re-authentication to all connections before releasing back to pool
            let connectionCount = connections.length;
            // Authenticate all connections
            const handler = () => {
                connectionCount = connectionCount - 1;

                if (connectionCount === 0) {
                    // Put non authenticated connections in available connections
                    self.availableConnections = self.availableConnections.concat(nonAuthenticatedConnections);
                    // Release the connection back to the pool
                    moveConnectionBetween(connection, self.inUseConnections, self.availableConnections);
                    // Return
                    callback();
                }
            };
            for (let i = 0; i < connectionCount; i++) {
                reauthenticate(self, connections[i], handler);
            }
        };

        const handleOperationCallback = (self, cb, err, result) => {
            // No domain enabled
            if (!self.options.domainsEnabled) {
                return process.nextTick(() => {
                    return cb(err, result);
                });
            }

            // Domain enabled just call the callback
            cb(err, result);
        };

        authenticateStragglers(self, connection, () => {
            // Keep executing, ensure current message handler does not stop execution
            if (!self.executing) {
                process.nextTick(() => {
                    _execute(self)();
                });
            }

            // Time to dispatch the message if we have a callback
            if (!workItem.immediateRelease) {
                try {
                    // Parse the message according to the provided options
                    message.parse(workItem);
                } catch (err) {
                    return handleOperationCallback(self, workItem.cb, MongoError.create(err));
                }

                // Establish if we have an error
                if (
                    workItem.command &&
                    message.documents[0] &&
                    (
                        message.documents[0].ok === 0 ||
                        message.documents[0].$err ||
                        message.documents[0].errmsg ||
                        message.documents[0].code
                    )
                ) {
                    return handleOperationCallback(self, workItem.cb, MongoError.create(message.documents[0]));
                }

                // Add the connection details
                message.hashedName = connection.hashedName;

                // Return the documents
                handleOperationCallback(
                    self,
                    workItem.cb,
                    null,
                    new CommandResult(workItem.fullResult ? message : message.documents[0], connection, message)
                );
            }
        });
    };
};

// All event handlers
const handlers = ["close", "message", "error", "timeout", "parseError", "connect"];

const attemptReconnect = (self) => {
    return () => {
        self.emit("attemptReconnect", self);
        if (self.state === DESTROYED || self.state === DESTROYING) {
            return;
        }

        // We are connected do not try again
        if (self.isConnected()) {
            self.reconnectId = null;
            return;
        }

        // If we have failure schedule a retry
        const _connectionFailureHandler = (self) => {
            return function () {
                if (this._connectionFailHandled) {
                    return;
                }
                this._connectionFailHandled = true;
                // Destroy the connection
                this.destroy();
                // Count down the number of reconnects
                self.retriesLeft = self.retriesLeft - 1;
                // How many retries are left
                if (self.retriesLeft === 0) {
                    // Destroy the instance
                    self.destroy();
                    // Emit close event
                    self.emit("reconnectFailed", new MongoError(`failed to reconnect after ${self.options.reconnectTries} attempts with interval ${self.options.reconnectInterval} ms`));
                } else {
                    self.reconnectId = setTimeout(attemptReconnect(self), self.options.reconnectInterval);
                }
            };
        };

        // Got a connect handler
        const _connectHandler = (self) => {
            return function () {
                // Assign
                const connection = this;

                // Pool destroyed stop the connection
                if (self.state === DESTROYED || self.state === DESTROYING) {
                    return connection.destroy();
                }

                // Clear out all handlers
                for (const event of handlers) {
                    connection.removeAllListeners(event);
                }

                // Reset reconnect id
                self.reconnectId = null;

                // Apply pool connection handlers
                connection.on("error", connectionFailureHandler(self, "error"));
                connection.on("close", connectionFailureHandler(self, "close"));
                connection.on("timeout", connectionFailureHandler(self, "timeout"));
                connection.on("parseError", connectionFailureHandler(self, "parseError"));

                // Apply any auth to the connection
                reauthenticate(self, this, () => {
                    // Reset retries
                    self.retriesLeft = self.options.reconnectTries;
                    // Push to available connections
                    self.availableConnections.push(connection);
                    // Set the reconnectConnection to null
                    self.reconnectConnection = null;
                    // Emit reconnect event
                    self.emit("reconnect", self);
                    // Trigger execute to start everything up again
                    _execute(self)();
                });
            };
        };

        // Create a connection
        self.reconnectConnection = new Connection(messageHandler(self), self.options);
        // Add handlers
        self.reconnectConnection.on("close", _connectionFailureHandler(self, "close"));
        self.reconnectConnection.on("error", _connectionFailureHandler(self, "error"));
        self.reconnectConnection.on("timeout", _connectionFailureHandler(self, "timeout"));
        self.reconnectConnection.on("parseError", _connectionFailureHandler(self, "parseError"));
        // On connection
        self.reconnectConnection.on("connect", _connectHandler(self));
        // Attempt connection
        self.reconnectConnection.connect();
    };
};

// Events
const events = ["error", "close", "timeout", "parseError", "connect"];

// Destroy the connections
const destroy = (self, connections) => {
    // Destroy all connections
    connections.forEach((c) => {
        // Remove all listeners
        for (let i = 0; i < events.length; i++) {
            c.removeAllListeners(events[i]);
        }
        // Destroy connection
        c.destroy();
    });

    // Zero out all connections
    self.inUseConnections = [];
    self.availableConnections = [];
    self.nonAuthenticatedConnections = [];
    self.connectingConnections = [];

    // Set state to destroyed
    stateTransition(self, DESTROYED);
};

const _createConnection = (self) => {
    if (self.state === DESTROYED || self.state === DESTROYING) {
        return;
    }
    const connection = new Connection(messageHandler(self), self.options);

    // Push the connection
    self.connectingConnections.push(connection);

    // Handle any errors
    const tempErrorHandler = (_connection) => {
        return () => {
            // Destroy the connection
            _connection.destroy();
            // Remove the connection from the connectingConnections list
            removeConnection(self, _connection);
            // Start reconnection attempts
            if (!self.reconnectId && self.options.reconnect) {
                self.reconnectId = setTimeout(attemptReconnect(self), self.options.reconnectInterval);
            }
        };
    };

    // Handle successful connection
    const tempConnectHandler = (_connection) => {
        return () => {
            // Destroyed state return
            if (self.state === DESTROYED || self.state === DESTROYING) {
                // Remove the connection from the list
                removeConnection(self, _connection);
                return _connection.destroy();
            }

            // Destroy all event emitters
            handlers.forEach((e) => {
                _connection.removeAllListeners(e);
            });

            // Add the final handlers
            _connection.once("close", connectionFailureHandler(self, "close"));
            _connection.once("error", connectionFailureHandler(self, "error"));
            _connection.once("timeout", connectionFailureHandler(self, "timeout"));
            _connection.once("parseError", connectionFailureHandler(self, "parseError"));

            // Signal
            reauthenticate(self, _connection, (err) => {
                if (self.state === DESTROYED || self.state === DESTROYING) {
                    return _connection.destroy();
                }
                // Remove the connection from the connectingConnections list
                removeConnection(self, _connection);

                // Handle error
                if (err) {
                    return _connection.destroy();
                }

                // If we are authenticating at the moment
                // Do not automatially put in available connections
                // As we need to apply the credentials first
                if (self.authenticating) {
                    self.nonAuthenticatedConnections.push(_connection);
                } else {
                    // Push to available
                    self.availableConnections.push(_connection);
                    // Execute any work waiting
                    _execute(self)();
                }
            });
        };
    };

    // Add all handlers
    connection.once("close", tempErrorHandler(connection));
    connection.once("error", tempErrorHandler(connection));
    connection.once("timeout", tempErrorHandler(connection));
    connection.once("parseError", tempErrorHandler(connection));
    connection.once("connect", tempConnectHandler(connection));

    // Start connection
    connection.connect();
};

/**
 * Creates a new Pool instance
 * @class
 * @param {string} options.host The server host
 * @param {number} options.port The server port
 * @param {number} [options.size=1] Max server connection pool size
 * @param {boolean} [options.reconnect=true] Server will attempt to reconnect on loss of connection
 * @param {number} [options.reconnectTries=30] Server attempt to reconnect #times
 * @param {number} [options.reconnectInterval=1000] Server will wait # milliseconds between retries
 * @param {boolean} [options.keepAlive=true] TCP Connection keep alive enabled
 * @param {number} [options.keepAliveInitialDelay=0] Initial delay before TCP keep alive enabled
 * @param {boolean} [options.noDelay=true] TCP Connection no delay
 * @param {number} [options.connectionTimeout=0] TCP Connection timeout setting
 * @param {number} [options.socketTimeout=0] TCP Socket timeout setting
 * @param {number} [options.monitoringSocketTimeout=30000] TCP Socket timeout setting for replicaset monitoring socket
 * @param {boolean} [options.ssl=false] Use SSL for connection
 * @param {boolean|function} [options.checkServerIdentity=true] Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function.
 * @param {Buffer} [options.ca] SSL Certificate store binary buffer
 * @param {Buffer} [options.cert] SSL Certificate binary buffer
 * @param {Buffer} [options.key] SSL Key file binary buffer
 * @param {string} [options.passPhrase] SSL Certificate pass phrase
 * @param {boolean} [options.rejectUnauthorized=false] Reject unauthorized server certificates
 * @param {boolean} [options.promoteLongs=true] Convert Long values from the db into Numbers if they fit into 53 bits
 * @param {boolean} [options.promoteValues=true] Promotes BSON values to native types where possible, set to false to only receive wrapper types.
 * @param {boolean} [options.promoteBuffers=false] Promotes Binary BSON values to native Node Buffers.
 * @param {boolean} [options.domainsEnabled=false] Enable the wrapping of the callback in the current domain, disabled by default to avoid perf hit.
 * @fires Pool#connect
 * @fires Pool#close
 * @fires Pool#error
 * @fires Pool#timeout
 * @fires Pool#parseError
 * @return {Pool} A cursor instance
 */

export default class Pool extends EventEmitter {
    constructor(options) {
        super();
        // Add the options
        this.options = Object.assign({
            // Host and port settings
            host: "localhost",
            port: 27017,
            // Pool default max size
            size: 5,
            // socket settings
            connectionTimeout: 30000,
            socketTimeout: 30000,
            keepAlive: true,
            keepAliveInitialDelay: 0,
            noDelay: true,
            // SSL Settings
            ssl: false, checkServerIdentity: true,
            ca: null, crl: null, cert: null, key: null, passPhrase: null,
            rejectUnauthorized: false,
            promoteLongs: true,
            promoteValues: true,
            promoteBuffers: false,
            // Reconnection options
            reconnect: true,
            reconnectInterval: 1000,
            reconnectTries: 30,
            // Enable domains
            domainsEnabled: false
        }, options);

        // Identification information
        this.id = _id++;
        // Current reconnect retries
        this.retriesLeft = this.options.reconnectTries;
        this.reconnectId = null;
        // No bson parser passed in
        if (
            !options.bson ||
            (options.bson && (!is.function(options.bson.serialize) || !is.function(options.bson.deserialize)))
        ) {
            throw new x.InvalidArgument("must pass in valid bson parser");
        }

        // Pool state
        this.state = DISCONNECTED;
        // Connections
        this.availableConnections = [];
        this.inUseConnections = [];
        this.connectingConnections = [];
        // Currently executing
        this.executing = false;
        // Operation work queue
        this.queue = [];

        // All the authProviders
        this.authProviders = options.authProviders || {
            mongocr: new MongoCR(options.bson),
            x509: new X509(options.bson),
            plain: new Plain(options.bson),
            "scram-sha-1": new ScramSHA1(options.bson)
        };

        // Contains the reconnect connection
        this.reconnectConnection = null;


        // Are we currently authenticating
        this.authenticating = false;
        this.loggingout = false;
        this.nonAuthenticatedConnections = [];
        this.authenticatingTimestamp = null;
        // Number of consecutive timeouts caught
        this.numberOfConsecutiveTimeouts = 0;
        // Current pool Index
        this.connectionIndex = 0;
    }

    get size() {
        return this.options.size;
    }

    get connectionTimeout() {
        return this.options.connectionTimeout;
    }

    get socketTimeout() {
        return this.options.socketTimeout;
    }

    socketCount() {
        return this.availableConnections.length + this.inUseConnections.length; // + this.connectingConnections.length;
    }

    allConnections() {
        return [...this.availableConnections, ...this.inUseConnections, ...this.connectingConnections];
    }

    /**
     * Get a pool connection (round-robin)
     * @method
     * @return {Connection}
     */
    get() {
        return this.allConnections()[0];
    }

    isConnected() {
        // We are in a destroyed state
        if (this.state === DESTROYED || this.state === DESTROYING) {
            return false;
        }

        // Get connections
        const connections = [...this.availableConnections, ...this.inUseConnections];

        // Check if we have any connected connections
        for (const conn of connections) {
            if (conn.isConnected()) {
                return true;
            }
        }

        // Might be authenticating, but we are still connected
        if (connections.length === 0 && this.authenticating) {
            return true;
        }

        // Not connected
        return false;
    }

    isDestroyed() {
        return this.state === DESTROYED || this.state === DESTROYING;
    }

    isDisconnected() {
        return this.state === DISCONNECTED;
    }

    connect(...args) {
        if (this.state !== DISCONNECTED) {
            throw new MongoError(`connection in unlawful state ${this.state}`);
        }

        const self = this;
        // Transition to connecting state
        stateTransition(this, CONNECTING);
        // Create an array of the arguments
        // Create a connection
        const connection = new Connection(messageHandler(self), this.options);
        // Add to list of connections
        this.connectingConnections.push(connection);
        // Add listeners to the connection
        connection.once("connect", (connection) => {
            if (self.state === DESTROYED || self.state === DESTROYING) {
                return self.destroy();
            }

            // ????

            // If we are in a topology, delegate the auth to it
            // This is to avoid issues where we would auth against an
            // arbiter
            // if (self.options.inTopology) {
            //     // Set connected mode
            //     stateTransition(self, CONNECTED);

            //     // Move the active connection
            //     moveConnectionBetween(connection, self.connectingConnections, self.availableConnections);

            //     // Emit the connect event
            //     return self.emit('connect', self);
            // }

            // Apply any store credentials
            reauthenticate(self, connection, (err) => {
                if (self.state === DESTROYED || self.state === DESTROYING) {
                    return self.destroy();
                }

                // We have an error emit it
                if (err) {
                    // Destroy the pool
                    self.destroy();
                    // Emit the error
                    return self.emit("error", err);
                }

                // Authenticate
                authenticate(self, args, connection, (err) => {
                    if (self.state === DESTROYED || self.state === DESTROYING) {
                        return self.destroy();
                    }

                    // We have an error emit it
                    if (err) {
                        // Destroy the pool
                        self.destroy();
                        // Emit the error
                        return self.emit("error", err);
                    }
                    // Set connected mode
                    stateTransition(self, CONNECTED);

                    // Move the active connection
                    moveConnectionBetween(connection, self.connectingConnections, self.availableConnections);

                    // Emit the connect event
                    self.emit("connect", self);
                });
            });
        });

        // Add error handlers
        connection.once("error", connectionFailureHandler(this, "error"));
        connection.once("close", connectionFailureHandler(this, "close"));
        connection.once("timeout", connectionFailureHandler(this, "timeout"));
        connection.once("parseError", connectionFailureHandler(this, "parseError"));

        try {
            connection.connect();
        } catch (err) {
            // SSL or something threw on connect
            process.nextTick(() => {
                self.emit("error", err);
            });
        }
    }

    auth(...args) {
        const [mechanism] = args;
        const callback = args.pop();

        // If we don't have the mechanism fail
        if (is.nil(this.authProviders[mechanism]) && mechanism !== "default") {
            throw new MongoError(`auth provider ${mechanism} does not exist`);
        }

        // Signal that we are authenticating a new set of credentials
        this.authenticating = true;
        this.authenticatingTimestamp = new Date().getTime();

        // Authenticate all live connections
        const authenticateLiveConnections = (self, args, cb) => {
            // Get the current viable connections
            const connections = self.allConnections();
            // Allow nothing else to use the connections while we authenticate them
            self.availableConnections = [];

            let connectionsCount = connections.length;
            let error = null;
            // No connections available, return
            if (connectionsCount === 0) {
                self.authenticating = false;
                return callback(null);
            }
            // Authenticate the connections
            const handler = (err) => {
                connectionsCount = connectionsCount - 1;

                // Store the error
                if (err) {
                    error = err;
                }

                // Processed all connections
                if (connectionsCount === 0) {
                    // Auth finished
                    self.authenticating = false;
                    // Add the connections back to available connections
                    self.availableConnections = self.availableConnections.concat(connections);
                    // We had an error, return it
                    if (error) {
                        return cb(error);
                    }
                    cb(null);
                }
            };
            for (const conn of connections) {
                authenticate(self, args, conn, handler);
            }
        };

        // Wait for a logout in process to happen
        const waitForLogout = (self, cb) => {
            if (!self.loggingout) {
                return cb();
            }
            setTimeout(() => {
                waitForLogout(self, cb);
            }, 1);
        };

        // Wait for loggout to finish
        waitForLogout(this, () => {
            // Authenticate all live connections
            authenticateLiveConnections(this, args, (err) => {
                // Credentials correctly stored in auth provider if successful
                // Any new connections will now reauthenticate correctly
                this.authenticating = false;
                // Return after authentication connections
                callback(err);
            });
        });
    }

    logout(dbName, callback) {
        if (!is.string(dbName)) {
            throw new MongoError("logout method requires a db name as first argument");
        }

        if (!is.function(callback)) {
            throw new MongoError("logout method requires a callback");
        }

        // Indicate logout in process
        this.loggingout = true;

        // Get all relevant connections
        const connections = [...this.availableConnections, ...this.inUseConnections];
        let count = connections.length;
        // Store any error
        let error = null;

        // Send logout command over all the connections
        const handler = (err) => {
            count = count - 1;
            if (err) {
                error = err;
            }

            if (count === 0) {
                this.loggingout = false;
                callback(error);
            }
        };
        for (const conn of connections) {
            write(this)(conn, new Query(
                this.options.bson,
                `${dbName}.$cmd`,
                { logout: 1 },
                { numberToSkip: 0, numberToReturn: 1 }
            ), handler);
        }
    }

    unref() {
        // Get all the known connections
        for (const l of [this.availableConnections, this.inUseConnections, this.connectingConnections]) {
            for (const conn of l) {
                conn.unref();
            }
        }
    }

    destroy(force) {
        // Do not try again if the pool is already dead
        if (this.state === DESTROYED || this.state === DESTROYING) {
            return;
        }
        // Set state to destroyed
        stateTransition(this, DESTROYING);

        // Are we force closing
        if (force) {
            // Get all the known connections
            return destroy(this, [
                ...this.availableConnections,
                ...this.inUseConnections,
                ...this.nonAuthenticatedConnections,
                ...this.connectingConnections
            ]);
        }

        // Clear out the reconnect if set
        if (this.reconnectId) {
            clearTimeout(this.reconnectId);
        }

        // If we have a reconnect connection running, close
        // immediately
        if (this.reconnectConnection) {
            this.reconnectConnection.destroy();
        }

        // Wait for the operations to drain before we close the pool
        const checkStatus = () => {
            flushMonitoringOperations(this.queue);

            if (this.queue.length === 0) {
                // Get all the known connections
                const connections = [
                    ...this.availableConnections,
                    ...this.inUseConnections,
                    ...this.nonAuthenticatedConnections,
                    ...this.connectingConnections
                ];

                for (const conn of connections) {
                    if (conn.workItems.length > 0) {
                        return setTimeout(checkStatus, 1);
                    }
                }
                destroy(this, connections);
            } else {
                // Ensure we empty the queue
                _execute(this)();
                // Set timeout
                setTimeout(checkStatus, 1);
            }
        };

        // Initiate drain of operations
        checkStatus();
    }

    write(commands, options, cb) {
        // Ensure we have a callback
        if (is.function(options)) {
            cb = options;
        }

        // Always have options
        options = options || {};

        // Pool was destroyed error out
        if (this.state === DESTROYED || this.state === DESTROYING) {
            // Callback with an error
            if (cb) {
                try {
                    cb(new MongoError("pool destroyed"));
                } catch (err) {
                    process.nextTick(() => {
                        throw err;
                    });
                }
            }

            return;
        }

        // if (this.options.domainsEnabled && process.domain && is.function(cb)) {
        //     // if we have a domain bind to it
        //     const oldCb = cb;
        //     cb = process.domain.bind(function () {
        //         // v8 - argumentsToArray one-liner
        //         const args = new Array(arguments.length); for (let i = 0; i < arguments.length; i++) {
        //             args[i] = arguments[i];
        //         }
        //         // bounce off event loop so domain switch takes place
        //         process.nextTick(() => {
        //             oldCb.apply(null, args);
        //         });
        //     });
        // }

        // Do we have an operation
        const operation = {
            cb,
            raw: false,
            promoteLongs: true,
            promoteValues: true,
            promoteBuffers: false,
            fullResult: false
        };

        let buffer = null;

        if (is.array(commands)) {
            buffer = [];

            for (const cmd of commands) {
                buffer.push(cmd.toBin());
            }

            // Get the requestId
            operation.requestId = commands[commands.length - 1].requestId;
        } else {
            operation.requestId = commands.requestId;
            buffer = commands.toBin();
        }

        // Set the buffers
        operation.buffer = buffer;

        // Set the options for the parsing
        operation.promoteLongs = is.boolean(options.promoteLongs) ? options.promoteLongs : true;
        operation.promoteValues = is.boolean(options.promoteValues) ? options.promoteValues : true;
        operation.promoteBuffers = is.boolean(options.promoteBuffers) ? options.promoteBuffers : false;
        operation.raw = is.boolean(options.raw) ? options.raw : false;
        operation.immediateRelease = is.boolean(options.immediateRelease) ? options.immediateRelease : false;
        operation.documentsReturnedIn = options.documentsReturnedIn;
        operation.command = is.boolean(options.command) ? options.command : false;
        operation.fullResult = is.boolean(options.fullResult) ? options.fullResult : false;
        operation.noResponse = is.boolean(options.noResponse) ? options.noResponse : false;
        // operation.requestId = options.requestId;

        // Optional per operation socketTimeout
        operation.socketTimeout = options.socketTimeout;
        operation.monitoring = options.monitoring;
        // Custom socket Timeout
        if (options.socketTimeout) {
            operation.socketTimeout = options.socketTimeout;
        }

        // We need to have a callback function unless the message returns no response
        if (!is.function(cb) && !options.noResponse) {
            throw new MongoError("write method must provide a callback");
        }

        // If we have a monitoring operation schedule as the very first operation
        // Otherwise add to back of queue
        if (options.monitoring) {
            this.queue.unshift(operation);
        } else {
            this.queue.push(operation);
        }

        // Attempt to execute the operation
        if (!this.executing) {
            process.nextTick(() => {
                _execute(this)();
            });
        }
    }
}

Pool._execute = _execute;
