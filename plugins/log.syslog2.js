// Send logs to syslog using syslog2 (https://github.com/myndzi/syslog2).
"use strict";

var Syslog = require('syslog2');

exports.register = function() {
    var config = this.config.get('log.syslog2.ini', {
        booleans: ['-plugin.always_ok'],
    }) || {};
    config.general = config.general || {};
    config.connection = config.connection || {};
    config.plugin = config.plugin || {};

    var options = config.general;
    options.connection = config.connection;
    if (!options.facility) {
        options.facility = 'MAIL';
    }

    this.log = Syslog.create(options);
    this.always_ok = config.plugin.always_ok || false;

    // This is weird.  Syslog2 doesn't expose the normal syslog log level
    // constants (even as strings).  Instead it uses the Bunyan log level
    // scheme (https://www.npmjs.com/package/bunyan#levels).  Because Bunyan
    // isn't as granular as syslog, there are some syslog levels that syslog2
    // just can't emit messages in (LOG_ALERT and LOG_CRIT).  Also, Bunyan's
    // 'info' is treated as LOG_NOTICE, 'debug' is LOG_INFO, and 'trace' is
    // LOG_DEBUG.  It's all mixed up.  And on top of that, Haraka adds a couple
    // levels of its own (PROTOCOL and DATA) that also don't map to Bunyan log
    // levels.  :(
    this.level_map = {
        // Haraka log level: Bunyan log level
        EMERG: 'fatal',
        ALERT: 'fatal',
        CRIT: 'fatal',
        ERROR: 'error',
        WARN: 'warn',
        NOTICE: 'info',
        INFO: 'debug',
        DEBUG: 'trace',
        PROTOCOL: 'trace',
        DATA: 'trace',
    };

    this.register_hook('log', 'syslog');
};

exports.syslog = function (next, logger, log) {
    var level = log.level.toUpperCase();
    if (!(level in this.level_map)) {
        level = 'DEBUG';
    }

    this.log.write({
        msg: log.data,
        level: this.level_map[level],
    });

    if (this.always_ok) {
        return next(OK);
    }
    return next();
};
