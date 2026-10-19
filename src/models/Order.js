import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    products: [orderItemSchema],
    shippingAddress: {
      fullName: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },
    paymentMethod: { type: String, enum: ["COD", "UPI", "CARD", "ONLINE"], required: true },
    paymentStatus: { type: String, enum: ["PENDING", "SUCCESS", "FAILED", "CANCELLED"], default: "PENDING" },
    orderStatus: {
      type: String,
      enum: ["Placed", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Placed",
    },
    statusHistory: [
      {
        status: String,
        date: { type: Date, default: Date.now },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true, default: 0 },
    shippingFee: { type: Number, required: true, default: 0 },
    discount: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true },
    couponCode: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
