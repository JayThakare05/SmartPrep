require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Resource = require("../models/Resource");

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    // Count how many docs are missing examType
    const total = await Resource.countDocuments({
      examType: { $exists: false },
    });
    console.log(`📦 Found ${total} documents without examType`);

    if (total === 0) {
      console.log("✅ Nothing to migrate. All documents already have examType.");
      process.exit(0);
    }

    // Set examType: "UPSC" on every doc that doesn't have it yet
    const result = await Resource.updateMany(
      { examType: { $exists: false } },
      { $set: { examType: "UPSC" } }
    );

    console.log(`✅ Migration complete — ${result.modifiedCount} documents updated to examType: "UPSC"`);

    // Verify
    const remaining = await Resource.countDocuments({ examType: { $exists: false } });
    console.log(`🔍 Remaining docs without examType: ${remaining}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
};

migrate();