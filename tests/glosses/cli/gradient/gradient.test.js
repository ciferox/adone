const {
    cli: { gradient: { Gradient } }
} = adone;

describe("terminal", "gradient", "Gradient", () => {
    it("should throw an error on invalid steps/colors number", () => {
        assert.throws(() => {
            new Gradient("red");
        });
        assert.throws(() => {
            new Gradient(["red"]);
        });
        assert.throws(() => {
            const grad = new Gradient("red", "blue");
            grad.rgb(1);
        });
        assert.throws(() => {
            const grad = new Gradient("red", "blue", "green");
            grad.rgb(2);
        });
    });

    it("should accept varargs and array", () => {
        const grad1 = new Gradient("red", "green", "blue", "yellow", "black");
        const grad2 = new Gradient(["red", "green", "blue", "yellow", "black"]);

        assert.deepEqual(
            grad1.stops.map((c) => {
                return c.color.toRgb();
            }),
            grad2.stops.map((c) => {
                return c.color.toRgb();
            })
        );
    });

    it("should reverse gradient", () => {
        const grad1 = new Gradient("red", "green", "blue", "yellow", "black");
        const grad2 = grad1.reverse();

        assert.deepEqual(
            grad1.stops.map((c) => c.color.toRgb()),
            grad2.stops.reverse().map((c) => c.color.toRgb())
        );
    });

    it("should generate 11 steps gradient from black to grey in RGB", () => {
        const grad = new Gradient({ r: 0, g: 0, b: 0 }, { r: 100, g: 100, b: 100 });
        const res = grad.rgb(11);

        assert.equal(11, res.length);
        assert.deepEqual({ r: 0, g: 0, b: 0, a: 1 }, res[0].toRgb(), "black");
        assert.deepEqual({ r: 50, g: 50, b: 50, a: 1 }, res[5].toRgb(), "dark gray");
        assert.deepEqual({ r: 100, g: 100, b: 100, a: 1 }, res[10].toRgb(), "gray");
    });

    it("should generate 13 steps gradient from red to red in HSV", () => {
        const grad = new Gradient([
            { h: 0, s: 1, v: 1 },
            { h: 120, s: 1, v: 1 },
            { h: 240, s: 1, v: 1 },
            { h: 0, s: 1, v: 1 }
        ]);
        const res = grad.hsv(13);

        assert.equal(13, res.length);
        assert.deepEqual({ h: 60, s: 1, v: 1, a: 1 }, res[2].toHsv(), "yellow");
        assert.deepEqual({ h: 180, s: 1, v: 1, a: 1 }, res[6].toHsv(), "cyan");
        assert.deepEqual({ h: 300, s: 1, v: 1, a: 1 }, res[10].toHsv(), "magenta");
    });

    it("should generate CSS gradient command for 3 colors", () => {
        let grad = new Gradient("#f00", "#0f0", "#00f");
        let res = grad.css();
        assert.equal("linear-gradient(to right, rgb(255, 0, 0) 0%, rgb(0, 255, 0) 50%, rgb(0, 0, 255) 100%)", res, "default");

        grad = new Gradient("rgba(255,0,0,0.5)", "rgba(0,255,0,0.5)", "rgba(0,0,255,0.5)");
        res = grad.css("radial", "ellipse farthest-corner");
        assert.equal("radial-gradient(ellipse farthest-corner, rgba(255, 0, 0, 0.5) 0%, rgba(0, 255, 0, 0.5) 50%, rgba(0, 0, 255, 0.5) 100%)", res, "radial with alpha");
    });

    it("should returns a single color at specific position", () => {
        let grad = new Gradient("white", "black");
        let res = grad.rgbAt(0.5);
        assert.deepEqual({ r: 128, g: 128, b: 128, a: 1 }, res.toRgb(), "rgb");

        grad = new Gradient("red", "blue");
        res = grad.hsvAt(0.5);
        assert.deepEqual({ h: 120, s: 1, v: 1, a: 1 }, res.toHsv(), "hsv");
    });

    it("should provide static methods", () => {
        let res1 = new Gradient("white", "blue").rgb(5);
        let res2 = Gradient.rgb("white", "blue", 5);

        assert.deepEqual(
            res1.map((c) => {
                return c.toRgb();
            }),
            res2.map((c) => {
                return c.toRgb();
            }),
            "rgb"
        );

        res1 = new Gradient("green", "blue").hsv(5, true);
        res2 = Gradient.hsv("green", "blue", 5, true);

        assert.deepEqual(
            res1.map((c) => {
                return c.toRgb();
            }),
            res2.map((c) => {
                return c.toRgb();
            }),
            "hsv"
        );

        res1 = new Gradient("green", "blue").css("linear", "to left");
        res2 = Gradient.css("green", "blue", "linear", "to left");

        assert.equal(res1, res2, "css");

        res1 = new Gradient("green", "blue").rgbAt(0.33);
        res2 = Gradient.rgbAt("green", "blue", 0.33);

        assert.deepEqual(res1.toRgb(), res2.toRgb(), "rgbAt");

        res1 = new Gradient("green", "blue").hsvAt(0.33);
        res2 = Gradient.hsvAt("green", "blue", 0.33);

        assert.deepEqual(res1.toRgb(), res2.toRgb(), "hsvAt");
    });
});
