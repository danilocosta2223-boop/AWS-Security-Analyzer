const express = require("express");

const router = express.Router();

const {
    listarUsuarios
} = require("../controllers/iamController");

router.get("/", listarUsuarios);

module.exports = router;