const express = require("express");

const router = express.Router();

const {
    listarInstancias
} = require("../controllers/ec2Controller");

router.get("/", listarInstancias);

module.exports = router;