import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    discountPrice: { type: Number, default: null },
    category: { type: String, required: true, index: true },
    brand: { type: String, required: true, index: true },
    images: [{ type: String, required: true }],
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    stock: { type: Number, required: true, default: 0 },
    specifications: { type: Map, of: String, default: {} },
    colors: [{ type: String }],
    sizes: [{ type: String }],
    tags: [{ type: String }],
    featured: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", brand: "text", tags: "text" });

export default mongoose.model("Product", productSchema);
