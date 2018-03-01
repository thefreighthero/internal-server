const logger = require('../src/logger')('internal:phonemessenger');
const {URLSearchParams,} = require('url');
const rp = require('request-promise-native');
const btoa = require('btoa');

const TEST_MODE = process.env.PHONE_DEBUG_REROUTE || false;

module.exports = class PhoneMessenger {

    constructor(extensions, username, password) {
        this.extensions = extensions;
        this.credentials = btoa(`${username}:${password}`)
    }

    /**
     * @param extension
     * @param data
     * @param addOutgoingUri
     * @returns string
     */
    getPhoneUri(extension, data, addOutgoingUri = false) {
        const extension_data = this.extensions.find(ext => ext.extension === extension);
        if (!extension_data) {
            return null;
        }
        let phone_uri = `http://${extension_data.ip}/servlet`;
        //add outgoing uri of extension
        if (addOutgoingUri) {
            data.outgoing_uri = extension_data.uri;
        }
        //the value of `key` should not be uriencoded
        let key_prefix = '';
        if (data.key) {
            key_prefix = `key=${data.key}`;
            delete data.key;
        }
        const urlParams = new URLSearchParams();
        if (Object.keys(data).length) {
            Object.keys(data).forEach(key => urlParams.append(key, data[key]));
            phone_uri = phone_uri + '?' + key_prefix + '&' + urlParams;
        } else {
            phone_uri = phone_uri + '?' + key_prefix;
        }
        return phone_uri;
    }

    /**
     * Post message to server. Returns Promise that resolves in the results data Object
     * @param extension
     * @param data
     * @param addOutgoingUri
     * @returns {Promise}
     */
    sendMessage(extension, data, addOutgoingUri = false) {
        return new Promise((resolve, reject) => {
            let phone_uri = this.getPhoneUri(extension, data, addOutgoingUri);
            if (!phone_uri) {
                reject(`Extension ${extension} not connected`);
                return;
            }
            if (TEST_MODE) {
                logger.debug('Dummy request to %s', phone_uri);
                resolve({});
                return;
            }
            logger.info('Request to %s', phone_uri);
            const options = {
                method: 'GET',
                uri: phone_uri,
                headers: {
                    'Authorization': `Basic ${this.credentials}`,
                },
            };
            rp(options).then(res => {
                console.log(res);
                resolve(res);
            }).catch(err => {
                console.log(err);
                reject(err);
            });
        });
    }

};

