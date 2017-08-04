const { vcs: { git: { Status } } } = adone;

const StatusFile = function (args) {
    let path = args.path;
    let status = args.status;
    const entry = args.entry;

    if (entry) {
        status = entry.status();
        if (entry.indexToWorkdir()) {
            path = entry.indexToWorkdir().newFile().path();
        } else {
            path = entry.headToIndex().newFile().path();
        }
    }

    const codes = Status.STATUS;

    const getStatus = function () {
        const fileStatuses = [];

        for (const key in Status.STATUS) {
            if (status & Status.STATUS[key]) {
                fileStatuses.push(key);
            }
        }

        return fileStatuses;
    };

    const data = {
        path,
        entry,
        statusBit: status,
        statuses: getStatus()
    };

    return {
        headToIndex() {
            if (data.entry) {
                return entry.headToIndex();
            }
            return undefined;

        },
        indexToWorkdir() {
            if (data.entry) {
                return entry.indexToWorkdir();
            }
            return undefined;

        },
        inIndex() {
            return status & codes.INDEX_NEW ||
                status & codes.INDEX_MODIFIED ||
                status & codes.INDEX_DELETED ||
                status & codes.INDEX_TYPECHANGE ||
                status & codes.INDEX_RENAMED;
        },
        inWorkingTree() {
            return status & codes.WT_NEW ||
                status & codes.WT_MODIFIED ||
                status & codes.WT_DELETED ||
                status & codes.WT_TYPECHANGE ||
                status & codes.WT_RENAMED;
        },
        isConflicted() {
            return status & codes.CONFLICTED;
        },
        isDeleted() {
            return status & codes.WT_DELETED ||
                status & codes.INDEX_DELETED;
        },
        isIgnored() {
            return status & codes.IGNORED;
        },
        isModified() {
            return status & codes.WT_MODIFIED ||
                status & codes.INDEX_MODIFIED;
        },
        isNew() {
            return status & codes.WT_NEW ||
                status & codes.INDEX_NEW;
        },
        isRenamed() {
            return status & codes.WT_RENAMED ||
                status & codes.INDEX_RENAMED;
        },
        isTypechange() {
            return status & codes.WT_TYPECHANGE ||
                status & codes.INDEX_TYPECHANGE;
        },
        path() {
            return data.path;
        },
        status() {
            return data.statuses;
        },
        statusBit() {
            return data.statusBit;
        }
    };
};

export default StatusFile;
