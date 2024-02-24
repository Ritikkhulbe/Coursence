import dotenv from "dotenv";
import { connectDB } from "./db/index.js";




connectDB().then(()=>{
    app.listen(process.env.PORT || 4000, ()=>{
        console.log(`Server is running on port ${process.env.PORT}`);
    })
})
.error((err) => {
    console.log("Mongo DB connection failed")
});