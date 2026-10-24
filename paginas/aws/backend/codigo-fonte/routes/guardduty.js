const express = require("express");
const router = express.Router();

const {
    listarGuardDuty
} = require("../controllers/guarddutyController");

router.get("/", listarGuardDuty);

module.exports = router;