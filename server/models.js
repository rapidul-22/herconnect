import mongoose from "mongoose";
const { Schema, model } = mongoose;
const ref = (name, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required,
});
const schema = (fields) => new Schema(fields, { timestamps: true });
export const categories = [
  "Handicrafts",
  "Clothing",
  "Beauty",
  "Home",
  "Food",
  "Other",
];
const user = schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  isDemo: { type: Boolean, default: false },
  city: { type: String, default: "" },
  occupation: { type: String, default: "" },
  bio: { type: String, default: "" },
  bloodGroup: { type: String, default: "" },
  emergencyName: { type: String, default: "" },
  emergencyPhone: { type: String, default: "" },
  emergencyRelation: { type: String, default: "" },
  isAdmin: { type: Boolean, default: false },
  authVersion: { type: Number, default: 0 },
  wishlist: [ref("Product")],
  shop: {
    name: String,
    city: String,
    story: String,
    status: {
      type: String,
      enum: ["none", "pending", "approved", "rejected", "suspended"],
      default: "none",
    },
    reason: String,
  },
});
export const User = model("User", user);
const session = schema({
  tokenHash: { type: String, unique: true },
  user: ref("User"),
  authVersion: Number,
  csrfToken: String,
  expiresAt: Date,
});
session.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Session = model("Session", session);
const reset = schema({
  tokenHash: { type: String, unique: true },
  user: ref("User"),
  expiresAt: Date,
});
reset.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const PasswordReset = model("PasswordReset", reset);
const product = schema({
  seller: ref("User"),
  name: { type: String, required: true },
  description: String,
  category: { type: String, enum: categories, required: true },
  price: { type: Number, min: 1, required: true },
  stock: { type: Number, min: 0, max: 100000, required: true },
  image: String,
  materials: String,
  care: String,
  active: { type: Boolean, default: true },
  demoKey: { type: String, unique: true, sparse: true },
});
product.index({ seller: 1, active: 1 });
export const Product = model("Product", product);
const order = schema({
  buyer: ref("User"),
  seller: ref("User"),
  items: [
    {
      product: ref("Product"),
      name: String,
      image: String,
      unitPrice: Number,
      quantity: Number,
    },
  ],
  subtotal: Number,
  deliveryFee: Number,
  total: Number,
  shipping: { name: String, phone: String, address: String, city: String },
  status: {
    type: String,
    enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  history: [
    { status: String, at: Date, by: ref("User", false), reason: String },
  ],
  requestKey: { type: String, required: true },
  demoKey: { type: String, unique: true, sparse: true },
});
order.index({ buyer: 1, requestKey: 1 }, { unique: true });
order.index({ seller: 1, createdAt: -1 });
export const Order = model("Order", order);
const review = schema({
  buyer: ref("User"),
  product: ref("Product"),
  order: ref("Order"),
  rating: { type: Number, min: 1, max: 5 },
  comment: String,
  isDemo: { type: Boolean, default: false },
});
review.index({ buyer: 1, order: 1, product: 1 }, { unique: true });
export const Review = model("Review", review);
export const Audit = model(
  "Audit",
  schema({
    admin: ref("User"),
    seller: ref("User", false),
    product: ref("Product", false),
    action: String,
    reason: String,
  }),
);
export async function initModels() {
  await Promise.all(
    [User, Session, PasswordReset, Product, Order, Review, Audit].map((m) =>
      m.init(),
    ),
  );
}
