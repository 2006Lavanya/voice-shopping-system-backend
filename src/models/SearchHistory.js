import mongoose from "mongoose";

const searchHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    query: { type: String, required: true },
    source: { type: String, enum: ["TEXT", "VOICE"], default: "TEXT" },
  },
  { timestamps: true }
);

export default mongoose.model("SearchHistory", searchHistorySchema);
