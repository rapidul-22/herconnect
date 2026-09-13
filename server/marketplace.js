import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { User, Product, Order, Review, Audit, categories } from "./models.js";
import {
  requireAuth,
  member,
  seller,
  admin,
  fail,
  phone,
  publicUser,
} from "./auth.js";

export const marketplace = Router();
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record ID.");
const text = (min, max) => z.string().trim().min(min).max(max);
const productFields = {
  name: text(3, 120),
  description: text(20, 3000),
  category: z.enum(categories),
  price: z.number().int().min(100).max(100000000),
  image: z
    .string()
    .regex(
      /^\/(?:images\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)|uploads\/[a-f0-9-]+\.jpg)$/,
      "Upload a product image.",
    ),
  materials: text(2, 300),
  care: text(2, 500),
  active: z.boolean().default(true),
};
const same = (a, b) => String(a) === String(b);
const pageValue = (value) =>
  z.coerce.number().int().min(1).max(10000).default(1).parse(value);
const safeSeller = (u) => ({
  _id: u._id,
  name: u.name,
  shop: {
    name: u.shop.name,
    city: u.shop.city,
    story: u.shop.story,
    status: u.shop.status,
  },
});
const approvedIds = async () =>
  (
    await User.find({ "shop.status": "approved", isAdmin: false }).select("_id")
  ).map((u) => u._id);
