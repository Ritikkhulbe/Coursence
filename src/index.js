import dotenv from "dotenv";
import { DB_NAME } from "./constants.js";
import { connectDB } from "./db/index.js";


connectDB();