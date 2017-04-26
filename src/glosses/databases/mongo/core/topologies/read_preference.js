const { is } = adone;

const needSlaveOk = ["primaryPreferred", "secondary", "secondaryPreferred", "nearest"];

export default class ReadPreference {
    constructor(preference, tags, options) {
        this.preference = preference;
        this.tags = tags;
        this.options = options;

        // Add the maxStalenessSeconds value to the read Preference
        if (this.options && !is.nil(this.options.maxStalenessSeconds)) {
            this.options = options;
            this.maxStalenessSeconds = this.options.maxStalenessSeconds >= 0
                ? this.options.maxStalenessSeconds
                : null;
        } else if (tags && is.object(tags)) {
            this.options = tags;
            tags = null;
        }
    }

    slaveOk() {
        return needSlaveOk.includes(this.preference);
    }

    equals(readPreference) {
        return readPreference.preference === this.preference;
    }

    toJSON() {
        const readPreference = { mode: this.preference };
        if (is.array(this.tags)) {
            readPreference.tags = this.tags;
        }
        if (this.maxStalenessSeconds) {
            readPreference.maxStalenessSeconds = this.maxStalenessSeconds;
        }
        return readPreference;
    }
}

ReadPreference.primary = new ReadPreference("primary");
ReadPreference.primaryPreferred = new ReadPreference("primaryPreferred");
ReadPreference.secondary = new ReadPreference("secondary");
ReadPreference.secondaryPreferred = new ReadPreference("secondaryPreferred");
ReadPreference.nearest = new ReadPreference("nearest");
