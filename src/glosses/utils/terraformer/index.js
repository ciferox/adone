const {
    is,
    error
} = adone;

const EarthRadius = 6378137;
const DegreesPerRadian = 57.295779513082320;
const RadiansPerDegree = 0.017453292519943;
export const MercatorCRS = {
    type: "link",
    properties: {
        href: "http://spatialreference.org/ref/sr-org/6928/ogcwkt/",
        type: "ogcwkt"
    }
};
export const GeographicCRS = {
    type: "link",
    properties: {
        href: "http://spatialreference.org/ref/epsg/4326/ogcwkt/",
        type: "ogcwkt"
    }
};

/**
 * Internal: safe warning
 */
const warn = () => {
    const args = Array.prototype.slice.apply(arguments);

    if (!is.undefined(typeof console) && console.warn) {
        console.warn.apply(console, args);
    }
};

/**
 * Internal: Extend one object with another.
 */
const extend = (destination, source) => {
    for (const k in source) {
        if (source.hasOwnProperty(k)) {
            destination[k] = source[k];
        }
    }
    return destination;
};

/**
 * Public: Calculate an bounding box for a geojson object
 */
const calculateBounds = (geojson) => {
    if (geojson.type) {
        switch (geojson.type) {
            case "Point":
                return [geojson.coordinates[0], geojson.coordinates[1], geojson.coordinates[0], geojson.coordinates[1]];

            case "MultiPoint":
                return calculateBoundsFromArray(geojson.coordinates);

            case "LineString":
                return calculateBoundsFromArray(geojson.coordinates);

            case "MultiLineString":
                return calculateBoundsFromNestedArrays(geojson.coordinates);

            case "Polygon":
                return calculateBoundsFromNestedArrays(geojson.coordinates);

            case "MultiPolygon":
                return calculateBoundsFromNestedArrayOfArrays(geojson.coordinates);

            case "Feature":
                return geojson.geometry ? calculateBounds(geojson.geometry) : null;

            case "FeatureCollection":
                return calculateBoundsForFeatureCollection(geojson);

            case "GeometryCollection":
                return calculateBoundsForGeometryCollection(geojson);

            default:
                throw new Error(`Unknown type: ${geojson.type}`);
        }
    }
    return null;
};

/**
 * Internal: Calculate an bounding box from an nested array of positions
 * [
 * [
 * [ [lng, lat],[lng, lat],[lng, lat] ]
 * ]
 * [
 * [lng, lat],[lng, lat],[lng, lat]
 * ]
 * [
 * [lng, lat],[lng, lat],[lng, lat]
 * ]
 * ]
 */
const calculateBoundsFromNestedArrays = (array) => {
    let x1 = null;
    let x2 = null;
    let y1 = null;
    let y2 = null;

    for (let i = 0; i < array.length; i++) {
        const inner = array[i];

        for (let j = 0; j < inner.length; j++) {
            const lonlat = inner[j];

            const lon = lonlat[0];
            const lat = lonlat[1];

            if (is.null(x1)) {
                x1 = lon;
            } else if (lon < x1) {
                x1 = lon;
            }

            if (is.null(x2)) {
                x2 = lon;
            } else if (lon > x2) {
                x2 = lon;
            }

            if (is.null(y1)) {
                y1 = lat;
            } else if (lat < y1) {
                y1 = lat;
            }

            if (is.null(y2)) {
                y2 = lat;
            } else if (lat > y2) {
                y2 = lat;
            }
        }
    }

    return [x1, y1, x2, y2];
};

/**
 * Internal: Calculate a bounding box from an array of arrays of arrays
 * [
 * [ [lng, lat],[lng, lat],[lng, lat] ]
 * [ [lng, lat],[lng, lat],[lng, lat] ]
 * [ [lng, lat],[lng, lat],[lng, lat] ]
 * ]
 */
const calculateBoundsFromNestedArrayOfArrays = (array) => {
    let x1 = null;
    let x2 = null;
    let y1 = null;
    let y2 = null;

    for (let i = 0; i < array.length; i++) {
        const inner = array[i];

        for (let j = 0; j < inner.length; j++) {
            const innerinner = inner[j];
            for (let k = 0; k < innerinner.length; k++) {
                const lonlat = innerinner[k];

                const lon = lonlat[0];
                const lat = lonlat[1];

                if (is.null(x1)) {
                    x1 = lon;
                } else if (lon < x1) {
                    x1 = lon;
                }

                if (is.null(x2)) {
                    x2 = lon;
                } else if (lon > x2) {
                    x2 = lon;
                }

                if (is.null(y1)) {
                    y1 = lat;
                } else if (lat < y1) {
                    y1 = lat;
                }

                if (is.null(y2)) {
                    y2 = lat;
                } else if (lat > y2) {
                    y2 = lat;
                }
            }
        }
    }

    return [x1, y1, x2, y2];
};

