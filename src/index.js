import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./db/index.js";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();


connectDB().then(()=>{
    app.listen(process.env.PORT || 4000, ()=>{
        console.log(`Server is running on port ${process.env.PORT}`);
    })
})
.error((err) => {
    console.log("Mongo DB connection failed")
});