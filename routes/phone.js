const logger = require('../src/logger')('internal:api');

const express = require('express');
const router = express.Router();
const {REALTIME_URL, REALTIME_API_KEY, PHONE_USERNAME, PHONE_PASSWORD,} = require('../config');

const {extensions, extensionFromActiveUser,} = require('../src/extensions');
const ServerMessenger = require('../src/ServerMessenger');
const PhoneMessenger = require('../src/PhoneMessenger');

const realtime_url = REALTIME_URL || 'https://live.thefreighthero.nl';
const realtime_api_url = `${realtime_url}/api/v1`;

const serverMessenger = new ServerMessenger(realtime_api_url, REALTIME_API_KEY);
const phoneMessenger = new PhoneMessenger(extensions, PHONE_USERNAME, PHONE_PASSWORD);

function numberFromConnectionString(connection) {
    const m = /^sip:(\d*)@/.exec(connection);
    if (m) {
        return m[1];
    }
    return connection;
}

function cleanPhoneNumber(number) {
    if (number.match(/^(?:\+|00)[1-9](?:[0-9]{0,2}[ -]?)[0-9- ]{6,20}$/)) {
        return number.replace(/[ -]/g, '').replace('+', '00');
    }
    number = String(number).replace(/\D/g, '') //strip all non-numeric
        .replace(/^(00)?310?/, '');  //strip nl-code
    return number.substr(0, 1) !== '0' ? '0' + number : number;
}
/**
 * Get list of extensions for Chrome extension popup
 */
router.get('/', (req, res, next) => {
    res.send({status: 'Ok', extensions: extensions.map(ext => ({extension: ext.extension, name: ext.name,})),});
});

/**
 * Request from Chrome extension to perform a command
 * http://10.3.20.10/servlet?key=ASW:call_id //answer a call
 */
router.post('/command', (req, res, next) => {
    const {cmd, extension,} = req.body;
    logger.info('Command %s from %s', cmd, extension);
    const phone_data = {};
    switch (cmd) {
        case 'answer':
            const {call_id,} = req.body.data;
            phone_data.key = `ASW:${call_id}`;
            break;
        case 'call-end':
            phone_data.key = 'CALLEND';
            break;
        default:
            break;
    }

    phoneMessenger.sendMessage(extension, phone_data)
        .then(() => {
            res.send({result: 'Ok', data: {cmd, extension,},});
        }).catch(e => {
            res.status(400);
            res.send({result: 'Error', message: e,});
        });
});

/**
 * Request from Chrome extension to place a call
 * http://10.3.20.10/servlet?key=number=1234&outgoing_uri=1006@10.2.1.48
 */
router.post('/call', (req, res, next) => {
    const {extension, number,} = req.body;
    const cleaned_number = cleanPhoneNumber(number);
    logger.info('Calling %s from %s', cleaned_number, extension);
    phoneMessenger.sendMessage(extension, {key: `number=${cleaned_number}`,}, true)
        .then(() => {
            res.send({result: 'Ok', number: cleaned_number,});
        }).catch(e => {
            res.status(400);
            res.send({result: 'Error', message: e,});
        });
});

/**internal - dh5%#$3geGSH
 * Incoming call trigger from phone
 * http://192.168.1.26:3000/phone/incoming?active_host=$active_host&active_user=$active_user&ip=$ip&remote=$remote&local=$local&display_remote=$display_remote&display_local=$display_local&call_id=$call_id
 */
router.get('/incoming', (req, res, next) => {
    const {active_user, call_id, remote, display_remote,} = req.query;
    const {extension,} = extensionFromActiveUser(active_user);
    if (!extension) {
        res.status(404);
        res.send({status: 'Error', message: `Extension for ${active_user} not found!`,});
        return;
    }
    serverMessenger.sendMessage('phone/incoming/' + extension, {
        call_id,
        name: display_remote,
        number: numberFromConnectionString(remote),
    })
        .then(({number,}) => {
            logger.info('Incoming call %s@%s from %s reported to the realtime server.', call_id, active_user, number);
            res.send({status: 'Ok', call_id, number,});
        })
        .catch(err => {
            const message = `Error in communicating with realtime server: ${err}`;
            logger.error(message);
            res.status(500);
            res.send({status: 'Error', message,});
        });

});

