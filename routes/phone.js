const debug = require('debug')('server-app:phone');

const express = require('express');
const router = express.Router();

const {extensions, extensionFromActiveUser,} = require('../src/extensions');
const ServerMessenger = require('../src/ServerMessenger');
const PhoneMessenger = require('../src/PhoneMessenger');

const realtime_server_url = 'http://localhost:5678/api/v1';
// const realtime_server_url = 'https://live.thefreighthero.nl/api/v1';
const username = 'admin';
const password = '045083';
const api_key = 'ghis%$7%#sgdw34W^sVS(#$STshsg44';

const serverMessenger = new ServerMessenger(realtime_server_url, api_key);
const phoneMessenger = new PhoneMessenger(extensions, username, password);

function numberFromConnectionString(connection) {
    const m = /^sip:(\d*)@/.exec(connection);
    if (m) {
        return m[1];
    }
    return connection;
}

function cleanPhoneNumber(number) {
    number = String(number).replace(/\D/g, '') //strip all non-numeric
        .replace(/^(00)?310?/, '');  //strip nl-code
    return (number.substr(0, 1) !== '0' && number.length > 4) ? '0' + number : number;
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
    debug('Command %s from %s', cmd, extension);
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
    debug('Calling %s from %s', number, extension);
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
            debug('Incoming call %s@%s from %s reported to the realtime server.', call_id, active_user, number);
            res.send({status: 'Ok', call_id, number,});
        })
        .catch(err => {
            const message = `Error in communicating with realtime server: ${err}`;
            debug(message);
            res.status(500);
            res.send({status: 'Error', message,});
        });

});

/**
 * Outgoing call trigger from phone
 * http://192.168.1.26:3000/phone/outgoing?active_host=$active_host&active_user=$active_user&ip=$ip&remote=$remote&local=$local&display_remote=$display_remote&display_local=$display_local&call_id=$call_id&called_number=$calledNumber
 */
router.get('/outgoing', (req, res, next) => {
    const {active_host, active_user, ip, call_id, remote, local, display_remote, display_local, called_number,} = req.query;
    console.log('Outgoing call ', active_host, active_user, ip, call_id, remote, display_remote, local, display_local, called_number);
});

/**
 * Established call trigger from phone
 * http://192.168.1.26:3000/phone/established?active_user=$active_user&call_id=$call_id
 */
router.get('/established', (req, res, next) => {
    const {active_user, call_id,} = req.query;
    const {extension,} = extensionFromActiveUser(active_user);
    console.log('established ', active_user, call_id);
    const status = 2;
    //todo
    serverMessenger.sendMessage('phone/call_status/' + extension, {
        call_id,
        data: {status,},
    })
        .then(({number,}) => {
            debug('Call established %s@%s with %s reported to the realtime server.', call_id, active_user, number);
            res.send({status: 'Ok', call_id, number,});
        })
        .catch(err => {
            const message = `Error in communicating with realtime server: ${err}`;
            debug(message);
            res.status(500);
            res.send({status: 'Error', message,});
        });

});

/**
 * Picked up new inoming call trigger from phone //Not needed??
 * http://192.168.1.26:3000/phone/terminated?active_user=$active_user&call_id=$call_id&remote=$remote&display_remote=$display_remote
 */
router.get('/pickedup', (req, res, next) => {
    const {active_host, active_user, ip, call_id, remote, local, display_remote, display_local,} = req.query;
    console.log('pickedup ', active_host, active_user, ip, call_id, remote, display_remote, local, display_local);
});

module.exports = router;
