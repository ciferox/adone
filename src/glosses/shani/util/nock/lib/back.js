

const _ = require("lodash");
const nock = require("./scope");
const recorder = require("./recorder");

const format = require("util").format;
const path = require("path");
const debug = require("debug")("nock.back");

let _mode = null;

let fs;

try {
    fs = require("fs");
} catch (err) {
  // do nothing, probably in browser
}

let mkdirp;
try {
    mkdirp = require("mkdirp");
} catch (err) {
  // do nothing, probably in browser
}


/**
 * nock the current function with the fixture given
 *
 * @param {string}   fixtureName  - the name of the fixture, e.x. 'foo.json'
 * @param {object}   options      - [optional], extra options for nock with, e.x. { assert: true }
 * @param {function} nockedFn     - the callback function to be executed with the given fixture being loaded,
 *                                  the function will be called with { scopes: loaded_nocks || [] } set as this
 *
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
function Back(fixtureName, options, nockedFn) {
    if (!Back.fixtures) {
        throw new Error( "Back requires nock.back.fixtures to be set\n" +
                      "Ex:\n" +
                      "\trequire(nock).back.fixtures = '/path/to/fixures/'");
    }

    if ( arguments.length === 2 ) {
        nockedFn = options;
        options = {};
    }

    _mode.setup();

    let fixture = path.join(Back.fixtures, fixtureName),
        context = _mode.start(fixture, options);


    const nockDone = function () {
        _mode.finish(fixture, options, context);
    };

    debug("context:", context);

    nockedFn.call(context, nockDone);
}




/*******************************************************************************
*                                    Modes                                     *
*******************************************************************************/


const wild = {


    setup() {
        nock.cleanAll();
        recorder.restore();
        nock.activate();
        nock.enableNetConnect();
    },


    start() {
        return load(); //don't load anything but get correct context
    },


    finish() {
    //nothing to do
    }


};




const dryrun = {


    setup() {
        recorder.restore();
        nock.cleanAll();
        nock.activate();
    //  We have to explicitly enable net connectivity as by default it's off.
        nock.enableNetConnect();
    },


    start(fixture, options) {
        const contexts = load(fixture, options);

        nock.enableNetConnect();
        return contexts;
    },


    finish() {
    //nothing to do
    }


};




const record = {


    setup() {
        recorder.restore();
        recorder.clear();
        nock.cleanAll();
        nock.activate();
        nock.disableNetConnect();
    },


    start(fixture, options) {
        if (! fs) {
            throw new Error("no fs");
        }
        const context = load(fixture, options);

        if ( !context.isLoaded ) {
            recorder.record(_.assign({
                dont_print: true,
                output_objects: true
            }, options && options.recorder));

            context.isRecording = true;
        }

        return context;
    },


    finish(fixture, options, context) {
        if ( context.isRecording ) {
            let outputs = recorder.outputs();

            if ( typeof options.afterRecord === "function" ) {
                outputs = options.afterRecord(outputs);
            }

            outputs = JSON.stringify(outputs, null, 4);
            debug("recorder outputs:", outputs);

            mkdirp.sync(path.dirname(fixture));
            fs.writeFileSync(fixture, outputs);
        }
    }


};




const lockdown = {


    setup() {
        recorder.restore();
        recorder.clear();
        nock.cleanAll();
        nock.activate();
        nock.disableNetConnect();
    },


    start(fixture, options) {
        return load(fixture, options);
    },


    finish() {
    //nothing to do
    }


};




function load(fixture, options) {
    const context = {
        scopes: [],
        assertScopesFinished() {
            assertScopes(this.scopes, fixture);
        }
    };

    if ( fixture && fixtureExists(fixture) ) {
        let scopes = nock.loadDefs(fixture);
        applyHook(scopes, options.before);

        scopes = nock.define(scopes);
        applyHook(scopes, options.after);

        context.scopes = scopes;
        context.isLoaded = true;
    }


    return context;
}




function applyHook(scopes, fn) {
    if ( !fn ) {
        return;
    }

    if ( typeof fn !== "function" ) {
        throw new Error("processing hooks must be a function");
    }

    scopes.forEach(fn);
}




function fixtureExists(fixture) {
    if (! fs) {
        throw new Error("no fs");
    }

    return fs.existsSync(fixture);
}




function assertScopes(scopes, fixture) {
    scopes.forEach((scope) => {
        expect( scope.isDone() )
    .to.be.equal(
      true,
      format("%j was not used, consider removing %s to rerecord fixture", scope.pendingMocks(), fixture)
    );
    });
}




const Modes = {

    wild, //all requests go out to the internet, dont replay anything, doesnt record anything

    dryrun, //use recorded nocks, allow http calls, doesnt record anything, useful for writing new tests (default)

    record, //use recorded nocks, record new nocks

    lockdown //use recorded nocks, disables all http calls even when not nocked, doesnt record

};





Back.setMode = function (mode) {
    if ( !Modes.hasOwnProperty(mode) ) {
        throw new Error("some usage error");
    }

    Back.currentMode = mode;
    debug("New nock back mode:", Back.currentMode);

    _mode = Modes[mode];
    _mode.setup();
};




Back.fixtures = null;
Back.currentMode = null;
Back.setMode(process.env.NOCK_BACK_MODE || "dryrun");

module.exports = exports = Back;
