import AnimPPImporter from "./Internals/AnimPPImporter";

export function load() { }

export function unload() { }

export namespace methods {
    export function registerAnimPPImporter() {
        return register(['.animpp'], AnimPPImporter);
    }
    
    function register(extname: string[], importer: new (...args: any[]) => object) {
        return { extname: extname, importer: importer };
    }
}
