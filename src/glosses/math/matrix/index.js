export const EPSILON = 0.000001;

export const equals = (a, b) => Math.abs(a - b) <= EPSILON * Math.max(1.0, Math.abs(a), Math.abs(b));
export const toRadian = (a) => a * Math.PI / 180;

adone.lazify({
    mat2: "./mat2",
    mat2d: "./mat2d",
    mat3: "./mat3",
    mat4: "./mat4",
    quat: "./quat",
    vec2: "./vec2",
    vec3: "./vec3",
    vec4: "./vec4"
}, exports, require);
