import mongoose from "mongoose";
import { memberAttachmentsFieldKey } from "./memberFolder.js";

/** Move legacy `attachments` arrays to `{firstName}_{lastName}_attachments`. */
export async function migrateLegacyAttachmentFields() {
  if (mongoose.connection.readyState !== 1) return 0;

  const collection = mongoose.connection.collection("members");
  const cursor = collection.find({
    attachments: { $exists: true, $type: "array" },
  });

  let migrated = 0;

  for await (const doc of cursor) {
    const key = memberAttachmentsFieldKey(doc.firstName, doc.lastName);
    const legacy = Array.isArray(doc.attachments) ? doc.attachments : [];
    const update = { $unset: { attachments: "" } };

    if (legacy.length > 0 && (!Array.isArray(doc[key]) || doc[key].length === 0)) {
      update.$set = { [key]: legacy };
    }

    await collection.updateOne({ _id: doc._id }, update);
    migrated += 1;
  }

  if (migrated > 0) {
    console.log(`✓ Migrated attachment field on ${migrated} member(s)`);
  }

  return migrated;
}
