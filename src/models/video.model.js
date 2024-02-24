import { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = Schema({
    videoFile: {
        type: String, //url
        required: true,
    },
    thumbnail: {
        type: String, //url
        required: true,
    },
    title: {
        type: String, 
        required: true,
    },
    description: {
        type: String, 
        required: true,
    },
    duration: {
        type: Number, //Cloudianry 
        required: true,
    },
    views: {
        type: Number,
        default: 0,
    },
    isPulished: {
        type: Boolean,
        default: true,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true});

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = model("Video", videoSchema);