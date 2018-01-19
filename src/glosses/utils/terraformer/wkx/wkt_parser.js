const {
    util: {
        terraformer: {
            WKX
        }
    }
} = adone;

export default class WktParser {
    constructor(value) {
        this.value = value;
        this.position = 0;
    }

    match(tokens) {
        this.skipWhitespaces();

        for (let i = 0; i < tokens.length; i++) {
            if (this.value.substring(this.position).indexOf(tokens[i]) === 0) {
                this.position += tokens[i].length;
                return tokens[i];
            }
        }

        return null;
    }

    matchRegex(tokens) {
        this.skipWhitespaces();

        for (let i = 0; i < tokens.length; i++) {
            const match = this.value.substring(this.position).match(tokens[i]);

            if (match) {
                this.position += match[0].length;
                return match;
            }
        }

        return null;
    }

    isMatch(tokens) {
        this.skipWhitespaces();

        for (let i = 0; i < tokens.length; i++) {
            if (this.value.substring(this.position).indexOf(tokens[i]) === 0) {
                this.position += tokens[i].length;
                return true;
            }
        }

        return false;
    }

    matchType() {
        const geometryType = this.match([WKX.Types.wkt.Point, WKX.Types.wkt.LineString, WKX.Types.wkt.Polygon, WKX.Types.wkt.MultiPoint,
            WKX.Types.wkt.MultiLineString, WKX.Types.wkt.MultiPolygon, WKX.Types.wkt.GeometryCollection]);

        if (!geometryType) {
            throw new Error("Expected geometry type");
        }

        return geometryType;
    }

    matchDimension() {
        const dimension = this.match(["ZM", "Z", "M"]);

        switch (dimension) {
            case "ZM": return { hasZ: true, hasM: true };
            case "Z": return { hasZ: true, hasM: false };
            case "M": return { hasZ: false, hasM: true };
            default: return { hasZ: false, hasM: false };
        }
    }

    expectGroupStart() {
        if (!this.isMatch(["("])) {
            throw new Error("Expected group start");
        }
    }

    expectGroupEnd() {
        if (!this.isMatch([")"])) {
            throw new Error("Expected group end");
        }
    }

    matchCoordinate(options) {
        let match;

        if (options.hasZ && options.hasM) {
            match = this.matchRegex([/^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/]);
        } else if (options.hasZ || options.hasM) {
            match = this.matchRegex([/^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/]);
        } else {
            match = this.matchRegex([/^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/]);
        }

        if (!match) {
            throw new Error("Expected coordinates");
        }

        if (options.hasZ && options.hasM) {
            return new WKX.Point(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]), parseFloat(match[4]));
        } else if (options.hasZ) {
            return new WKX.Point(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
        } else if (options.hasM) {
            return new WKX.Point(parseFloat(match[1]), parseFloat(match[2]), undefined, parseFloat(match[3]));
        }
        return new WKX.Point(parseFloat(match[1]), parseFloat(match[2]));
    }

    matchCoordinates(options) {
        const coordinates = [];

        do {
            const startsWithBracket = this.isMatch(["("]);

            coordinates.push(this.matchCoordinate(options));

            if (startsWithBracket) {
                this.expectGroupEnd();
            }
        } while (this.isMatch([","]));

        return coordinates;
    }

    skipWhitespaces() {
        while (this.position < this.value.length && this.value[this.position] === " ") {
            this.position++;
        }
    }
}