/**
 * Internal: Calculate a bounding box from an array of positions
 * [
 * [lng, lat],[lng, lat],[lng, lat]
 * ]
 */
const calculateBoundsFromArray = (array) => {
    let x1 = null;
    let x2 = null;
    let y1 = null;
    let y2 = null;

    for (let i = 0; i < array.length; i++) {
        const lonlat = array[i];
        const lon = lonlat[0];
        const lat = lonlat[1];

        if (is.null(x1)) {
            x1 = lon;
        } else if (lon < x1) {
            x1 = lon;
        }

        if (is.null(x2)) {
            x2 = lon;
        } else if (lon > x2) {
            x2 = lon;
        }

        if (is.null(y1)) {
            y1 = lat;
        } else if (lat < y1) {
            y1 = lat;
        }

        if (is.null(y2)) {
            y2 = lat;
        } else if (lat > y2) {
            y2 = lat;
        }
    }

    return [x1, y1, x2, y2];
};

/**
 * Internal: Calculate an bounding box for a feature collection
 */
const calculateBoundsForFeatureCollection = (featureCollection) => {
    const extents = [];
    let extent;
    for (let i = featureCollection.features.length - 1; i >= 0; i--) {
        extent = calculateBounds(featureCollection.features[i].geometry);
        extents.push([extent[0], extent[1]]);
        extents.push([extent[2], extent[3]]);
    }

    return calculateBoundsFromArray(extents);
};

/**
 * Internal: Calculate an bounding box for a geometry collection
 */
const calculateBoundsForGeometryCollection = (geometryCollection) => {
    const extents = [];
    let extent;

    for (let i = geometryCollection.geometries.length - 1; i >= 0; i--) {
        extent = calculateBounds(geometryCollection.geometries[i]);
        extents.push([extent[0], extent[1]]);
        extents.push([extent[2], extent[3]]);
    }

    return calculateBoundsFromArray(extents);
};

const calculateEnvelope = (geojson) => {
    const bounds = calculateBounds(geojson);
    return {
        x: bounds[0],
        y: bounds[1],
        w: Math.abs(bounds[0] - bounds[2]),
        h: Math.abs(bounds[1] - bounds[3])
    };
};

/**
 * Internal: Convert radians to degrees. Used by spatial reference converters.
 */
const radToDeg = (rad) => {
    return rad * DegreesPerRadian;
};

/**
 * Internal: Convert degrees to radians. Used by spatial reference converters.
 */
const degToRad = (deg) => {
    return deg * RadiansPerDegree;
};

/**
 * Internal: Loop over each array in a geojson object and apply a function to it. Used by spatial reference converters.
 */
const eachPosition = (coordinates, func) => {
    for (let i = 0; i < coordinates.length; i++) {
        // we found a number so lets convert this pair
        if (is.number(coordinates[i][0])) {
            coordinates[i] = func(coordinates[i]);
        }
        // we found an coordinates array it again and run THIS function against it
        if (is.array(coordinates[i])) {
            coordinates[i] = eachPosition(coordinates[i], func);
        }
    }
    return coordinates;
};

/**
 * Public: Convert a GeoJSON Position object to Geographic (4326)
 */
const positionToGeographic = (position) => {
    const x = position[0];
    const y = position[1];
    return [radToDeg(x / EarthRadius) - (Math.floor((radToDeg(x / EarthRadius) + 180) / 360) * 360), radToDeg((Math.PI / 2) - (2 * Math.atan(Math.exp(-1.0 * y / EarthRadius))))];
};

/**
 * Public: Convert a GeoJSON Position object to Web Mercator (102100)
 */
const positionToMercator = (position) => {
    const lng = position[0];
    const lat = Math.max(Math.min(position[1], 89.99999), -89.99999);
    return [degToRad(lng) * EarthRadius, EarthRadius / 2.0 * Math.log((1.0 + Math.sin(degToRad(lat))) / (1.0 - Math.sin(degToRad(lat))))];
};

/**
 * Public: Apply a function agaist all positions in a geojson object. Used by spatial reference converters.
 */
