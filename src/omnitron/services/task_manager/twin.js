import adone from "adone";
const { Contextable, Private, Public, Description } = adone.netron.decorator;

@Private
@Contextable
class Job extends adone.AsyncEmitter {
    constructor(iTm, taskName, data, options) {
        super();
        this._iTm = iTm;
        this.taskName = taskName;
        this.data = data;
        this.options = options;
        this.id = null;
    }

    @Public
    @Description("Emits event to job")
    emit(event, data) {
        return super.emitParallel(event, data);
    }

    remove() {
        return this._iTm.removeJob(this.id);
    }
}

export default class extends adone.netron.Interface {
    async enqueueJob(taskName, data, options) {
        const job = new Job(this, taskName, data, options);
        job.id = await this.$twin.enqueueJob(taskName, data, options, job);
        return job;
    }
}
