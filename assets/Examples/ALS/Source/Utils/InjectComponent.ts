import { Component, Constructor, error } from "cc";
import { DEBUG } from "cc/env";

const START_METHOD_NAME = 'start';

type StartMethod<T extends Component> = (this: T) => void;

export function injectComponent<T extends Component>(componentConstructor: Constructor<T>, inChildren = true): PropertyDecorator {
    if (DEBUG) {
        if (typeof componentConstructor === 'undefined') {
            error(`@injectComponent() received an undefined value. Did circular reference happened?`);
        }
    }

    return (target, propertyKey) => {
        const oldDescriptor = Object.getOwnPropertyDescriptor(target, START_METHOD_NAME);

        let oldMethod: StartMethod<T> | undefined;
        if (oldDescriptor) {
            if (typeof oldDescriptor.value === 'function') {
                oldMethod = oldDescriptor.value;
            } else {
                throw new Error(`The existing 'start' property is not a function.`);
            }
        }

        const newDescriptor: PropertyDescriptor = {
            configurable: true,
            enumerable: false,
            writable: true,
            value: function (this: T) {
                const instance =
                    this.node.getComponent(componentConstructor)
                    ?? this.node.getComponentInChildren(componentConstructor)
                    ?? null;
                Reflect.set(this, propertyKey, instance);

                if (oldMethod) {
                    oldMethod.apply(this);
                }
            },
        };

        Object.defineProperty(target, START_METHOD_NAME, newDescriptor);
    };
}