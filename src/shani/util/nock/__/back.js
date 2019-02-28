const {
    is,
    fs,
    std: { path },
    shani: {
        util: { nock }
    },
    std: {
        util: { format }
    }
} = adone;

let _mode = null;

/**
 * nock the current function with the fixture given
 *
 * @param {string}   fixtureName  - the name of the fixture, e.x. 'foo.json'
 * @param {object}   options      - [optional] extra options for nock with, e.x. `{ assert: true }`
 * @param {function} nockedFn     - [optional] callback function to be executed with the given fixture being loaded;
 *                                  if defined the function will be called with context `{ scopes: loaded_nocks || [] }`
 *                                  set as `this` and `nockDone` callback function as first and only parameter;
 *                                  if not defined a promise resolving to `{nockDone, context}` where `context` is
 *                                  aforementioned `{ scopes: loaded_nocks || [] }`
 *
 * List of options:
 *
 * @param {function} before       - a preprocessing function, gets called before nock.define
 * @param {function} after        - a postprocessing function, gets called after nock.define
 * @param {function} afterRecord  - a postprocessing function, gets called after recording. Is passed the array
 *                                  of scopes recorded and should return the array scopes to save to the fixture
 * @param {function} recorder     - custom options to pass to the recorder
 *
 */

export default function back(fixtureName, options = {}, nockedFn) {
    if (!back.fixtures) {
        throw new Error("Back requires nock.back.fixtures to be set");
    }

    if (!is.string(fixtureName)) {
        throw new Error("Parameter fixtureName must be a string");
    }

    if (is.function(options)) {
        [options, nockedFn] = [{}, options];
    }

    _mode.setup();

    const fixture = path.join(back.fixtures, fixtureName);
    const context = _mode.start(fixture, options);


    const nockDone = function () {
        _mode.finish(fixture, options, context);
    };

    // If nockedFn is a function then invoke it, otherwise return a promise resolving to nockDone.
    if (is.function(nockedFn)) {
        nockedFn.call(context, nockDone);
    } else {
        return Promise.resolve({ nockDone, context });
    }
}

const applyHook = (scopes, fn) => {
    if (!fn) {
        return;
    }

    if (!is.function(fn)) {
        throw new Error("processing hooks must be a function");
    }

    scopes.forEach(fn);
};

const fixtureExists = (fixture) => {
    return fs.existsSync(fixture);
};


const assertScopes = (scopes, fixture) => {
    scopes.forEach((scope) => {
        adone.assertion.expect(scope.isDone()).to.be.equal(
            true,
            format("%j was not used, consider removing %s to rerecord fixture", scope.pendingMocks(), fixture)
        );
    });
};

const load = (fixture, options) => {
    const context = {
        scopes: [],
        assertScopesFinished() {
            assertScopes(this.scopes, fixture);
        }
    };

    if (fixture && fixtureExists(fixture)) {
        let scopes = nock.loadDefs(fixture);
        applyHook(scopes, options.before);

        scopes = nock.define(scopes);
        applyHook(scopes, options.after);

        context.scopes = scopes;
        context.isLoaded = true;
    }


    return context;
};

class Mode {
    setup() {}

    start() {}

    finish() {}
}

class Wild extends Mode {
    setup() {
        nock.cleanAll();
        nock.restore();
        nock.activate();
        nock.enableNetConnect();
    }

    start() {
        return load(); //don't load anything but get correct context
    }
}

class DryRun extends Mode {
    setup() {
        nock.restore();
        nock.cleanAll();
        nock.activate();
        //  We have to explicitly enable net connectivity as by default it's off.
        nock.enableNetConnect();
    }


    start(fixture, options) {
        const contexts = load(fixture, options);

        nock.enableNetConnect();
        return contexts;
    }
}

class Record extends Mode {
    setup() {
        nock.restore();
        nock.recorder.clear();
        nock.cleanAll();
        nock.activate();
        nock.disableNetConnect();
    }

    start(fixture, options) {
        const context = load(fixture, options);

        if (!context.isLoaded) {
            nock.recorder.rec(Object.assign({
                dontPrint: true,
                outputObjects: true
            }, options && options.recorder));

            context.isRecording = true;
        }

        return context;
    }

    finish(fixture, options, context) {
        if (context.isRecording) {
            let outputs = nock.recorder.play();

            if (is.function(options.afterRecord)) {
                outputs = options.afterRecord(outputs);
            }

            outputs = JSON.stringify(outputs, null, 4);

            fs.mkdirpSync(path.dirname(fixture));
            fs.writeFileSync(fixture, outputs);
        }
    }
}

class Lockdown extends Mode {
    setup() {
        nock.restore();
        nock.recorder.clear();
        nock.cleanAll();
        nock.activate();
        nock.disableNetConnect();
    }

    start(fixture, options) {
        return load(fixture, options);
    }
}

const modes = adone.lazify({
    // all requests go out to the internet, dont replay anything, doesnt record anything
    wild: () => new Wild(),

    // use recorded nocks, allow http calls, doesnt record anything, useful for writing new tests (default)
    dryrun: () => new DryRun(),

    // use recorded nocks, record new nocks
    record: () => new Record(),

    // use recorded nocks, disables all http calls even when not nocked, doesnt record
    lockdown: () => new Lockdown()
});

back.setMode = (mode) => {
    if (!is.propertyDefined(modes, mode)) {
        throw new Error(`Unknown mode: ${mode}`);
    }

    back.currentMode = mode;

    _mode = modes[mode];
    _mode.setup();
};




back.fixtures = null;
back.currentMode = null;
back.setMode("dryrun");