const applyConverter = (geojson, converter, noCrs) => {
    if (geojson.type === "Point") {
        geojson.coordinates = converter(geojson.coordinates);
    } else if (geojson.type === "Feature") {
        geojson.geometry = applyConverter(geojson.geometry, converter, true);
    } else if (geojson.type === "FeatureCollection") {
        for (let f = 0; f < geojson.features.length; f++) {
            geojson.features[f] = applyConverter(geojson.features[f], converter, true);
        }
    } else if (geojson.type === "GeometryCollection") {
        for (let g = 0; g < geojson.geometries.length; g++) {
            geojson.geometries[g] = applyConverter(geojson.geometries[g], converter, true);
        }
    } else {
        geojson.coordinates = eachPosition(geojson.coordinates, converter);
    }

    if (!noCrs) {
        if (converter === positionToMercator) {
            geojson.crs = MercatorCRS;
        }
    }

    if (converter === positionToGeographic) {
        delete geojson.crs;
    }

    return geojson;
};

/**
 * Public: Convert a GeoJSON object to ESRI Web Mercator (102100)
 */
export const toMercator = (geojson) => {
    return applyConverter(geojson, positionToMercator);
};

/**
 * Convert a GeoJSON object to Geographic coordinates (WSG84, 4326)
 */
export const toGeographic = (geojson) => {
    return applyConverter(geojson, positionToGeographic);
};


/**
 * Internal: -1,0,1 comparison function
 */
const cmp = (a, b) => {
    if (a < b) {
        return -1;
    } else if (a > b) {
        return 1;
    }
    return 0;

};

/**
 * Internal: used for sorting
 */
const compSort = (p1, p2) => {
    if (p1[0] > p2[0]) {
        return -1;
    } else if (p1[0] < p2[0]) {
        return 1;
    } else if (p1[1] > p2[1]) {
        return -1;
    } else if (p1[1] < p2[1]) {
        return 1;
    }
    return 0;

};


/**
 * Internal: used to determine turn
 */
const turn = (p, q, r) => {
    // Returns -1, 0, 1 if p,q,r forms a right, straight, or left turn.
    return cmp((q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1]), 0);
};

/**
 * Internal: used to determine euclidean distance between two points
 */
const euclideanDistance = (p, q) => {
    // Returns the squared Euclidean distance between p and q.
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];

    return dx * dx + dy * dy;
};

const nextHullPoint = (points, p) => {
    // Returns the next point on the convex hull in CCW from p.
    let q = p;
    for (const r in points) {
        const t = turn(p, q, points[r]);
        if (t === -1 || t === 0 && euclideanDistance(p, points[r]) > euclideanDistance(p, q)) {
            q = points[r];
        }
    }
    return q;
};

const convexHull = (points) => {
    // implementation of the Jarvis March algorithm
    // adapted from http://tixxit.wordpress.com/2009/12/09/jarvis-march/

    if (points.length === 0) {
        return [];
    } else if (points.length === 1) {
        return points;
    }

    // Returns the points on the convex hull of points in CCW order.
    const hull = [points.sort(compSort)[0]];

    for (let p = 0; p < hull.length; p++) {
        const q = nextHullPoint(points, hull[p]);

        if (q !== hull[0]) {
            hull.push(q);
        }
    }

    return hull;
};

const isConvex = (points) => {
    let ltz;

    for (let i = 0; i < points.length - 3; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2];
        const v = [p2[0] - p1[0], p2[1] - p1[1]];

        // p3.x * v.y - p3.y * v.x + v.x * p1.y - v.y * p1.x
        const res = p3[0] * v[1] - p3[1] * v[0] + v[0] * p1[1] - v[1] * p1[0];

        if (i === 0) {
            if (res < 0) {
                ltz = true;
            } else {
                ltz = false;
            }
        } else {
            if (ltz && (res > 0) || !ltz && (res < 0)) {
                return false;
            }
        }
    }

    return true;
};

const coordinatesContainPoint = (coordinates, point) => {
    let contains = false;
    for (let i = -1, l = coordinates.length, j = l - 1; ++i < l; j = i) {
        if (((coordinates[i][1] <= point[1] && point[1] < coordinates[j][1]) ||
                (coordinates[j][1] <= point[1] && point[1] < coordinates[i][1])) &&
                (point[0] < (coordinates[j][0] - coordinates[i][0]) * (point[1] - coordinates[i][1]) / (coordinates[j][1] - coordinates[i][1]) + coordinates[i][0])) {
            contains = !contains;
        }
    }
    return contains;
};

const polygonContainsPoint = (polygon, point) => {
    if (polygon && polygon.length) {
        if (polygon.length === 1) { // polygon with no holes
            return coordinatesContainPoint(polygon[0], point);
        } // polygon with holes
        if (coordinatesContainPoint(polygon[0], point)) {
            for (let i = 1; i < polygon.length; i++) {
                if (coordinatesContainPoint(polygon[i], point)) {
                    return false; // found in hole
                }
            }

            return true;
        }
        return false;


    }
    return false;

};

