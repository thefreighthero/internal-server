
const rp = require('request-promise-native');


module.exports = class ServerMessenger {

    constructor(server_url, api_key) {
        this.server_url = server_url;
        this.api_key = api_key;
    }

    /**
     * Post message to server. Returns Promise that resolves in the results data Object
     * @param url
     * @param data
     * @returns {Promise}
     */
    sendMessage(url, data) {
        const options = {
            method: 'POST',
            uri: `${this.server_url}/${url}`,
            body: data,
            headers: {
                'x-tfh-apitoken': this.api_key,
            },
            json: true,
        };

        return rp(options);
    }

};

