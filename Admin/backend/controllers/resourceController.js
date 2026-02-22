const Resource = require("../models/Resource");
const cloudinary = require("../config/cloudinary");


// ✅ GET ALL
exports.getAllResources = async (req, res) => {
  try {
    console.log("hii")
    const resources = await Resource.find().sort({ createdAt: -1 });
    res.json(resources);
    console.log(resources)
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
};


// ✅ UPLOAD
exports.uploadResource = async (req, res) => {
  try {
    const { subject, subFolder } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: `upsc_resources/${subFolder}`,
      },
      async (error, uploadResult) => {
        if (error) {
          console.error("Cloudinary Error:", error);
          return res.status(500).json({ error: error.message });
        }

        const newResource = await Resource.create({
          title: uploadResult.original_filename,
          subject,
          subFolder,
          fileUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          fileSize: uploadResult.bytes,
        });

        return res.status(201).json(newResource);
      }
    );

    stream.end(req.file.buffer);

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: err.message });
  }
};


// ✅ DELETE
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    await cloudinary.uploader.destroy(resource.publicId, {
      resource_type: "raw",
    });

    await resource.deleteOne();

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: err.message });
  }
};


// ✅ UPDATE (Replace File)
exports.updateResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Delete old file
    await cloudinary.uploader.destroy(resource.publicId, {
      resource_type: "raw",
    });

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: `upsc_resources/${resource.subFolder}`,
      },
      async (error, uploadResult) => {
        if (error) {
          console.error("Cloudinary Error:", error);
          return res.status(500).json({ error: error.message });
        }

        resource.fileUrl = uploadResult.secure_url;
        resource.publicId = uploadResult.public_id;
        resource.fileSize = uploadResult.bytes;

        await resource.save();

        return res.json(resource);
      }
    );

    stream.end(req.file.buffer);

  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ error: err.message });
  }
};