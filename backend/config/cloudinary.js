import { v2 as cloudinary } from "cloudinary";

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export const connectCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    console.error(
      "Cloudinary is NOT configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
    return false;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  console.log(`Cloudinary ready (cloud: ${process.env.CLOUDINARY_CLOUD_NAME})`);
  return true;
};

/**
 * Upload a data URL, URL, or buffer to Cloudinary.
 * Returns the stable secure_url (res.cloudinary.com/...).
 */
export const uploadOnCloudinary = async (fileData, options = {}) => {
  if (!isCloudinaryConfigured()) {
    console.error("Cloudinary upload skipped: missing credentials");
    return null;
  }

  if (!fileData) return null;

  try {
    const uploadOptions = {
      resource_type: options.resource_type || "auto",
      overwrite: options.overwrite ?? true,
      invalidate: true,
      ...(options.folder ? { folder: options.folder } : {}),
      ...(options.public_id ? { public_id: options.public_id } : {}),
      ...(options.format ? { format: options.format } : {}),
    };

    let result;

    if (typeof fileData === "string") {
      result = await cloudinary.uploader.upload(fileData, uploadOptions);
    } else if (fileData instanceof Buffer) {
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
        stream.end(fileData);
      });
    } else {
      return null;
    }

    const secureUrl = result?.secure_url || result?.url || null;
    if (secureUrl) {
      console.log(
        `Cloudinary upload OK: ${result.resource_type}/${result.public_id} → ${secureUrl}`,
      );
    }
    return secureUrl;
  } catch (error) {
    console.error(
      "Cloudinary upload failed:",
      error?.message || error,
      error?.http_code ? `(HTTP ${error.http_code})` : "",
    );
    return null;
  }
};

export default uploadOnCloudinary;
