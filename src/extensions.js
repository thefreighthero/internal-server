
const extensions = require('../data/extensions.json');

function extensionFromActiveUser(active_user) {
    return extensions.find(ext => ext.user === active_user) || {};
}

module.exports = {
    extensions,
    extensionFromActiveUser,
};
