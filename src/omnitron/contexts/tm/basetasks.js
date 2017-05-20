const { is } = adone;

export class Task {
    constructor() {
        this.manager = null;
        this.running = false;
        this.data = this._ = adone.o();
    }

    run() {
        throw new adone.x.NotImplemented("Method run() is not implemented");
    }
}

export class Worker extends Task {
    constructor() {
        super();
        this.paused = false;
    }

    pause(ms, callback) {
        this.paused = true;
        if (is.number(ms)) {
            setTimeout(() => {
                if (is.function(callback)) {
                    callback(); 
                }
                this.resume();
            }, ms);
        }
    }

    resume() {
        this.paused = false;
    }
}
