const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
    res.render('index', { title: 'TFH Server App', });
});

router.get('/ping', (req, res, next) => {
    res.send('pong');
});

module.exports = router;
