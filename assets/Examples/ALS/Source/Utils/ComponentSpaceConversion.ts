import { Quat } from "cc";
import { Vec3 } from "cc";
import { quatDivideLeft } from "./QuatDivde";
import { Component } from "cc";

export function worldToComponentPosition(out: Vec3, worldPosition: Readonly<Vec3>, component: Component) {
    component.node.inverseTransformPoint(out, worldPosition);
    return out;
}

export function worldToComponentRotation(out: Quat, worldRotation: Readonly<Quat>, component: Component) {
    return quatDivideLeft(out, worldRotation, component.node.worldRotation);
}

export function componentToWorldPosition(out: Vec3, componentPosition: Readonly<Vec3>, component: Component) {
    return Vec3.transformMat4(out, componentPosition, component.node.worldMatrix);
}