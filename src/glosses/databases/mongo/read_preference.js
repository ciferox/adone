const { is } = adone;

export default class ReadPreference {
    constructor(mode, tags, options) {
        this._type = "ReadPreference";
        this.mode = mode;
        this.tags = tags;
        this.options = options;

        // If no tags were passed in
        if (tags && is.plainObject(tags)) {
            if (tags.maxStalenessSeconds) {
                this.options = tags;
                this.tags = null;
            }
        }

        // Add the maxStalenessSeconds value to the read Preference
        if (this.options && this.options.maxStalenessSeconds) {
            this.maxStalenessSeconds = this.options.maxStalenessSeconds;
        }
    }

    static isValid(_mode) {
        return _mode === ReadPreference.PRIMARY ||
            _mode === ReadPreference.PRIMARY_PREFERRED ||
            _mode === ReadPreference.SECONDARY ||
            _mode === ReadPreference.SECONDARY_PREFERRED ||
            _mode === ReadPreference.NEAREST ||
            _mode === true ||
            _mode === false ||
            is.nil(_mode);
    }

    isValid(mode) {
        const _mode = is.string(mode) ? mode : this.mode;
        return ReadPreference.isValid(_mode);
    }

    toObject() {
        const object = { mode: this.mode };

        if (!is.nil(this.tags)) {
            object.tags = this.tags;
        }

        if (this.maxStalenessSeconds) {
            object.maxStalenessSeconds = this.maxStalenessSeconds;
        }

        return object;
    }

    toJSON() {
        return this.toObject();
    }
}

ReadPreference.PRIMARY = "primary";
ReadPreference.PRIMARY_PREFERRED = "primaryPreferred";
ReadPreference.SECONDARY = "secondary";
ReadPreference.SECONDARY_PREFERRED = "secondaryPreferred";
ReadPreference.NEAREST = "nearest";
