const transport = exports;

// Exports utils
transport.utils = require("./utils");

// Export parser&framer
transport.protocol = {};
transport.protocol.base = require("./protocol/base");
transport.protocol.spdy = require("./protocol/spdy");
transport.protocol.http2 = require("./protocol/http2");

// Window
transport.Window = require("./window");

// Priority Tree
transport.Priority = require("./priority");

// Export Connection and Stream
transport.Stream = require("./stream").Stream;
transport.Connection = require("./connection").Connection;

// Just for `transport.connection.create()`
transport.connection = transport.Connection;
