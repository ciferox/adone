
var cp = adone.std.child_process;
var Terminal = require("./terminal");

function Video(options) {
    var self = this
    , shell
    , args;

    if (!(this instanceof adone.terminal.widget.Node)) {
        return new Video(options);
    }

    options = options || {};

    adone.terminal.widget.Element.call(this, options);

    if (this.exists("mplayer")) {
        shell = "mplayer";
        args = ["-vo", "caca", "-quiet", options.file];
    } else if (this.exists("mpv")) {
        shell = "mpv";
        args = ["--vo", "caca", "--really-quiet", options.file];
    } else {
        this.parseTags = true;
        this.setContent("{red-fg}{bold}Error:{/bold}"
      + " mplayer or mpv not installed.{/red-fg}");
        return this;
    }

    var opts = {
        parent: this,
        left: 0,
        top: 0,
        width: this.width - this.iwidth,
        height: this.height - this.iheight,
        shell: shell,
        args: args.slice()
    };

    this.now = Date.now() / 1000 | 0;
    this.start = opts.start || 0;
    if (this.start) {
        if (shell === "mplayer") {
            opts.args.unshift("-ss", this.start + "");
        } else if (shell === "mpv") {
            opts.args.unshift("--start", this.start + "");
        }
    }

    var DISPLAY = process.env.DISPLAY;
    delete process.env.DISPLAY;
    this.tty = new Terminal(opts);
    process.env.DISPLAY = DISPLAY;

    this.on("click", function() {
        self.tty.pty.write("p");
    });

  // mplayer/mpv cannot resize itself in the terminal, so we have
  // to restart it at the correct start time.
    this.on("resize", function() {
        self.tty.destroy();

        var opts = {
            parent: self,
            left: 0,
            top: 0,
            width: self.width - self.iwidth,
            height: self.height - self.iheight,
            shell: shell,
            args: args.slice()
        };

        var watched = (Date.now() / 1000 | 0) - self.now;
        self.now = Date.now() / 1000 | 0;
        self.start += watched;
        if (shell === "mplayer") {
            opts.args.unshift("-ss", self.start + "");
        } else if (shell === "mpv") {
            opts.args.unshift("--start", self.start + "");
        }

        var DISPLAY = process.env.DISPLAY;
        delete process.env.DISPLAY;
        self.tty = new Terminal(opts);
        process.env.DISPLAY = DISPLAY;
        self.screen.render();
    });
}

Video.prototype.__proto__ = adone.terminal.widget.Element.prototype;

Video.prototype.type = "video";

Video.prototype.exists = function(program) {
    try {
        return !!+cp.execSync("type "
      + program + " > /dev/null 2> /dev/null"
      + " && echo 1", { encoding: "utf8" }).trim();
    } catch (e) {
        return false;
    }
};

module.exports.default = Video;