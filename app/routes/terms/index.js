var express = require('express');
var router = express.Router();
var RouteHandler = require('../../handlers/route_handler');

router.get('/', function(req, res) { res.render("terms.ejs"); });

module.exports = router;