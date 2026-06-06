import { v2 as cloudinary } from "cloudinary";

const connectCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

const uploadOnCloudinary = async (fileData) => {
  try {
    if (!fileData) return null;

    // Handle data URLs (base64)
    if (typeof fileData === "string" && fileData.startsWith("data:")) {
      const result = await cloudinary.uploader.upload(fileData, {
        resource_type: "auto",
      });
      return result.secure_url || result.url;
    }

    // Handle Buffer or file path
    if (typeof fileData === "string") {
      const result = await cloudinary.uploader.upload(fileData, {
        resource_type: "auto",
      });
      return result.secure_url || result.url;
    }

    if (fileData instanceof Buffer) {
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "auto" },
          (err, res) => {
            if (err) reject(err);
            resolve(res.secure_url || res.url);
          }
        );
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