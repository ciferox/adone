import fsMethods from "./fs_methods";

const binding = process.binding("fs");
const {
    fstat: bindingFstat,
    FSReqCallback,
    writeBuffers
} = binding;

export default class NativeFsMocker {
    constructor(customFs) {
        this.backup = {};
        this.cfs = customFs;
        this.nfs = require("fs");
    }

    substitute() {
        const nfs = this.nfs;
        const cfs = this.cfs;
        for (const method of fsMethods) {
            this.backup[method] = nfs[method];
            nfs[method] = (...args) => cfs[method](...args);
        }

        // We must override this method, because inside of fs module, readFileSync() function
        // calls binding.fstat() with wrong file descriptor.
        binding.fstat = (mappedFd, ...args) => {
            const old = Error.prepareStackTrace;
            Error.prepareStackTrace = (_, stack) => stack;
            const stack = new Error().stack.slice(1);
            Error.prepareStackTrace = old;
            const fdi = cfs._fdMap.get(mappedFd);
            let fd;
            if (fdi && stack[0].getFunctionName() === "tryStatSync") {
                fd = fdi.fd;
            } else {
                fd = mappedFd;
            }
            return bindingFstat(fd, ...args);
        };

        const writev = function (fd, chunks, position, callback) {
            const wrapper = function (err, written) {
                // Retain a reference to chunks so that they can't be GC'ed too soon.
                callback(err, written || 0, chunks);
            };

            const req = new FSReqCallback();
            req.oncomplete = wrapper;
            writeBuffers(fd, chunks, position, req);
        };

        this.origWriteStreamWritev = nfs.WriteStream.prototype._writev;
        nfs.WriteStream.prototype._writev = function (data, cb) {
            if (typeof this.fd !== "number") {
                return this.once("open", function () {
                    this._writev(data, cb);
                });
            }

            const self = this;
            const len = data.length;
            const chunks = new Array(len);
            let size = 0;

            for (let i = 0; i < len; i++) {
                const chunk = data[i].chunk;

                chunks[i] = chunk;
                size += chunk.length;
            }

            const { fd } = cfs._fdMap.get(this.fd);
            writev(fd, chunks, this.pos, (er, bytes) => {
                if (er) {
                    self.destroy();
                    return cb(er);
                }
                self.bytesWritten += bytes;
                cb();
            });

            if (this.pos !== undefined) {
                this.pos += size;
            }
        };
    }

    restore() {
        for (const method of fsMethods) {
            this.cfs[method] = this.backup[method];
        }

        binding.fstat = bindingFstat;

        this.nfs.WriteStream.prototype._writev = this.origWriteStreamWritev;
    }
}