const edgeIntersectsEdge = (a1, a2, b1, b2) => {
    const uaT = (b2[0] - b1[0]) * (a1[1] - b1[1]) - (b2[1] - b1[1]) * (a1[0] - b1[0]);
    const ubT = (a2[0] - a1[0]) * (a1[1] - b1[1]) - (a2[1] - a1[1]) * (a1[0] - b1[0]);
    const uB = (b2[1] - b1[1]) * (a2[0] - a1[0]) - (b2[0] - b1[0]) * (a2[1] - a1[1]);

    if (uB !== 0) {
        const ua = uaT / uB;
        const ub = ubT / uB;

        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            return true;
        }
    }

    return false;
};

const isNumber = (n) => is.number(n) && is.finite(n);

const arraysIntersectArrays = (a, b) => {
    if (isNumber(a[0][0])) {
        if (isNumber(b[0][0])) {
            for (let i = 0; i < a.length - 1; i++) {
                for (let j = 0; j < b.length - 1; j++) {
                    if (edgeIntersectsEdge(a[i], a[i + 1], b[j], b[j + 1])) {
                        return true;
                    }
                }
            }
        } else {
            for (let k = 0; k < b.length; k++) {
                if (arraysIntersectArrays(a, b[k])) {
                    return true;
                }
            }
        }
    } else {
        for (let l = 0; l < a.length; l++) {
            if (arraysIntersectArrays(a[l], b)) {
                return true;
            }
        }
    }
    return false;
};

