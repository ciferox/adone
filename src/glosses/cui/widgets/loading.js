
const { is } = adone;

export default class Loading extends adone.cui.widget.Element {
    constructor(options = { }) {
        options.spinner = options.spinner || "dots";
        if (!is.propertyDefined(adone.text.spinner, options.spinner)) {
            options.spinner = "dots";
        }
        if (is.undefined(options.style)) {
            options.style = {};
        }
        if (is.undefined(options.style.spinner)) {
            options.style.spinner = {};
        }
        super(options);

        this._.spinner = adone.text.spinner[options.spinner];
        this._.frame = 0;
        this._.message = "";
        this._.timer = null;
    }

    setMessage(message) {
        this._.message = message;
    } 

    start() {
        // XXX Keep above:
        // var parent = this.parent;
        // this.detach();
        // parent.append(this);

        if (!is.null(this._.timer)) {
            return;
        }

        const renderContent = () => {
            const frames = this._.spinner.frames;
            this.setContent(`${adone.runtime.term.generateTags(this.options.style.spinner, frames[this._.frame++ % frames.length])} ${this._.message}`);
            this.screen.render();
        };

        this.show();
        renderContent();
        this.screen.lockKeys = true;
        this._.timer = setInterval(() => {
            renderContent();
        }, this._.spinner.interval);
    }

    stop() {
        if (is.null(this._.timer)) {
            return;
        }
        this.screen.lockKeys = false;
        this.hide();
        clearInterval(this._.timer);
        this._.timer = null;
        this.screen.render();
    }
}
Loading.prototype.type = "loading";
