const express    = require("express");
const router     = express.Router();
const upload     = require("../middleware/upload");
const controller = require("../controllers/resourceController");

// ── /meta/* MUST be above /:id ────────────────────────────────
router.get(   "/meta/subjects",    controller.getSubjects);
router.get(   "/meta/subfolders",  controller.getSubfolders);
router.post(  "/meta/subjects",    controller.createSubject);
router.post(  "/meta/subfolders",  controller.createSubfolder);
router.delete("/meta/subjects",    controller.deleteSubject);    // ?subject=Economics
router.delete("/meta/subfolders",  controller.deleteSubfolder);  // ?subject=Economics&subFolder=Economics/Macro

// ── Resource CRUD ─────────────────────────────────────────────
router.get(   "/",    controller.getAllResources);
router.post(  "/",    upload.single("file"), controller.uploadResource);
router.delete("/:id", controller.deleteResource);
router.put(   "/:id", upload.single("file"), controller.updateResource);

module.exports = router;