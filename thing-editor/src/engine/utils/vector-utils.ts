import { Point } from 'pixi.js';
import * as THREE from 'three';

/**
 * Utility functions for Vector2 and Vector3 operations.
 * Since JS objects are reference types, these functions help with safe copying and manipulation.
 */

// ============================================
// Vector2 Utilities
// ============================================

/**
 * Creates a new Vector2 with the given values.
 */
export function vec2(x: number = 0, y: number = 0): Vector2 {
    return { x, y };
}

/**
 * Creates a clone of a Vector2.
 */
export function cloneVector2(v: Vector2): Vector2 {
    return { x: v.x, y: v.y };
}

/**
 * Copies values from source to target Vector2. Modifies target in place.
 * @returns The modified target
 */
export function copyVector2(target: Vector2, source: Vector2): Vector2 {
    target.x = source.x;
    target.y = source.y;
    return target;
}

/**
 * Copies values from a Pixi Point to a Vector2. Modifies target in place.
 * @returns The modified target
 */
export function copyFromPoint2(target: Vector2, point: Point): Vector2 {
    target.x = point.x;
    target.y = point.y;
    return target;
}

/**
 * Sets Vector2 values in place.
 * @returns The modified vector
 */
export function setVector2(v: Vector2, x: number, y: number): Vector2 {
    v.x = x;
    v.y = y;
    return v;
}

/**
 * Checks if two Vector2 are equal.
 */
export function equalsVector2(a: Vector2, b: Vector2): boolean {
    return a.x === b.x && a.y === b.y;
}

/**
 * Adds two Vector2, returns new Vector2.
 */
export function addVector2(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Subtracts b from a, returns new Vector2.
 */
export function subVector2(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Multiplies Vector2 by scalar, returns new Vector2.
 */
export function scaleVector2(v: Vector2, scalar: number): Vector2 {
    return { x: v.x * scalar, y: v.y * scalar };
}

/**
 * Calculates the length (magnitude) of a Vector2.
 */
export function lengthVector2(v: Vector2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Normalizes a Vector2 (makes it unit length), returns new Vector2.
 */
export function normalizeVector2(v: Vector2): Vector2 {
    const len = lengthVector2(v);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}

/**
 * Calculates dot product of two Vector2.
 */
export function dotVector2(a: Vector2, b: Vector2): number {
    return a.x * b.x + a.y * b.y;
}

/**
 * Linearly interpolates between two Vector2.
 * @param t Interpolation factor (0 = a, 1 = b)
 */
export function lerpVector2(a: Vector2, b: Vector2, t: number): Vector2 {
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
    };
}

/**
 * Converts a Vector2 to a Pixi Point.
 */
export function vector2ToPoint(v: Vector2): Point {
    return new Point(v.x, v.y);
}

/**
 * Converts a Pixi Point (or any object with x,y) to a Vector2.
 */
export function pointToVector2(point: Point): Vector2 {
    return { x: point.x, y: point.y };
}

// ============================================
// Vector3 Utilities
// ============================================

/**
 * Creates a new Vector3 with the given values.
 */
export function vec3(x: number = 0, y: number = 0, z: number = 0): Vector3 {
    return { x, y, z };
}

/**
 * Creates a clone of a Vector3.
 */
export function cloneVector3(v: Vector3): Vector3 {
    return { x: v.x, y: v.y, z: v.z };
}

/**
 * Copies values from source to target Vector3. Modifies target in place.
 * @returns The modified target
 */
export function copyVector3(target: Vector3, source: Vector3): Vector3 {
    target.x = source.x;
    target.y = source.y;
    target.z = source.z;
    return target;
}

/**
 * Sets Vector3 values in place.
 * @returns The modified vector
 */
export function setVector3(v: Vector3, x: number, y: number, z: number): Vector3 {
    v.x = x;
    v.y = y;
    v.z = z;
    return v;
}

/**
 * Checks if two Vector3 are equal.
 */
export function equalsVector3(a: Vector3, b: Vector3): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z;
}

/**
 * Adds two Vector3, returns new Vector3.
 */
export function addVector3(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/**
 * Subtracts b from a, returns new Vector3.
 */
export function subVector3(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/**
 * Multiplies Vector3 by scalar, returns new Vector3.
 */
export function scaleVector3(v: Vector3, scalar: number): Vector3 {
    return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

/**
 * Calculates the length (magnitude) of a Vector3.
 */
export function lengthVector3(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Normalizes a Vector3 (makes it unit length), returns new Vector3.
 */
export function normalizeVector3(v: Vector3): Vector3 {
    const len = lengthVector3(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Calculates dot product of two Vector3.
 */
export function dotVector3(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Calculates cross product of two Vector3.
 */
export function crossVector3(a: Vector3, b: Vector3): Vector3 {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}

/**
 * Linearly interpolates between two Vector3.
 * @param t Interpolation factor (0 = a, 1 = b)
 */
export function lerpVector3(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t
    };
}

// ============================================
// THREE.js Vector3 Conversions
// ============================================

/**
 * Converts engine Vector3 to THREE.Vector3.
 * Creates a new THREE.Vector3 instance.
 */
export function toThreeVector3(v: Vector3): THREE.Vector3 {
    return new THREE.Vector3(v.x, v.y, v.z);
}

/**
 * Converts THREE.Vector3 to engine Vector3.
 * Creates a new plain object.
 */
export function fromThreeVector3(v: THREE.Vector3): Vector3 {
    return { x: v.x, y: v.y, z: v.z };
}

/**
 * Copies values from engine Vector3 to THREE.Vector3.
 * Modifies target in place.
 * @returns The modified target
 */
export function copyToThreeVector3(target: THREE.Vector3, source: Vector3): THREE.Vector3 {
    target.set(source.x, source.y, source.z);
    return target;
}

/**
 * Copies values from THREE.Vector3 to engine Vector3.
 * Modifies target in place.
 * @returns The modified target
 */
export function copyFromThreeVector3(target: Vector3, source: THREE.Vector3): Vector3 {
    target.x = source.x;
    target.y = source.y;
    target.z = source.z;
    return target;
}

// ============================================
// Constants
// ============================================

/** Zero Vector2 */
export const VECTOR2_ZERO: Readonly<Vector2> = Object.freeze({ x: 0, y: 0 });

/** One Vector2 */
export const VECTOR2_ONE: Readonly<Vector2> = Object.freeze({ x: 1, y: 1 });

/** Zero Vector3 */
export const VECTOR3_ZERO: Readonly<Vector3> = Object.freeze({ x: 0, y: 0, z: 0 });

/** One Vector3 */
export const VECTOR3_ONE: Readonly<Vector3> = Object.freeze({ x: 1, y: 1, z: 1 });

/** Up direction Vector3 */
export const VECTOR3_UP: Readonly<Vector3> = Object.freeze({ x: 0, y: 1, z: 0 });

/** Forward direction Vector3 */
export const VECTOR3_FORWARD: Readonly<Vector3> = Object.freeze({ x: 0, y: 0, z: 1 });

/** Right direction Vector3 */
export const VECTOR3_RIGHT: Readonly<Vector3> = Object.freeze({ x: 1, y: 0, z: 0 });
