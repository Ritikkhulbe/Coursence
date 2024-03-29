import { v2 as cloudinary } from "cloudinary";
import fs from "fs";


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET, 
  timeout: 30000
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        const res = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        fs.unlinkSync(localFilePath);
        return res;
    } catch (error) {
        console.log("Removed the locally saved file as upload failed", error);
        fs.unlinkSync(localFilePath);
        return null;
    }
}


const deleteFromCloudinary = async (imageUrl) => {
    try {
      if (!imageUrl) return null;

      const publicId = imageUrl.replace(/.*\/v\d+\/(.*)\..*/, '$1');
  
      const res = await cloudinary.api.delete_resources_by_prefix(publicId, {
        resource_type: "image"
      });
  
      return res;
    } 
    catch (error) {

      console.log("Error deleting image from Cloudinary", error);
      return null;
    }
  };
  
  export { uploadOnCloudinary, deleteFromCloudinary };