const pointsEqual = (a, b) => {
    for (let i = 0; i < a.length; i++) {

        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};

/**
 * Internal: Returns a copy of coordinates for s closed polygon
 */
const closedPolygon = (coordinates) => {
    const outer = [];

    for (let i = 0; i < coordinates.length; i++) {
        const inner = coordinates[i].slice();
        if (pointsEqual(inner[0], inner[inner.length - 1]) === false) {
            inner.push(inner[0]);
        }

        outer.push(inner);
    }

    return outer;
};

const coordinatesEqual = (a, b) => {
    if (a.length !== b.length) {
        return false;
    }

    const na = a.slice().sort(compSort);
    const nb = b.slice().sort(compSort);

    for (let i = 0; i < na.length; i++) {
        if (na[i].length !== nb[i].length) {
            return false;
        }
        for (let j = 0; j < na.length; j++) {
            if (na[i][j] !== nb[i][j]) {
                return false;
            }
        }
    }

    return true;
};

/**
 * Internal: An array of variables that will be excluded form JSON objects.
 */
const excludeFromJSON = ["length"];

/**
 * Internal: Base GeoJSON Primitive
 */
export class Primitive {
    toMercator() {
        return toMercator(this);
    }


    toGeographic() {
        return toGeographic(this);
    }

    envelope() {
        return calculateEnvelope(this);
    }

    bbox() {
        return calculateBounds(this);
    }

    convexHull() {
        let coordinates = [];
        let i;
        let j;
        if (this.type === "Point") {
            return null;
        } else if (this.type === "LineString" || this.type === "MultiPoint") {
            if (this.coordinates && this.coordinates.length >= 3) {
                coordinates = this.coordinates;
            } else {
                return null;
            }
        } else if (this.type === "Polygon" || this.type === "MultiLineString") {
            if (this.coordinates && this.coordinates.length > 0) {
                for (i = 0; i < this.coordinates.length; i++) {
                    coordinates = coordinates.concat(this.coordinates[i]);
                }
                if (coordinates.length < 3) {
                    return null;
                }
            } else {
                return null;
            }
        } else if (this.type === "MultiPolygon") {
            if (this.coordinates && this.coordinates.length > 0) {
                for (i = 0; i < this.coordinates.length; i++) {
                    for (j = 0; j < this.coordinates[i].length; j++) {
                        coordinates = coordinates.concat(this.coordinates[i][j]);
                    }
                }
                if (coordinates.length < 3) {
                    return null;
                }
            } else {
                return null;
            }
        } else if (this.type === "Feature") {
            const primitive = fromGeoJSON(this.geometry);
            return primitive.convexHull();
        }

        return new Polygon({
            type: "Polygon",
            coordinates: closedPolygon([convexHull(coordinates)])
        });
    }

    toJSON() {
        const obj = {};
        for (const key in this) {
            if (this.hasOwnProperty(key) && !excludeFromJSON.includes(key)) {
                obj[key] = this[key];
            }
        }
        obj.bbox = calculateBounds(this);
        return obj;
    }

    contains(primitive) {
        return fromGeoJSON(primitive).within(this);
    }

    within(primitive) {
        let coordinates;
        let i;
        let contains;

        // if we are passed a feature, use the polygon inside instead
        if (primitive.type === "Feature") {
            primitive = primitive.geometry;
        }

        // point.within(point) :: equality
        if (primitive.type === "Point") {
            if (this.type === "Point") {
                return pointsEqual(this.coordinates, primitive.coordinates);

            }
        }

        // point.within(multilinestring)
        if (primitive.type === "MultiLineString") {
            if (this.type === "Point") {
                for (i = 0; i < primitive.coordinates.length; i++) {
                    const linestring = { type: "LineString", coordinates: primitive.coordinates[i] };

                    if (this.within(linestring)) {
                        return true;
                    }
                }
            }
        }

        // point.within(linestring), point.within(multipoint)
        if (primitive.type === "LineString" || primitive.type === "MultiPoint") {
            if (this.type === "Point") {
                for (i = 0; i < primitive.coordinates.length; i++) {
                    if (this.coordinates.length !== primitive.coordinates[i].length) {
                        return false;
                    }

                    if (pointsEqual(this.coordinates, primitive.coordinates[i])) {
                        return true;
                    }
                }
            }
        }

        if (primitive.type === "Polygon") {
        // polygon.within(polygon)
            if (this.type === "Polygon") {
            // check for equal polygons
                if (primitive.coordinates.length === this.coordinates.length) {
                    for (i = 0; i < this.coordinates.length; i++) {
                        if (coordinatesEqual(this.coordinates[i], primitive.coordinates[i])) {
                            return true;
                        }
                    }
                }

                if (this.coordinates.length && polygonContainsPoint(primitive.coordinates, this.coordinates[0][0])) {
                    return !arraysIntersectArrays(closedPolygon(this.coordinates), closedPolygon(primitive.coordinates));
                }
                return false;


            // point.within(polygon)
            } else if (this.type === "Point") {
                return polygonContainsPoint(primitive.coordinates, this.coordinates);

            // linestring/multipoint withing polygon
            } else if (this.type === "LineString" || this.type === "MultiPoint") {
                if (!this.coordinates || this.coordinates.length === 0) {
                    return false;
                }

                for (i = 0; i < this.coordinates.length; i++) {
                    if (polygonContainsPoint(primitive.coordinates, this.coordinates[i]) === false) {
                        return false;
                    }
                }

                return true;

            // multilinestring.within(polygon)
            } else if (this.type === "MultiLineString") {
                for (i = 0; i < this.coordinates.length; i++) {
                    const ls = new LineString(this.coordinates[i]);

                    if (ls.within(primitive) === false) {
                        contains++;
                        return false;
                    }
                }

                return true;

            // multipolygon.within(polygon)
            } else if (this.type === "MultiPolygon") {
                for (i = 0; i < this.coordinates.length; i++) {
                    const p1 = fromGeoJSON({ type: "Polygon", coordinates: this.coordinates[i] });

                    if (p1.within(primitive) === false) {
                        return false;
                    }
                }

                return true;
            }

        }

        if (primitive.type === "MultiPolygon") {
            // point.within(multipolygon)
            if (this.type === "Point") {
                if (primitive.coordinates.length) {
                    for (i = 0; i < primitive.coordinates.length; i++) {
                        coordinates = primitive.coordinates[i];
                        if (polygonContainsPoint(coordinates, this.coordinates) && arraysIntersectArrays([this.coordinates], primitive.coordinates) === false) {
                            return true;
                        }
                    }
                }

                return false;
            // polygon.within(multipolygon)
            } else if (this.type === "Polygon") {
                for (let i = 0; i < this.coordinates.length; i++) {
                    if (primitive.coordinates[i].length === this.coordinates.length) {
                        for (let j = 0; j < this.coordinates.length; j++) {
                            if (coordinatesEqual(this.coordinates[j], primitive.coordinates[i][j])) {
                                return true;
                            }
                        }
                    }
                }

                if (arraysIntersectArrays(this.coordinates, primitive.coordinates) === false) {
                    if (primitive.coordinates.length) {
                        for (i = 0; i < primitive.coordinates.length; i++) {
                            coordinates = primitive.coordinates[i];
                            if (polygonContainsPoint(coordinates, this.coordinates[0][0]) === false) {
                                contains = false;
                            } else {
                                contains = true;
                            }
                        }

                        return contains;
                    }
                }

            // linestring.within(multipolygon), multipoint.within(multipolygon)
            } else if (this.type === "LineString" || this.type === "MultiPoint") {
                for (i = 0; i < primitive.coordinates.length; i++) {
                    const p = { type: "Polygon", coordinates: primitive.coordinates[i] };

                    if (this.within(p)) {
                        return true;
                    }

                    return false;
                }

            // multilinestring.within(multipolygon)
            } else if (this.type === "MultiLineString") {
                for (i = 0; i < this.coordinates.length; i++) {
                    const lines = new LineString(this.coordinates[i]);

                    if (lines.within(primitive) === false) {
                        return false;
                    }
                }

                return true;

            // multipolygon.within(multipolygon)
            } else if (this.type === "MultiPolygon") {
                for (i = 0; i < primitive.coordinates.length; i++) {
                    const mpoly = { type: "Polygon", coordinates: primitive.coordinates[i] };

                    if (this.within(mpoly) === false) {
                        return false;
                    }
                }

                return true;
            }
        }

        // default to false
        return false;
    }

    intersects(primitive) {
        // if we are passed a feature, use the polygon inside instead
        if (primitive.type === "Feature") {
            primitive = primitive.geometry;
        }

        const p = fromGeoJSON(primitive);
        if (this.within(primitive) || p.within(this)) {
            return true;
        }


        if (this.type !== "Point" && this.type !== "MultiPoint" &&
            primitive.type !== "Point" && primitive.type !== "MultiPoint") {
            return arraysIntersectArrays(this.coordinates, primitive.coordinates);
        } else if (this.type === "Feature") {
        // in the case of a Feature, use the internal primitive for intersection
            const inner = fromGeoJSON(this.geometry);
            return inner.intersects(primitive);
        }

        warn(`Type ${this.type} to ${primitive.type} intersection is not supported by intersects`);
        return false;
    }
}


/**
 * GeoJSON Point Class
 * new Point();
 * new Point(x,y,z,wtf);
 * new Point([x,y,z,wtf]);
 * new Point([x,y]);
 * new Point({
 * type: "Point",
 * coordinates: [x,y]
 * });
 */
export class Point extends Primitive {
    constructor(...args) {
        super();
        const [input] = args;

        if (input && input.type === "Point" && input.coordinates) {
            extend(this, input);
        } else if (input && is.array(input)) {
            this.coordinates = input;
        } else if (args.length >= 2) {
            this.coordinates = args;
        } else {
            throw new error.InvalidArgument("Terraformer: invalid input for Terraformer.Point");
        }

        this.type = "Point";
    }
}

/**
 * GeoJSON MultiPoint Class
 * new MultiPoint();
 * new MultiPoint([[x,y], [x1,y1]]);
 * new MultiPoint({
 * type: "MultiPoint",
 * coordinates: [x,y]
 * });
 */
export class MultiPoint extends Primitive {
    constructor(input) {
        super();
        if (input && input.type === "MultiPoint" && input.coordinates) {
            extend(this, input);
        } else if (is.array(input)) {
            this.coordinates = input;
        } else {
            throw new error.InvalidArgument("Terraformer: invalid input for Terraformer.MultiPoint");
        }
        this.type = "MultiPoint";
    }

    forEach(func) {
        for (let i = 0; i < this.coordinates.length; i++) {
            func.apply(this, [this.coordinates[i], i, this.coordinates]);
        }
        return this;
    }

    addPoint(point) {
        this.coordinates.push(point);
        return this;
    }

    insertPoint(point, index) {
        this.coordinates.splice(index, 0, point);
        return this;
    }

    removePoint(remove) {
        if (is.number(remove)) {
            this.coordinates.splice(remove, 1);
        } else {
            this.coordinates.splice(this.coordinates.indexOf(remove), 1);
        }
        return this;
    }

    get(i) {
        return new Point(this.coordinates[i]);
    }
}

/**
 * GeoJSON LineString Class
 * new LineString();
 * new LineString([[x,y], [x1,y1]]);
 * new LineString({
 * type: "LineString",
 * coordinates: [x,y]
 * });
 */
export class LineString extends Primitive {
    constructor(input) {
        super();
        if (input && input.type === "LineString" && input.coordinates) {
            extend(this, input);
        } else if (is.array(input)) {
            this.coordinates = input;
        } else {
            throw new error.InvalidArgument("Terraformer: invalid input for Terraformer.LineString");
        }

        this.type = "LineString";
    }

    addVertex(point) {
        this.coordinates.push(point);
        return this;
    }

    insertVertex(point, index) {
        this.coordinates.splice(index, 0, point);
        return this;
    }

    removeVertex(remove) {
        this.coordinates.splice(remove, 1);
        return this;
    }
}


/**
 * GeoJSON MultiLineString Class
 * new MultiLineString();
 * new MultiLineString([ [[x,y], [x1,y1]], [[x2,y2], [x3,y3]] ]);
 * new MultiLineString({
 * type: "MultiLineString",
 * coordinates: [ [[x,y], [x1,y1]], [[x2,y2], [x3,y3]] ]
 * });
 */
export class MultiLineString extends Primitive {
    constructor(input) {
        super();
        if (input && input.type === "MultiLineString" && input.coordinates) {
            extend(this, input);
        } else if (is.array(input)) {
            this.coordinates = input;
        } else {
            throw new error.InvalidArgument("Terraformer: invalid input for Terraformer.MultiLineString");
        }

        this.type = "MultiLineString";
    }

    forEach(func) {
        for (let i = 0; i < this.coordinates.length; i++) {
            func.apply(this, [this.coordinates[i], i, this.coordinates]);
        }
    }

    get(i) {
        return new LineString(this.coordinates[i]);
    }
}

/**
 * GeoJSON Polygon Class
 * new Polygon();
 * new Polygon([ [[x,y], [x1,y1], [x2,y2]] ]);
 * new Polygon({
 * type: "Polygon",
 * coordinates: [ [[x,y], [x1,y1], [x2,y2]] ]
 * });
 */
export class Polygon extends Primitive {
    constructor(input) {
        super();
        if (input && input.type === "Polygon" && input.coordinates) {
            extend(this, input);
        } else if (is.array(input)) {
            this.coordinates = input;
        } else {
            throw new error.InvalidArgument("Terraformer: invalid input for Terraformer.Polygon");
        }

        this.type = "Polygon";
    }

    addVertex(point) {
        this.insertVertex(point, this.coordinates[0].length - 1);
        return this;
    }

    insertVertex(point, index) {
        this.coordinates[0].splice(index, 0, point);
        return this;
    }

    removeVertex(remove) {
        this.coordinates[0].splice(remove, 1);
        return this;
    }

    close() {
        this.coordinates = closedPolygon(this.coordinates);
    }

    hasHoles() {
        return this.coordinates.length > 1;
    }

    holes() {
        const holes = [];
        if (this.hasHoles()) {
            for (let i = 1; i < this.coordinates.length; i++) {
                holes.push(new Polygon([this.coordinates[i]]));
            }
        }
        return holes;
    }
}

/**
 * GeoJSON MultiPolygon Class
 * new MultiPolygon();
 * new MultiPolygon([ [ [[x,y], [x1,y1]], [[x2,y2], [x3,y3]] ] ]);
 * new MultiPolygon({
 * type: "MultiPolygon",
 * coordinates: [ [ [[x,y], [x1,y1]], [[x2,y2], [x3,y3]] ] ]
 * });
 */
export class MultiPolygon extends Primitive {
    constructor(input) {
        super();
        if (input && input.type === "MultiPolygon" && input.coordinates) {
            extend(this, input);
        } else if (is.array(input)) {
            this.coordinates = input;
        } else {
            throw new error.InvalidArgument("Terraformer: invalid input for Terraformer.MultiPolygon");
        }
        this.type = "MultiPolygon";
    }

    forEach(func) {
        for (let i = 0; i < this.coordinates.length; i++) {
            func.apply(this, [this.coordinates[i], i, this.coordinates]);
        }
    }

    get(i) {
        return new Polygon(this.coordinates[i]);
    }

    close() {
        const outer = [];
        this.forEach((polygon) => {
            outer.push(closedPolygon(polygon));
        });
        this.coordinates = outer;
        return this;
    }
}


/**
 * GeoJSON Feature Class
 * new Feature();
 * new Feature({
 * type: "Feature",
 * geometry: {
 * type: "Polygon",
 * coordinates: [ [ [[x,y], [x1,y1]], [[x2,y2], [x3,y3]] ] ]
 * }
 * });
 * new Feature({
 * type: "Polygon",
 * coordinates: [ [ [[x,y], [x1,y1]], [[x2,y2], [x3,y3]] ] ]
 * });
 */
export class Feature extends Primitive {
    constructor(input) {
        super();
        if (input && input.type === "Feature") {
            extend(this, input);
        } else if (input && input.type && input.coordinates) {
            this.geometry = input;
        } else {
            throw new error.InvalidArgument("Terraformer: invalid input for Terraformer.Feature");
        }
        this.type = "Feature";
    }
}

/**
 * GeoJSON FeatureCollection Class
 * new FeatureCollection();
 * new FeatureCollection([feature, feature1]);
 * new FeatureCollection({
 * type: "FeatureCollection",
 * coordinates: [feature, feature1]
 * });
 */
export class FeatureCollection extends Primitive {
    constructor(input) {
        super();
        if (input && input.type === "FeatureCollection" && input.features) {
            extend(this, input);
        } else if (is.array(input)) {
            this.features = input;
        } else {
            throw new error.InvalidArgument("Terraformer: invalid input for Terraformer.FeatureCollection");
        }

        this.type = "FeatureCollection";
    }

    forEach(func) {
        for (let i = 0; i < this.features.length; i++) {
            func.apply(this, [this.features[i], i, this.features]);
        }
    }

    get(id) {
        let found;
        this.forEach((feature) => {
            if (feature.id === id) {
                found = feature;
            }
        });
        return new Feature(found);
    }
}


/**
 * GeoJSON GeometryCollection Class
 * new GeometryCollection();
 * new GeometryCollection([geometry, geometry1]);
 * new GeometryCollection({
 * type: "GeometryCollection",
 * coordinates: [geometry, geometry1]
 * });
 */
export class GeometryCollection extends Primitive {
    constructor(input) {
        super();
        if (input && input.type === "GeometryCollection" && input.geometries) {
            extend(this, input);
        } else if (is.array(input)) {
            this.geometries = input;
        } else if (input.coordinates && input.type) {
            this.type = "GeometryCollection";
            this.geometries = [input];
        } else {
            throw new error.InvalidArgument("Terraformer: invalid input for Terraformer.GeometryCollection");
        }

        this.type = "GeometryCollection";
    }

    forEach(func) {
        for (let i = 0; i < this.geometries.length; i++) {
            func.apply(this, [this.geometries[i], i, this.geometries]);
        }
    }

    get(i) {
        return fromGeoJSON(this.geometries[i]);
    }
}


const createCircle = (center, radius, interpolate) => {
    const mercatorPosition = positionToMercator(center);
    const steps = interpolate || 64;
    const polygon = {
        type: "Polygon",
        coordinates: [[]]
    };
    for (let i = 1; i <= steps; i++) {
        const radians = i * (360 / steps) * Math.PI / 180;
        polygon.coordinates[0].push([mercatorPosition[0] + radius * Math.cos(radians), mercatorPosition[1] + radius * Math.sin(radians)]);
    }
    polygon.coordinates = closedPolygon(polygon.coordinates);

    return toGeographic(polygon);
};

export class Circle extends Primitive {
    constructor(center, radius, interpolate) {
        super();
        const steps = interpolate || 64;
        const rad = radius || 250;

        if (!center || center.length < 2 || !rad || !steps) {
            throw new Error("Terraformer: missing parameter for Terraformer.Circle");
        }

        extend(this, new Feature({
            type: "Feature",
            geometry: createCircle(center, rad, steps),
            properties: {
                radius: rad,
                center,
                steps
            }
        }));
    }

    recalculate() {
        this.geometry = createCircle(this.properties.center, this.properties.radius, this.properties.steps);
        return this;
    }

    center(coordinates) {
        if (coordinates) {
            this.properties.center = coordinates;
            this.recalculate();
        }
        return this.properties.center;
    }

    radius(radius) {
        if (radius) {
            this.properties.radius = radius;
            this.recalculate();
        }
        return this.properties.radius;
    }

    steps(steps) {
        if (steps) {
            this.properties.steps = steps;
            this.recalculate();
        }
        return this.properties.steps;
    }

    toJSON() {
        const output = Primitive.prototype.toJSON.call(this);
        return output;
    }
}


export const fromGeoJSON = (geojson) => {
    if (geojson) {
        switch (geojson.type) {
            case "Point":
                return new Point(geojson);

            case "MultiPoint":
                return new MultiPoint(geojson);

            case "LineString":
                return new LineString(geojson);

            case "MultiLineString":
                return new MultiLineString(geojson);

            case "Polygon":
                return new Polygon(geojson);

            case "MultiPolygon":
                return new MultiPolygon(geojson);

            case "Feature":
                return new Feature(geojson);

            case "FeatureCollection":
                return new FeatureCollection(geojson);

            case "GeometryCollection":
                return new GeometryCollection(geojson);

            default:
                throw new Error(`Unknown type: ${geojson.type}`);
        }
    }
    return new Primitive();
};


export const Tools = {
    positionToMercator,
    positionToGeographic,
    applyConverter,
    toMercator,
    toGeographic,
    createCircle,
    calculateBounds,
    calculateEnvelope,
    coordinatesContainPoint,
    polygonContainsPoint,
    arraysIntersectArrays,
    coordinatesEqual,
    convexHull,
    isConvex
};


adone.lazify({
    WKT: "./wkt",
    WKX: "./wkx"
}, exports, require);
