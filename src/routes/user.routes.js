import { Router } from "express";
import { LogoutUser, changeCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, refreshAccessToken, registerUser, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },{
        name: "coverImage",
        maxCount: 1
    }
]),
registerUser);

router.route('/login').post(loginUser);


//secured routes
router.route('/logout').post(verifyJWT, LogoutUser);

router.route('/refresh-token').post(refreshAccessToken);

router.route('/get-user').get(verifyJWT, getCurrentUser);

router.route('/change-password').post(verifyJWT, changeCurrentPassword);

router.route('/update-avatar').post(verifyJWT, upload.single("avatar"), updateUserAvatar);

router.route('/update-cover-image').post(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route('/get-channel').post(verifyJWT, getUserChannelProfile);

router.route('/watch-history').post(verifyJWT, getWatchHistory);

export default router;