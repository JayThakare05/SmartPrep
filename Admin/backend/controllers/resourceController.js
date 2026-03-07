const Resource   = require("../models/Resource");
const cloudinary = require("../config/cloudinary");

// helper — every query must be scoped to an examType
// ─────────────────────────────────────────────────────────────
const requireExam = (req, res) => {
  const exam = req.query.examType || req.body.examType;
  if (!exam) {
    res.status(400).json({ message: "examType is required (UPSC | MPSC)." });
    return null;
  }
  return exam.toUpperCase();
};

// ─────────────────────────────────────────
// GET ALL RESOURCES
// ─────────────────────────────────────────
exports.getAllResources = async (req, res) => {
  try {
    const exam = requireExam(req, res);
    if (!exam) return;

    const { subject, subFolder, search } = req.query;
    const filter = {
      examType: exam,
      fileType: { $ne: "placeholder" },
    };
    if (subject)   filter.subject   = subject;
    if (subFolder) filter.subFolder = subFolder;
    if (search)    filter.title     = { $regex: search.trim(), $options: "i" };

    const resources = await Resource.find(filter).sort({ updatedAt: -1 });
    res.json(resources);
  } catch (err) {
    console.error("getAllResources Error:", err);
    res.status(500).json({ error: err.message });
  }
};


// ─────────────────────────────────────────
// GET DISTINCT SUBJECTS
// ─────────────────────────────────────────
exports.getSubjects = async (req, res) => {
  try {
    const exam = requireExam(req, res);
    if (!exam) return;

    const subjects = await Resource.distinct("subject", { examType: exam });
    res.json(subjects.filter(s => s && !s.startsWith("__")).sort());
  } catch (err) {
    console.error("getSubjects Error:", err);
    res.status(500).json({ error: err.message });
  }
};


