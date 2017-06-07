const PouchDB = adone.database.pouch.coverage.DB;
var once = PouchDB.utils.once;
var toPromise = PouchDB.utils.toPromise;

describe('test.once.js', function () {

    it('Only call once ... once', function () {
        var myFun = once(function () { });
        myFun();
        assert.throws(myFun);
    });

    it('Once wrapped in a promise', function (done) {
        var callback = function () { };
        var myFun = toPromise(function (callback) {
            setTimeout(function () {
                callback();
                assert.throws(callback);
                done();
            });
        });
        myFun(callback);
    });
});
