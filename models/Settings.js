import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
    name: { type: String, default: "ReviewQeem" },
    description: { type: String, default: "" },
    logo: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("Settings", settingsSchema);
