const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const controller = require("../controllers/resourceController");

router.get("/", controller.getAllResources);
router.post("/", upload.single("file"), controller.uploadResource);
router.delete("/:id", controller.deleteResource);
router.put("/:id", upload.single("file"), controller.updateResource);

module.exports = router;