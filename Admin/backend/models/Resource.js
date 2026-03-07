const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    examType: {
      type: String,
      required: true,
      trim: true,
      enum: ["UPSC", "MPSC"],
    },
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
      required: function () { return this.fileType !== "placeholder"; },
      default: "",
    },
    publicId: {
      type: String,
      required: function () { return this.fileType !== "placeholder"; },
      unique: true,
      sparse: true,
    },
    fileSize: {
      type: Number,
      required: function () { return this.fileType !== "placeholder"; },
      default: 0,
    },
    fileType: {
      type: String,
      default: "pdf",
      enum: ["pdf", "placeholder"],
    },
  },
  { timestamps: true }
);

resourceSchema.index({ examType: 1 });
resourceSchema.index({ examType: 1, subject: 1 });
resourceSchema.index({ examType: 1, subFolder: 1 });
resourceSchema.index({ title: "text" });

module.exports = mongoose.model("Resource", resourceSchema);