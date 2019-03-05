const {
    p2p: { stream: { pull } }
} = adone;

const curry = function (fun) {
    return function () {
        const args = [].slice.call(arguments);
        return function (read) {
            return fun.apply(null, [read].concat(args));
        };
    };
};

const values = function (array) {
    let i = 0;
    return function (abort, cb) {
        if (abort) {
            i = array.length, cb(abort);
        } else if (i >= array.length) {
            cb(true);
        } else {
            cb(null, array[i++]);
        }
    };
};

const map = curry((read, mapper) => {
    return function (abort, cb) {
        read(abort, (end, data) => {
            if (end) {
                cb(end);
            } else {
                cb(null, mapper(data));
            }
        });
    };
});

const sum = curry((read, done) => {
    let total = 0;
    read(null, function next(end, data) {
        if (end) {
            return done(end === true ? null : end, total);
        }
        total += data;
        read(null, next);
    });
});

const log = curry((read) => {
    return function (abort, cb) {
        read(abort, (end, data) => {
            if (end) {
                return cb(end);
            }
            // console.error(data);
            cb(null, data);
        });
    };
});

it("wrap pull streams into stream", (done) => {

    pull(
        values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        map((e) => {
            return e * e;
        }),
        log(),
        sum((err, value) => {
            // console.log(value);
            assert.equal(value, 385);
            done();
        })
    );

});

it("turn pull(through,...) -> Through", (done) => {

    pull(
        values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        pull(
            map((e) => {
                return e * e;
            }),
            log()
        ),
        sum((err, value) => {
            // console.log(value);
            assert.equal(value, 385);
            done();
        })
    );

});

//  pull(
//    values ([1 2 3 4 5 6 7 8 9 10])
//    pull(
//      map({x y;: e*e })
//      log()
//    )
//    sum({
//      err value:
//        assert.equal(value 385)
//        done()
//      })
//  )
//

it("writable pull() should throw when called twice", (done) => {
    expect(2).checks(done);

    const stream = pull(
        map((e) => {
            return e * e;
        }),
        sum((err, value) => {
            // console.log(value);
            expect(value).to.equal(385).mark();
        })
    );

    stream(values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));


    expect(() => {
        stream(values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    }).to.throw(TypeError).mark();
});