// ─────────────────────────────────────────
// GET SUBFOLDERS FOR A SUBJECT
// ─────────────────────────────────────────
exports.getSubfolders = async (req, res) => {
  try {
    const exam = requireExam(req, res);
    if (!exam) return;

    const { subject } = req.query;
    const filter = { examType: exam };
    if (subject) filter.subject = subject;

    const subfolders = await Resource.distinct("subFolder", filter);
    res.json(subfolders.filter(s => s && !s.startsWith("__")).sort());
  } catch (err) {
    console.error("getSubfolders Error:", err);
    res.status(500).json({ error: err.message });
  }
};
// ─────────────────────────────────────────
// CREATE SUBJECT (placeholder doc)
// ─────────────────────────────────────────
exports.createSubject = async (req, res) => {
  try {
    const { subject, examType } = req.body;
    const exam = examType?.toUpperCase();

    if (!exam)           return res.status(400).json({ message: "examType is required." });
    if (!subject?.trim()) return res.status(400).json({ message: "Subject name is required." });

    const exists = await Resource.findOne({ examType: exam, subject: subject.trim() });
    if (exists)
      return res.status(409).json({ message: `Subject '${subject.trim()}' already exists in ${exam}.` });

    await Resource.create({
      examType:  exam,
      title:     `__placeholder_${exam}_${subject.trim()}`,
      subject:   subject.trim(),
      subFolder: subject.trim(),
      fileType:  "placeholder",
    });

    res.status(201).json({ message: `Subject '${subject.trim()}' created in ${exam}.` });
  } catch (err) {
    console.error("createSubject Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────
// CREATE SUBFOLDER (placeholder doc)
// ─────────────────────────────────────────
exports.createSubfolder = async (req, res) => {
  try {
    const { subject, subFolder, examType } = req.body;
    const exam = examType?.toUpperCase();

    if (!exam)              return res.status(400).json({ message: "examType is required." });
    if (!subject?.trim() || !subFolder?.trim())
      return res.status(400).json({ message: "Subject and subfolder are required." });

    const fullPath = `${subject.trim()}/${subFolder.trim()}`;
    const exists   = await Resource.findOne({ examType: exam, subFolder: fullPath });
    if (exists)
      return res.status(409).json({ message: `Subfolder '${fullPath}' already exists in ${exam}.` });

    await Resource.create({
      examType:  exam,
      title:     `__placeholder_${exam}_${fullPath}`,
      subject:   subject.trim(),
      subFolder: fullPath,
      fileType:  "placeholder",
    });

    res.status(201).json({ message: `Subfolder '${fullPath}' created in ${exam}.` });
  } catch (err) {
    console.error("createSubfolder Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────
// DELETE SUBJECT
// Blocked if any real PDFs exist under it
// ─────────────────────────────────────────
exports.deleteSubject = async (req, res) => {
  try {
    const exam = requireExam(req, res);
    if (!exam) return;

    const { subject } = req.query;
    if (!subject?.trim()) return res.status(400).json({ message: "Subject is required." });

    const pdfCount = await Resource.countDocuments({
      examType: exam,
      subject:  subject.trim(),
      fileType: { $ne: "placeholder" },
    });

    if (pdfCount > 0) {
      return res.status(409).json({
        blocked: true,
        message: `Cannot delete — "${subject}" contains ${pdfCount} PDF file(s). Remove them first.`,
        count: pdfCount,
      });
    }

    await Resource.deleteMany({ examType: exam, subject: subject.trim(), fileType: "placeholder" });
    res.json({ message: `Subject "${subject}" deleted from ${exam}.` });
  } catch (err) {
    console.error("deleteSubject Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE SUBFOLDER
// Blocked if any real PDFs exist inside it
// ─────────────────────────────────────────
exports.deleteSubfolder = async (req, res) => {
  try {
    const exam = requireExam(req, res);
    if (!exam) return;

    const { subject, subFolder } = req.query;
    if (!subject?.trim() || !subFolder?.trim())
      return res.status(400).json({ message: "Subject and subFolder are required." });

    const pdfCount = await Resource.countDocuments({
      examType:  exam,
      subject:   subject.trim(),
      subFolder: subFolder.trim(),
      fileType:  { $ne: "placeholder" },
    });

    if (pdfCount > 0) {
      return res.status(409).json({
        blocked: true,
        message: `Cannot delete — "${subFolder}" contains ${pdfCount} PDF file(s). Remove them first.`,
        count: pdfCount,
      });
    }

    await Resource.deleteMany({
      examType:  exam,
      subject:   subject.trim(),
      subFolder: subFolder.trim(),
      fileType:  "placeholder",
    });
    res.json({ message: `Subfolder "${subFolder}" deleted from ${exam}.` });
  } catch (err) {
    console.error("deleteSubfolder Error:", err);
    res.status(500).json({ error: err.message });
  }
};


// ─────────────────────────────────────────
// UPLOAD NEW RESOURCE
// ─────────────────────────────────────────
exports.uploadResource = async (req, res) => {
  try {
    const { subject, subFolder, examType } = req.body;
    const exam = examType?.toUpperCase();

    if (!exam)    return res.status(400).json({ message: "examType is required." });
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    const originalName = req.file.originalname.replace(/\.pdf$/i, "").trim();

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder:        `${exam.toLowerCase()}_resources/${subFolder}`,
        public_id:     originalName,
        overwrite:     true,
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);
          return res.status(500).json({ error: error.message });
        }

        const existing = await Resource.findOne({ publicId: result.public_id });
        if (existing) {
          existing.fileUrl   = result.secure_url;
          existing.fileSize  = result.bytes;
          existing.subject   = subject;
          existing.subFolder = subFolder;
          existing.title     = originalName;
          existing.examType  = exam;
          await existing.save();
          return res.status(200).json({ updated: true, resource: existing });
        }

        const newResource = await Resource.create({
          examType:  exam,
          title:     originalName,
          subject,
          subFolder,
          fileUrl:   result.secure_url,
          publicId:  result.public_id,
          fileSize:  result.bytes,
          fileType:  "pdf",
        });
        return res.status(201).json({ updated: false, resource: newResource });
      }
    );

    stream.end(req.file.buffer);
  } catch (err) {
    console.error("uploadResource Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────
// DELETE RESOURCE  (Cloudinary + MongoDB)
// ─────────────────────────────────────────
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found." });

    await cloudinary.uploader.destroy(resource.publicId, { resource_type: "raw" });
    await resource.deleteOne();
    res.json({ message: "Deleted successfully." });
  } catch (err) {
    console.error("deleteResource Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────
// REPLACE / UPDATE RESOURCE FILE
// ─────────────────────────────────────────
exports.updateResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found." });
    if (!req.file)  return res.status(400).json({ message: "No file uploaded." });

    await cloudinary.uploader.destroy(resource.publicId, { resource_type: "raw" });

    const originalName = req.file.originalname.replace(/\.pdf$/i, "").trim();

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder:        `${resource.examType.toLowerCase()}_resources/${resource.subFolder}`,
        public_id:     originalName,
        overwrite:     true,
      },
      async (error, result) => {
        if (error) return res.status(500).json({ error: error.message });
        resource.title    = originalName;
        resource.fileUrl  = result.secure_url;
        resource.publicId = result.public_id;
        resource.fileSize = result.bytes;
        await resource.save();
        return res.json(resource);
      }
    );
    stream.end(req.file.buffer);
  } catch (err) {
    console.error("updateResource Error:", err);
    res.status(500).json({ error: err.message });
  }
};
