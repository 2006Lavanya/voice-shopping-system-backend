import mongoose from "mongoose";

// Abstraction layer for payments - works in mock/sandbox mode when no gateway keys are configured
const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    method: { type: String, enum: ["COD", "UPI", "CARD", "ONLINE"], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED", "CANCELLED"], default: "PENDING" },
    transactionId: { type: String, default: "" },
    isMock: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
