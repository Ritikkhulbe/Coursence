import { v2 as cloudinary } from "cloudinary";
import { response } from "express";
import fs from "fs";


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET, 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        const res = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        console.log("file is uploaded on cloudinary", res.url);
        return response;
    } catch (error) {
        console.log("Removed the locally saved file as upload failed");
        fs.unlinkSync(localFilePath);
        return null;
    }
}

export {uploadOnCloudinary};