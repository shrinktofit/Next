import { _decorator, Component, Node, error, animation, Eventify } from 'cc';
const { ccclass, property, executionOrder } = _decorator;

import type { ALSAnimFeature } from './ALSAnimFeature';

// Just a dummy class to dispatch event for Animation(Controller)
// TODO: Consider supporting dynamic display of event lists by allowing to edit Eventify as normal property
@ccclass('AnimEventDispatcher')
export class AnimEventDispatcher extends Eventify(Component) {
    public static listenToGraphEvent (target: ALSAnimFeature, eventName: string, callback: () => void) {
        AnimEventDispatcher.prototype[eventName] = function () {
            if (false) {
                console.log(`Graph event ${eventName} triggered.`);
            }
            if (target.enabled) {
                callback();
            }
        }
    }
}
