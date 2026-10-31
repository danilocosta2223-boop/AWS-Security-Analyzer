const express = require("express");
const router = express.Router();

const { listarBuckets } = require("../controllers/s3Controller");

router.get("/", listarBuckets);

module.exports = router;