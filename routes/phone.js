const debug = require('debug')('server-app:phone');

const express = require('express');
const router = express.Router();

const {extensions,} = require('../src/extensions');

router.get('/', (req, res, next) => {
    res.send({status: 'Ok', extensions,});
});

router.post('/call', (req, res, next) => {
    const {extension, nr,} = req.body;
    debug('Calling %s from %s', nr, extension);
    res.send({result: 'Ok',});
});
/**
 * http://192.168.1.26:3000/phone/incoming?host=$active_host&user=$active_user&ip=$ip&nr=$remote&callerID=$callerID&nr_display=$display_remote
 */
router.get('/incoming', (req, res, next) => {
    const {nr_display, nr, ip, user, callerID,} = req.query;
    debug(nr_display, nr, ip, user, callerID);
    res.send({status: 'Ok',});
});

module.exports = router;