async function ratings(products) {
  const scores = await Review.aggregate([
    { $match: { product: { $in: products.map((p) => p._id) } } },
    {
      $group: {
        _id: "$product",
        rating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);
  const lookup = new Map(scores.map((s) => [String(s._id), s]));
  return products.map((p) => ({
    ...p,
    rating: lookup.get(String(p._id))?.rating || 0,
    reviewCount: lookup.get(String(p._id))?.reviewCount || 0,
  }));
}
marketplace.get("/products", async (req, res) => {
  const page = pageValue(req.query.page);
  const query = { active: true, seller: { $in: await approvedIds() } };
  if (req.query.q) {
    const q = text(1, 80).parse(req.query.q);
    query.name = {
      $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }
  if (req.query.category)
    query.category = z.enum(categories).parse(req.query.category);
  if (req.query.maxPrice)
    query.price = {
      $lte: z.coerce
        .number()
        .int()
        .min(100)
        .max(100000000)
        .parse(req.query.maxPrice),
    };
  const sort = {
    newest: { createdAt: -1 },
    "price-asc": { price: 1, _id: 1 },
    "price-desc": { price: -1, _id: 1 },
    name: { name: 1 },
  }[req.query.sort || "newest"];
  if (!sort) fail(400, "Unknown sort option.");
  const [products, total] = await Promise.all([
    Product.find(query)
      .sort(sort)
      .skip((page - 1) * 12)
      .limit(12)
      .populate("seller", "name shop")
      .lean(),
    Product.countDocuments(query),
  ]);
  res.json({
    products: await ratings(
      products.map((p) => ({ ...p, seller: safeSeller(p.seller) })),
    ),
    total,
    page,
    pages: Math.ceil(total / 12),
  });
});
marketplace.get("/products/:id", async (req, res) => {
  const product = await Product.findOne({
    _id: id.parse(req.params.id),
    active: true,
    seller: { $in: await approvedIds() },
  })
    .populate("seller", "name shop")
    .lean();
  if (!product) fail(404, "This product is unavailable.");
  const reviews = await Review.find({ product: product._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("buyer", "name")
    .lean();
  const [result] = await ratings([
    { ...product, seller: safeSeller(product.seller) },
  ]);
  res.json({
    ...result,
    reviews: reviews.map((r) => ({
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      isDemo: r.isDemo,
      createdAt: r.createdAt,
      name: r.buyer?.name || "Member",
    })),
  });
});
marketplace.get("/shops/:id", async (req, res) => {
  const user = await User.findOne({
    _id: id.parse(req.params.id),
    "shop.status": "approved",
    isAdmin: false,
  });
  if (!user) fail(404, "This shop is unavailable.");
  const products = await Product.find({ seller: user._id, active: true })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({
    seller: safeSeller(user),
    products: await ratings(
      products.map((p) => ({ ...p, seller: safeSeller(user) })),
    ),
  });
});
marketplace.get("/wishlist", requireAuth, member, async (req, res) => {
  const products = await Product.find({
    _id: { $in: req.user.wishlist },
    active: true,
    seller: { $in: await approvedIds() },
  })
    .populate("seller", "name shop")
    .lean();
  res.json(
    await ratings(
      products.map((p) => ({ ...p, seller: safeSeller(p.seller) })),
    ),
  );
});
marketplace.post("/wishlist/:id", requireAuth, member, async (req, res) => {
  const productId = id.parse(req.params.id);
  const saved = req.user.wishlist.some((v) => same(v, productId));
  if (
    !saved &&
    !(await Product.exists({
      _id: productId,
      active: true,
      seller: { $in: await approvedIds() },
    }))
  )
    fail(404, "Product is unavailable.");
  const user = await User.findByIdAndUpdate(
    req.user._id,
    saved
      ? { $pull: { wishlist: productId } }
      : { $addToSet: { wishlist: productId } },
    { new: true },
  );
  res.json({ wishlist: user.wishlist });
});
marketplace.post("/seller/apply", requireAuth, member, async (req, res) => {
  const data = z
    .object({ name: text(3, 80), city: text(2, 80), story: text(30, 1000) })
    .parse(req.body);
  if (["pending", "approved", "suspended"].includes(req.user.shop.status))
    fail(409, "Your shop already has an application or an active restriction.");
  req.user.shop = { ...data, status: "pending", reason: "" };
  await req.user.save();
  res.status(201).json(publicUser(req.user));
});
marketplace.get("/seller/products", requireAuth, seller, async (req, res) =>
  res.json(
    await Product.find({ seller: req.user._id }).sort({ createdAt: -1 }).lean(),
  ),
);
marketplace.post("/seller/products", requireAuth, seller, async (req, res) => {
  const data = z
    .object({ ...productFields, stock: z.number().int().min(0).max(100000) })
    .parse(req.body);
  const product = await Product.create({ ...data, seller: req.user._id });
  res.status(201).json(product);
});
marketplace.patch(
  "/seller/products/:id",
  requireAuth,
  seller,
  async (req, res) => {
    const { stockDelta, ...data } = z
      .object({
        ...productFields,
        stockDelta: z.number().int().min(-100000).max(100000).default(0),
      })
      .parse(req.body);
    const product = await Product.findOneAndUpdate(
      {
        _id: id.parse(req.params.id),
        seller: req.user._id,
        stock: {
          $gte: Math.max(0, -stockDelta),
          $lte: 100000 - Math.max(0, stockDelta),
        },
      },
      { $set: data, $inc: { stock: stockDelta } },
      { new: true, runValidators: true },
    );
    if (!product)
      fail(
        409,
        "Product not found or stock changed. Refresh and check your stock adjustment.",
      );
    res.json(product);
  },
);
marketplace.delete(
  "/seller/products/:id",
  requireAuth,
  seller,
  async (req, res) => {
    const product = await Product.findOneAndUpdate(
      { _id: id.parse(req.params.id), seller: req.user._id },
      { $set: { active: false } },
      { new: true },
    );
    if (!product) fail(404, "Product not found.");
    res.json(product);
  },
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
marketplace.post(
  "/seller/uploads",
  requireAuth,
  seller,
  upload.single("image"),
  async (req, res) => {
    if (
      !req.file ||
      !["image/jpeg", "image/png", "image/webp"].includes(req.file.mimetype)
    )
      fail(400, "Choose a JPEG, PNG or WebP image.");
    const filename = randomUUID() + ".jpg";
    try {
      await sharp(req.file.buffer, { limitInputPixels: 25000000 })
        .rotate()
        .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(
          fileURLToPath(new URL(`./uploads/${filename}`, import.meta.url)),
        );
    } catch {
      fail(
        400,
        "This image could not be read. Choose a valid image under 25 megapixels.",
      );
    }
    res.status(201).json({ image: `/uploads/${filename}` });
  },
);
const shippingSchema = z.object({
  name: text(2, 80),
  phone,
  address: text(10, 400),
  city: text(2, 80),
});
marketplace.post("/orders", requireAuth, member, async (req, res) => {
  const data = z
    .object({
      items: z
        .array(
          z.object({
            productId: id,
            quantity: z.number().int().min(1).max(50),
          }),
        )
        .min(1)
        .max(30),
      shipping: shippingSchema,
      requestKey: z.uuid(),
    })
    .parse(req.body);
  if (new Set(data.items.map((i) => i.productId)).size !== data.items.length)
    fail(400, "Duplicate items in cart.");
  const previous = await Order.findOne({
    buyer: req.user._id,
    requestKey: data.requestKey,
  });
  if (previous) return res.json(previous);
  let result;
  try {
    await mongoose.connection.transaction(async (session) => {
      const products = await Product.find({
        _id: { $in: data.items.map((i) => i.productId) },
        active: true,
      })
        .session(session)
        .lean();
      if (products.length !== data.items.length)
        fail(409, "A product is no longer available. Update your cart.");
      const sellerId = products[0].seller;
      if (products.some((p) => !same(p.seller, sellerId)))
        fail(400, "Choose products from one shop per checkout.");
      if (same(sellerId, req.user._id))
        fail(400, "You cannot buy your own products.");
      if (
        !(await User.exists({
          _id: sellerId,
          "shop.status": "approved",
          isAdmin: false,
        }).session(session))
      )
        fail(409, "This shop is not accepting orders.");
      const items = [];
      for (const input of data.items) {
        const p = products.find((p) => same(p._id, input.productId));
        const update = await Product.updateOne(
          { _id: p._id, active: true, stock: { $gte: input.quantity } },
          { $inc: { stock: -input.quantity } },
          { session },
        );
        if (!update.modifiedCount)
          fail(409, `${p.name} has insufficient stock. Update your cart.`);
        items.push({
          product: p._id,
          name: p.name,
          image: p.image,
          unitPrice: p.price,
          quantity: input.quantity,
        });
      }
      const subtotal = items.reduce(
          (sum, i) => sum + i.unitPrice * i.quantity,
          0,
        ),
        deliveryFee = 6000;
      [result] = await Order.create(
        [
          {
            buyer: req.user._id,
            seller: sellerId,
            items,
            subtotal,
            deliveryFee,
            total: subtotal + deliveryFee,
            shipping: data.shipping,
            requestKey: data.requestKey,
            history: [{ status: "pending", at: new Date(), by: req.user._id }],
          },
        ],
        { session },
      );
    });
  } catch (e) {
    if (e.code === 11000) {
      const existing = await Order.findOne({
        buyer: req.user._id,
        requestKey: data.requestKey,
      });
      if (existing) return res.json(existing);
    }
    throw e;
  }
  res.status(201).json(result);
});
marketplace.get("/orders", requireAuth, member, async (req, res) => {
  const query =
    req.query.sales === "true"
      ? { seller: req.user._id }
      : { buyer: req.user._id };
  res.json(
    await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("seller", "name shop.name")
      .lean(),
  );
});
marketplace.get("/orders/:id", requireAuth, member, async (req, res) => {
  const order = await Order.findOne({
    _id: id.parse(req.params.id),
    $or: [{ buyer: req.user._id }, { seller: req.user._id }],
  })
    .populate("seller", "name shop.name")
    .lean();
  if (!order) fail(404, "Order not found.");
  const reviews = await Review.find({ order: order._id, buyer: req.user._id })
    .select("product")
    .lean();
  res.json({
    ...order,
    reviewedProducts: reviews.map((r) => String(r.product)),
  });
});
marketplace.patch(
  "/orders/:id/status",
  requireAuth,
  member,
  async (req, res) => {
    const data = z
      .object({
        status: z.enum(["confirmed", "shipped", "delivered", "cancelled"]),
        reason: z.string().trim().max(500).default(""),
      })
      .parse(req.body);
    let result;
    await mongoose.connection.transaction(async (session) => {
      const order = await Order.findOne({
        _id: id.parse(req.params.id),
        $or: [{ buyer: req.user._id }, { seller: req.user._id }],
      }).session(session);
      if (!order) fail(404, "Order not found.");
      if (order.status === data.status) {
        result = order;
        return;
      }
      const isSeller = same(order.seller, req.user._id);
      if (data.status === "cancelled") {
        if (!["pending", "confirmed"].includes(order.status))
          fail(409, "Only pending or confirmed orders can be cancelled.");
        if (data.reason.length < 3)
          fail(400, "Please provide a cancellation reason.");
        for (const item of order.items)
          await Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity } },
            { session },
          );
      } else if (
        !isSeller ||
        { pending: "confirmed", confirmed: "shipped", shipped: "delivered" }[
          order.status
        ] !== data.status
      )
        fail(409, "This order status change is not allowed.");
      order.status = data.status;
      order.history.push({
        status: data.status,
        at: new Date(),
        by: req.user._id,
        reason: data.reason,
      });
      await order.save({ session });
      result = order;
    });
    res.json(result);
  },
);
marketplace.post(
  "/orders/:id/reviews",
  requireAuth,
  member,
  async (req, res) => {
    const data = z
      .object({
        productId: id,
        rating: z.number().int().min(1).max(5),
        comment: text(10, 1000),
      })
      .parse(req.body);
    const order = await Order.findOne({
      _id: id.parse(req.params.id),
      buyer: req.user._id,
      status: "delivered",
      "items.product": data.productId,
    });
    if (!order || same(order.seller, req.user._id))
      fail(403, "Only a delivered purchase can be reviewed.");
    res
      .status(201)
      .json(
        await Review.create({
          buyer: req.user._id,
          product: data.productId,
          order: order._id,
          rating: data.rating,
          comment: data.comment,
        }),
      );
  },
);
marketplace.get("/admin/sellers", requireAuth, admin, async (req, res) => {
  res.json(
    await User.find({ "shop.status": { $ne: "none" }, isAdmin: false })
      .select("name email shop createdAt")
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean(),
  );
});
marketplace.patch(
  "/admin/sellers/:id",
  requireAuth,
  admin,
  async (req, res) => {
    const data = z
      .object({
        status: z.enum(["approved", "rejected", "suspended"]),
        reason: text(3, 500),
      })
      .parse(req.body);
    let result;
    await mongoose.connection.transaction(async (session) => {
      const user = await User.findOne({
        _id: id.parse(req.params.id),
        isAdmin: false,
        "shop.status": { $ne: "none" },
      }).session(session);
      if (!user) fail(404, "Seller application not found.");
      const allowed = {
        pending: ["approved", "rejected"],
        approved: ["suspended"],
        suspended: ["approved"],
        rejected: ["approved"],
      };
      if (!allowed[user.shop.status]?.includes(data.status))
        fail(409, "This seller status change is not allowed.");
      user.shop.status = data.status;
      user.shop.reason = data.reason;
      await user.save({ session });
      await Audit.create(
        [
          {
            admin: req.user._id,
            seller: user._id,
            action: data.status,
            reason: data.reason,
          },
        ],
        { session },
      );
      result = publicUser(user);
    });
    res.json(result);
  },
);
marketplace.get("/admin/products", requireAuth, admin, async (req, res) =>
  res.json(
    await Product.find()
      .populate("seller", "name shop.name")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
  ),
);
marketplace.delete(
  "/admin/products/:id",
  requireAuth,
  admin,
  async (req, res) => {
    const { reason } = z.object({ reason: text(3, 500) }).parse(req.body);
    await mongoose.connection.transaction(async (session) => {
      const product = await Product.findByIdAndUpdate(
        id.parse(req.params.id),
        { $set: { active: false } },
        { new: true, session },
      );
      if (!product) fail(404, "Product not found.");
      await Audit.create(
        [
          {
            admin: req.user._id,
            product: product._id,
            action: "archive-product",
            reason,
          },
        ],
        { session },
      );
    });
    res.json({ ok: true });
  },
);
marketplace.get("/admin/audits", requireAuth, admin, async (req, res) =>
  res.json(
    await Audit.find()
      .populate("admin", "name")
      .populate("seller", "name shop.name")
      .populate("product", "name")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ),
);
