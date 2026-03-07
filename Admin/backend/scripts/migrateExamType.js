/**
 * Migration: Add examType to all existing resources that are missing it.
 * - publicId starts with "upsc_resources/" → examType = "UPSC"
 * - publicId starts with "mpsc_resources/" → examType = "MPSC"
 * - no publicId / unknown prefix → examType = "UPSC" (default, since all current data is UPSC)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Resource = require("../models/Resource");

async function migrate() {
  await mongoose.connect(process.env.ATLAS_MONGO_URI);
  console.log("✅ Connected to MongoDB Atlas");

  // Count docs missing examType
  const missing = await Resource.countDocuments({
    $or: [{ examType: { $exists: false } }, { examType: null }, { examType: "" }],
  });
  console.log(`📦 Documents missing examType: ${missing}`);

  if (missing === 0) {
    console.log("✅ Nothing to migrate. All documents already have examType.");
    process.exit(0);
  }

  // Set UPSC for upsc_resources/ prefix
  const upscResult = await Resource.updateMany(
    {
      publicId: { $regex: /^upsc_resources\//i },
      $or: [{ examType: { $exists: false } }, { examType: null }, { examType: "" }],
    },
    { $set: { examType: "UPSC" } }
  );
  console.log(`✅ Set examType=UPSC on ${upscResult.modifiedCount} documents`);

  // Set MPSC for mpsc_resources/ prefix
  const mpscResult = await Resource.updateMany(
    {
      publicId: { $regex: /^mpsc_resources\//i },
      $or: [{ examType: { $exists: false } }, { examType: null }, { examType: "" }],
    },
    { $set: { examType: "MPSC" } }
  );
  console.log(`✅ Set examType=MPSC on ${mpscResult.modifiedCount} documents`);

  // Catch-all: anything still missing examType → default to UPSC
  const fallback = await Resource.updateMany(
    { $or: [{ examType: { $exists: false } }, { examType: null }, { examType: "" }] },
    { $set: { examType: "UPSC" } }
  );
  if (fallback.modifiedCount > 0) {
    console.log(`⚠️  Defaulted ${fallback.modifiedCount} unknown documents to UPSC`);
  }

  const total = upscResult.modifiedCount + mpscResult.modifiedCount + fallback.modifiedCount;
  console.log(`\n🎉 Migration complete! Total updated: ${total} documents`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});