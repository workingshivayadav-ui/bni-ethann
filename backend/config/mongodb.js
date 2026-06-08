import mongoose from "mongoose";

const DEFAULT_DB = "bniethan";

function getDbName(uri) {
  const match = uri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/);
  return match?.[1] || DEFAULT_DB;
}

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("✓ Database Connected");
    });

    mongoose.connection.on("disconnected", () => {
      console.log("✗ Database Disconnected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("✗ Database Error:", err.message);
    });

    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      console.warn("⚠ MONGODB_URI not provided - using in-memory fallback");
      return;
    }

    const dbName = getDbName(mongoURI);
    const options = {
      serverSelectionTimeoutMS: 10000,
      dbName,
    };

    // Railway/local root user connections need authSource=admin
    if (!mongoURI.startsWith("mongodb+srv") && !mongoURI.includes("authSource=")) {
      options.authSource = "admin";
    }

    await mongoose.connect(mongoURI, options);
    console.log(`✓ MongoDB connected — database: ${mongoose.connection.db?.databaseName ?? dbName}`);

    const { migrateLegacyAttachmentFields } = await import(
      "../lib/migrateAttachments.js"
    );
    await migrateLegacyAttachmentFields();
  } catch (error) {
    console.warn("⚠ MongoDB Connection Failed - using in-memory fallback:", error.message);
    await mongoose.disconnect().catch(() => {});
  }
};

export default connectDB;
