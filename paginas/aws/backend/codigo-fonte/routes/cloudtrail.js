const express = require("express");

const router = express.Router();

const {
    listarTrails
} = require("../controllers/cloudtrailController");

router.get("/", listarTrails);

module.exports = router;