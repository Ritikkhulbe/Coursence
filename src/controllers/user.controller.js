import asyncHandler from '../utils/asyncHandler.js';
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler( async(req, res) => {
    //get details from frontend
    const {username, fullname, email, password } = req.body;

    //validation
    if([username, fullname, email, password].some((field)=>
        field?.trim() == ""
    )){
        throw new apiError(400, "All field is required");
    }
    
    //already exists:username & email
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser){
        throw new apiError(409, "Username or email already exists");
    }

    //check avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    
    let coverImageLocalPath;
    if(Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
        coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) throw new apiError(400, "Avatar file is required");
    
    //save to cloudinary, avatar check
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar) throw new apiError(400, "Avatar file is required 2");
    //create user object - create entry in db
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    //check for user creation
    if(!createdUser) throw new apiError(500, "Something went wrong while creating user");
    
    //return res
    return res.status(201).json(
        new apiResponse(200, createdUser, "User created successfully")
    );
});



export {registerUser};