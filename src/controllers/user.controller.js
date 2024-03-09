import asyncHandler from '../utils/asyncHandler.js';
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { User } from "../models/user.model.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from 'mongoose';

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    } catch (error) {
        throw new apiError(500, "Something went wring while generating Tokens")
    }
}

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
    
    let coverImageLocalPath = "";
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


const loginUser = asyncHandler( async(req, res)=> {
    //get details from frontend
    const {username, password, email} = req.body;

    //validate username || email
    if(!(username || email)) throw new apiError(400, "username or email is required");

    //find user
    const user = await User.findOne({$or: [{username}, {email}]});

    if(!user) throw new apiError(404, "User doesn't exist");

    //check password
    const isPasswordValid = await user.isPasswordCorrect(password);
    
    if(!isPasswordValid) throw new apiError(401, "Incorrect Password");

    //access && refreshToken

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);
    
    //take new updated user after creating tokens
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    
    //send cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    //return res
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(200, { user: loggedInUser, accessToken, refreshToken}, "User logged in successful")
    );

})

const LogoutUser = asyncHandler( async(req, res) => {

    //find user in db
    await User.findByIdAndUpdate(
        req.user._id,
        {
            //removeCookie from db
            $set: {
                refreshToken: undefined
            }
        },{
            new: true
        }
    )
    //clear cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    //return res
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out"));
    


})

const refreshAccessToken = asyncHandler( async(req, res) => {

    try {
        
        const token = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ", "");
        
        if(!token) throw new apiError(401, "Unauthorized request");
    
        const decode = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decode?._id);

        if(!user) throw new apiError(401, "Invalid refresh token");

        if(token !== user?.refreshToken) throw new apiError(401, "Refresh token is expired or used");

        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        //return res
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(200, { accessToken, refreshToken}, "Access Token Refreshed")
        );
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid Refresh Token");
    }
});

const changeCurrentPassword = asyncHandler( async(req,res)=> {
    const {oldPassword, newPassword} = req.body;
    console.log(oldPassword);
    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect) throw new apiError(403, "Invalid Old Password");

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res.status(200).json(new apiResponse(200,{}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async(req,res) => {
    const currentUser = req.user;

    if(!currentUser) throw new apiError(404, "No current user found");

    return res.status(200).json(new apiResponse(200, currentUser, "Fetched current user"));
});

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path;
    
    if(!avatarLocalPath) throw new apiError(401, "Avatar file missing");
   
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url) throw new apiError(501, "File not uploaded on cloudinary");

    const currentImage = req.user.avatar;

    const deleteCurrentUser = await deleteFromCloudinary(currentImage);

    if(!deleteCurrentUser){
        console.log("file not deleted from cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            }
        },
        {
            new:true,
        }
    ).select("-password");

    return res.status(200).json(new apiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async(req,res) => {
    const CoverImageLocalPath = req.file?.path;
    
    if(!CoverImageLocalPath) throw new apiError(401, "Cover Image file missing");
   
    const coverImage = await uploadOnCloudinary(CoverImageLocalPath);

    if(!coverImage.url) throw new apiError(501, "File not uploaded on cloudinary");

    const currentImage = req.user.coverImage;

    const deleteCurrentUser = await deleteFromCloudinary(currentImage);

    if(!deleteCurrentUser){
        console.log("file not deleted from cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            }
        },
        {
            new:true,
        }
    ).select("-password");

    return res.status(200).json(new apiResponse(200, user, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params;

    if(!username) throw new apiError(404, "username not given");

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },{
            $lookup: {
                from: "subcriptions",
                localField: "_id",
                foreignField: "creator",
                as: "subcribers"
            }
        },{
            $lookup: {
                from: "subcriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subcribedTo"
            }
        },{
            $addFields: {
                subcribersCount: {
                    $size: "$subcribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subcribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },{
            $project: {
                fullname: 1,
                username: 1,
                subcribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ]);

    console.log(channel);

    if(!channel.lenght) throw new apiError(404, "channel does not exist");

    return res.status(200)
    .json(new apiResponse(200, channel[0], "User channel fetched successfully"))
})

const getWatchHistory = asyncHandler( async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId('req.user._id')
            }
        },{
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [{
                                $project: {
                                    fullname: 1,
                                    username: 1,
                                    avatar: 1,
                                }
                            }]
                        }
                    },{
                        $lookup: {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res.status(200)
    .json(new apiResponse(200, user[0].watchHistory, "Watch histroy fetched successfully"))
})

export {registerUser, loginUser, LogoutUser, refreshAccessToken, changeCurrentPassword, 
     getCurrentUser, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory};