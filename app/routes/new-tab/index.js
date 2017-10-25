var adBlocker = require('just-detect-adblock');
var express = require('express');
var router = express.Router();
var RouteHandler = require('../../handlers/route_handler');


router.get('/', continueIfLoggedIn, function(req, res) {

    if (adBlocker.isDetected()) {
        res.render("unblock.ejs");
    } else {

        var data = {
            user: req.user,
            stats: {
                donations: "Rs. 10130.0",
                followers: "15100"
            }
        };
        res.render("new-tab.ejs", data);
    }
});

function continueIfLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

module.exports = router;