const path = require('path');
const Module = require('module');

const originalRequire = Module.prototype.require;

Module.prototype.require = function(request) {
    if (request.startsWith('@shared/')) {
        const sharedPath = request.replace('@shared', path.join(__dirname, 'dist/shared'));
        return originalRequire.call(this, sharedPath);
    }
    return originalRequire.call(this, request);
}; 