/**
 * Outgoing call trigger from phone
 * http://192.168.1.26:3000/phone/outgoing?active_host=$active_host&active_user=$active_user&ip=$ip&remote=$remote&local=$local&display_remote=$display_remote&display_local=$display_local&call_id=$call_id&called_number=$calledNumber
 */
router.get('/outgoing', (req, res, next) => {
    const {active_user, call_id, remote, display_remote, called_number,} = req.query;
    const {extension,} = extensionFromActiveUser(active_user);
    if (!extension) {
        res.status(404);
        res.send({status: 'Error', message: `Extension for ${active_user} not found!`,});
        return;
    }
    serverMessenger.sendMessage('phone/outgoing/' + extension, {
        call_id,
        name: display_remote,
        number: called_number,
    })
        .then(({number,}) => {
            logger.info('/Outgoing call %s@%s to %s reported to the realtime server.', call_id, active_user, number);
            res.send({status: 'Ok', call_id, number,});
        })
        .catch(err => {
            const message = `Error in communicating with realtime server: ${err}`;
            logger.error(message);
            res.status(500);
            res.send({status: 'Error', message,});
        });

});

/**
 * Missed call trigger from phone
 * http://192.168.1.26:3000/phone/missed?active_user=$active_user&call_id=$call_id
 */
router.get('/missed', (req, res, next) => {
    const {active_user, call_id,} = req.query;
    const {extension,} = extensionFromActiveUser(active_user);
    const status = -1;
    serverMessenger.sendMessage('phone/call_status/' + extension, {
        call_id,
        data: {status,},
    })
        .then(() => {
            logger.info('Call missed %s@%s reported to the realtime server.', call_id, extension);
            res.send({status: 'Ok', call_id, extension,});
        })
        .catch(err => {
            const message = `Error in communicating with realtime server: ${err}`;
            logger.error(message);
            res.status(500);
            res.send({status: 'Error', message,});
        });
});

/**
 * Established call trigger from phone
 * http://192.168.1.26:3000/phone/established?active_user=$active_user&call_id=$call_id
 */
router.get('/established', (req, res, next) => {
    const {active_user, call_id,} = req.query;
    const {extension,} = extensionFromActiveUser(active_user);
    const status = 2;
    serverMessenger.sendMessage('phone/call_status/' + extension, {
        call_id,
        data: {status,},
    })
        .then(() => {
            logger.info('Call established %s@%s reported to the realtime server.', call_id, extension);
            res.send({status: 'Ok', call_id, extension,});
        })
        .catch(err => {
            const message = `Error in communicating with realtime server: ${err}`;
            logger.error(message);
            res.status(500);
            res.send({status: 'Error', message,});
        });

});

/**
 * Terminated call trigger from phone
 * http://192.168.1.26:3000/phone/terminated?active_user=$active_user&call_id=$call_id
 */
router.get('/terminated', (req, res, next) => {
    const {active_user, call_id,} = req.query;
    const {extension,} = extensionFromActiveUser(active_user);
    const status = 3;
    serverMessenger.sendMessage('phone/call_status/' + extension, {
        call_id,
        data: {status,},
    })
        .then(() => {
            logger.info('Call terminated %s@%s reported to the realtime server.', call_id, extension);
            res.send({status: 'Ok', call_id, extension,});
        })
        .catch(err => {
            const message = `Error in communicating with realtime server: ${err}`;
            logger.error(message);
            res.status(500);
            res.send({status: 'Error', message,});
        });

});

module.exports = router;
