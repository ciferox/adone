/**
 * gpmclient.js - support the gpm mouse protocol
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */



const {
    std: { net, fs },
    event: { EventEmitter }
} = adone;

const GPM_USE_MAGIC = false;

const GPM_MOVE = 1;
const GPM_DRAG = 2;
const GPM_DOWN = 4;
const GPM_UP = 8;

const GPM_DOUBLE = 32;
const GPM_MFLAG = 128;

const GPM_REQ_NOPASTE = 3;
const GPM_HARD = 256;

const GPM_MAGIC = 0x47706D4C;
const GPM_SOCKET = "/dev/gpmctl";

// typedef struct Gpm_Connect {
//   unsigned short eventMask, defaultMask;
//   unsigned short minMod, maxMod;
//   int pid;
//   int vc;
// } Gpm_Connect;

function send_config(socket, Gpm_Connect, callback) {
    let buffer;
    if (GPM_USE_MAGIC) {
        buffer = new Buffer(20);
        buffer.writeUInt32LE(GPM_MAGIC, 0);
        buffer.writeUInt16LE(Gpm_Connect.eventMask, 4);
        buffer.writeUInt16LE(Gpm_Connect.defaultMask, 6);
        buffer.writeUInt16LE(Gpm_Connect.minMod, 8);
        buffer.writeUInt16LE(Gpm_Connect.maxMod, 10);
        buffer.writeInt16LE(process.pid, 12);
        buffer.writeInt16LE(Gpm_Connect.vc, 16);
    } else {
        buffer = new Buffer(16);
        buffer.writeUInt16LE(Gpm_Connect.eventMask, 0);
        buffer.writeUInt16LE(Gpm_Connect.defaultMask, 2);
        buffer.writeUInt16LE(Gpm_Connect.minMod, 4);
        buffer.writeUInt16LE(Gpm_Connect.maxMod, 6);
        buffer.writeInt16LE(Gpm_Connect.pid, 8);
        buffer.writeInt16LE(Gpm_Connect.vc, 12);
    }
    socket.write(buffer, () => {
        if (callback) {
            callback();
        }
    });
}

// typedef struct Gpm_Event {
//   unsigned char buttons, modifiers;  // try to be a multiple of 4
//   unsigned short vc;
//   short dx, dy, x, y; // displacement x,y for this event, and absolute x,y
//   enum Gpm_Etype type;
//   // clicks e.g. double click are determined by time-based processing
//   int clicks;
//   enum Gpm_Margin margin;
//   // wdx/y: displacement of wheels in this event. Absolute values are not
//   // required, because wheel movement is typically used for scrolling
//   // or selecting fields, not for cursor positioning. The application
//   // can determine when the end of file or form is reached, and not
//   // go any further.
//   // A single mouse will use wdy, "vertical scroll" wheel.
//   short wdx, wdy;
// } Gpm_Event;

function parseEvent(raw) {
    const evnt = {};
    evnt.buttons = raw[0];
    evnt.modifiers = raw[1];
    evnt.vc = raw.readUInt16LE(2);
    evnt.dx = raw.readInt16LE(4);
    evnt.dy = raw.readInt16LE(6);
    evnt.x = raw.readInt16LE(8);
    evnt.y = raw.readInt16LE(10);
    evnt.type = raw.readInt16LE(12);
    evnt.clicks = raw.readInt32LE(16);
    evnt.margin = raw.readInt32LE(20);
    evnt.wdx = raw.readInt16LE(24);
    evnt.wdy = raw.readInt16LE(26);
    return evnt;
}

export default class GpmClient extends EventEmitter {
    constructor() {
        super();
        const pid = process.pid;

        // check tty for /dev/tty[n]
        let path;
        try {
            path = fs.readlinkSync(`/proc/${pid}/fd/0`);
        } catch (e) {
            //
        }
        let tty = /tty[0-9]+$/.exec(path);
        if (tty === null) {
            // TODO: should  also check for /dev/input/..
        }

        let vc;
        if (tty) {
            tty = tty[0];
            vc = Number(/[0-9]+$/.exec(tty)[0]);
        }

        const self = this;

        if (tty) {
            fs.stat(GPM_SOCKET, function (err, stat) {
                if (err || !stat.isSocket()) {
                    return;
                }

                const conf = {
                    eventMask: 0xffff,
                    defaultMask: GPM_MOVE | GPM_HARD,
                    minMod: 0,
                    maxMod: 0xffff,
                    pid,
                    vc
                };

                const gpm = net.createConnection(GPM_SOCKET);
                this.gpm = gpm;

                gpm.on("connect", () => {
                    send_config(gpm, conf, () => {
                        conf.pid = 0;
                        conf.vc = GPM_REQ_NOPASTE;
                        //send_config(gpm, conf);
                    });
                });

                gpm.on("data", (packet) => {
                    const evnt = parseEvent(packet);
                    switch (evnt.type & 15) {
                        case GPM_MOVE:
                            if (evnt.dx || evnt.dy) {
                                self.emit("move", evnt.buttons, evnt.modifiers, evnt.x, evnt.y);
                            }
                            if (evnt.wdx || evnt.wdy) {
                                self.emit("mousewheel",
                                    evnt.buttons, evnt.modifiers,
                                    evnt.x, evnt.y, evnt.wdx, evnt.wdy);
                            }
                            break;
                        case GPM_DRAG:
                            if (evnt.dx || evnt.dy) {
                                self.emit("drag", evnt.buttons, evnt.modifiers, evnt.x, evnt.y);
                            }
                            if (evnt.wdx || evnt.wdy) {
                                self.emit("mousewheel",
                                    evnt.buttons, evnt.modifiers,
                                    evnt.x, evnt.y, evnt.wdx, evnt.wdy);
                            }
                            break;
                        case GPM_DOWN:
                            self.emit("btndown", evnt.buttons, evnt.modifiers, evnt.x, evnt.y);
                            if (evnt.type & GPM_DOUBLE) {
                                self.emit("dblclick", evnt.buttons, evnt.modifiers, evnt.x, evnt.y);
                            }
                            break;
                        case GPM_UP:
                            self.emit("btnup", evnt.buttons, evnt.modifiers, evnt.x, evnt.y);
                            if (!(evnt.type & GPM_MFLAG)) {
                                self.emit("click", evnt.buttons, evnt.modifiers, evnt.x, evnt.y);
                            }
                            break;
                    }
                });

                gpm.on("error", () => {
                    self.stop();
                });
            });
        }
    }

    stop() {
        if (this.gpm) {
            this.gpm.end();
        }
        delete this.gpm;
    }

    ButtonName(btn) {
        if (btn & 4) {
            return "left";
        }
        if (btn & 2) {
            return "middle";
        }
        if (btn & 1) {
            return "right";
        }
        return "";
    }

    hasShiftKey(mod) {
        return (mod & 1) ? true : false;
    }

    hasCtrlKey(mod) {
        return (mod & 4) ? true : false;
    }

    hasMetaKey(mod) {
        return (mod & 8) ? true : false;
    }
}
