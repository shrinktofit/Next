import { Director } from "cc";

const getOrCreateSlomoPolyfill = (() => {
    let polyfill: undefined | { multiplier: number; };

    return () => {
        if (!polyfill) {
            const polyfill_ = { multiplier: 1.0 };
            const tick = Director.prototype.tick;
            Director.prototype.tick = function(dt: number, ...args) {
                tick.call(this, dt * polyfill_.multiplier, ...args);
            };
            polyfill = polyfill_;
        }
        return polyfill;
    };
})();

export function slomo(multiplier: number) {
    getOrCreateSlomoPolyfill().multiplier = multiplier;
}
