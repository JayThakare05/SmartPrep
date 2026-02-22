const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    subFolder: {
      type: String,
      default: "",
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    fileType: {
      type: String,
      default: "pdf",
    },
  },
  { timestamps: true }
);

resourceSchema.index({ subject: 1 });
resourceSchema.index({ subFolder: 1 });
resourceSchema.index({ title: "text" });

module.exports = mongoose.model("Resource", resourceSchema);