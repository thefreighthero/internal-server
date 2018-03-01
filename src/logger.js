
const winston = require('winston');
const config = require('winston/lib/winston/config');
const moment = require('moment');

//add time diff and format messages
const namespace_colors = {
    'internal:server': 'yellow',
    'internal:phone': 'green',
    'internal:phonemessenger': 'blue',
};
winston.addColors(namespace_colors);

let last_call;
function timestampDiff() {
    let now = Date.now();
    let diff = now - (last_call || Date.now());
    last_call = now;
    if (diff > 60000) {
        return moment.duration(diff).humanize();
    }
    if (diff > 1000) {
        return moment.duration(diff).asSeconds() + 's';
    }
    return moment.duration(diff).asMilliseconds() + 'ms';
}

function formatter(options) {
    let namespace = options.meta && options.meta.namespace ? options.meta.namespace : '';
    if (namespace && namespace_colors[namespace]) {
        namespace = config.colorize(namespace, namespace);
    }
    return '+' + timestampDiff() + ' ' +
        config.colorize(options.level, options.level.toUpperCase()) + ' ' +
            namespace + ' ' +
            (options.message ? options.message : '');
}

//set up transports
const transports = [
    new (winston.transports.File)({
        name: 'error-file',
        filename: __dirname + '/../../logs/internal-server-error.log',
        level: 'error',
    }),
];

//console logger for local console
if (process.env.NODE_ENV !== 'production') {
    transports.push(new (winston.transports.Console)({
        level: 'silly',
        formatter,
    }));
}

//set up logger
const logger = new (winston.Logger)({transports,});

//wrapper to add namespaces
class NamespaceLogger {
    constructor(namespace) {
        this.namespace = namespace;
        this.logger = logger;
    }
    error(...args) {
        this.logger.error(...args, {namespace: this.namespace,});
    }
    warn(...args) {
        this.logger.warn(...args, {namespace: this.namespace,});
    }
    info(...args) {
        this.logger.info(...args, {namespace: this.namespace,});
    }
    verbose(...args) {
        this.logger.verbose(...args, {namespace: this.namespace,});
    }
    debug(...args) {
        this.logger.debug(...args, {namespace: this.namespace,});
    }
    silly(...args) {
        this.logger.silly(...args, {namespace: this.namespace,});
    }
}

/**
 *
 * @param namespace
 * @returns {NamespaceLogger}
 */
module.exports = namespace => new NamespaceLogger(namespace);