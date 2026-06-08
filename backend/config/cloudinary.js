import { v2 as cloudinary } from "cloudinary";

const connectCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

const uploadOnCloudinary = async (fileData, options = {}) => {
  try {
    if (!fileData) return null;

    const uploadOptions = {
      resource_type: options.resource_type || "auto",
      ...(options.folder ? { folder: options.folder } : {}),
      ...(options.public_id ? { public_id: options.public_id, overwrite: true } : {}),
    };

    if (typeof fileData === "string" && fileData.startsWith("data:")) {
      const result = await cloudinary.uploader.upload(fileData, uploadOptions);
      return result.secure_url || result.url;
    }

    if (typeof fileData === "string") {
      const result = await cloudinary.uploader.upload(fileData, uploadOptions);
      return result.secure_url || result.url;
    }

    if (fileData instanceof Buffer) {
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, res) => {
          if (err) reject(err);
          else resolve(res?.secure_url || res?.url || null);
        });
        stream.end(fileData);
      });
    }

    return null;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error.message);
    return null;
  }
};

export { connectCloudinary, uploadOnCloudinary };
export default uploadOnCloudinary;
