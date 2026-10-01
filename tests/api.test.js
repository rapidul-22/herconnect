import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../server/app.js";
import {
  User,
  Product,
  Order,
  Review,
  PasswordReset,
  initModels,
} from "../server/models.js";
import { hash } from "../server/auth.js";
process.env.NODE_ENV = "test";
let repl, buyer, buyer2, shop, moderator, productId;
const shipping = {
  name: "Test Buyer",
  phone: "01712345678",
  address: "House 12, Road 5, Dhanmondi",
  city: "Dhaka",
};
const product = {
  name: "Handmade cup",
  description: "A handmade ceramic cup for everyday tea.",
  category: "Home",
  price: 65000,
  stock: 4,
  image: "/images/ceramic.jpg",
  materials: "Stoneware",
  care: "Hand wash",
  active: true,
};
async function signup(name) {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/auth/signup")
    .send({
      name,
      email: name.toLowerCase() + "@herconnect.demo",
      password: "LongTestPassword123!",
      phone: "01712345678",
      isAdmin: true,
      shop: { status: "approved" },
    })
    .expect(201);
  return { agent, user: res.body.user, csrf: res.body.csrfToken };
}
function write(account, method, path, body) {
  return account.agent[method]("/api" + path)
    .set("X-CSRF-Token", account.csrf)
    .send(body);
}
before(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri("herconnect_tests"));
  await initModels();
  buyer = await signup("Buyer");
  buyer2 = await signup("BuyerTwo");
  shop = await signup("Maker");
  moderator = await signup("Moderator");
  await User.updateOne(
    { _id: moderator.user._id },
    { $set: { isAdmin: true } },
  );
});
after(async () => {
  await mongoose.disconnect();
  await repl?.stop();
});
test("full marketplace acceptance and security workflow", async (t) => {
  await t.test(
    "signup never accepts privileged fields; authentication and CSRF enforced",
    async () => {
      assert.equal(buyer.user.isAdmin, false);
      assert.equal(buyer.user.shop.status, "none");
      assert.equal(buyer.user.passwordHash, undefined);
      await buyer.agent.post("/api/seller/apply").send({}).expect(403);
      await request(app).get("/api/orders").expect(401);
      await request(app)
        .post("/api/auth/login")
        .send({ email: "buyer@herconnect.demo", password: "WrongPassword!" })
        .expect(401);
      await request(app)
        .post("/api/auth/login")
        .set("Origin", "https://evil.example")
        .send({ email: "buyer@herconnect.demo", password: "LongTestPassword123!" })
        .expect(403);
    },
  );
  await t.test(
    "application drafts hidden in browse AND direct detail until moderator approval",
    async () => {
      await write(shop, "post", "/seller/apply", {
        name: "Test Studio",
        city: "Dhaka",
        story: "A small handmade pottery shop in Dhaka for testing.",
      }).expect(201);
      const p = await write(shop, "post", "/seller/products", product).expect(
        201,
      );
      productId = p.body._id;
      await buyer.agent
        .get("/api/products/" + productId)
        .expect(404);
      assert.equal((await buyer.agent.get("/api/products")).body.total, 0);
      await write(buyer, "patch", "/admin/sellers/" + shop.user._id, {
        status: "approved",
        reason: "test",
      }).expect(403);
      await write(moderator, "patch", "/admin/sellers/" + shop.user._id, {
        status: "approved",
        reason: "Application reviewed for testing.",
      }).expect(200);
      await buyer.agent
        .get("/api/products/" + productId)
        .expect(200);
    },
  );
  await t.test(
    "owner-only inventory, wishlist persistence and self-purchase prevention",
    async () => {
      await write(buyer, "patch", "/seller/products/" + productId, {
        ...product,
        stockDelta: 0,
      }).expect(403);
      await write(buyer, "post", "/wishlist/" + productId, {}).expect(200);
      assert.equal((await buyer.agent.get("/api/wishlist")).body.length, 1);
      await write(shop, "post", "/orders", {
        items: [{ productId, quantity: 1 }],
        shipping,
        requestKey: randomUUID(),
      }).expect(400);
    },
  );
  await t.test(
    "server prices, request retry protection, private orders and cancellation exactly once",
    async () => {
      const requestKey = randomUUID(),
        data = {
          items: [{ productId, quantity: 2 }],
          shipping,
          requestKey,
          total: 1,
        };
      const first = await write(buyer, "post", "/orders", data).expect(201);
      assert.equal(first.body.total, 136000);
      const retry = await write(buyer, "post", "/orders", data).expect(200);
      assert.equal(retry.body._id, first.body._id);
      await buyer2.agent.get("/api/orders/" + first.body._id).expect(404);
      await write(buyer, "patch", "/orders/" + first.body._id + "/status", {
        status: "shipped",
      }).expect(409);
      const cancellations = await Promise.all([
        write(buyer, "patch", "/orders/" + first.body._id + "/status", {
          status: "cancelled",
          reason: "Changed my mind.",
        }),
        write(buyer, "patch", "/orders/" + first.body._id + "/status", {
          status: "cancelled",
          reason: "Changed my mind.",
        }),
      ]);
      cancellations.forEach((r) => assert.equal(r.status, 200));
      assert.equal((await Product.findById(productId)).stock, 4);
      assert.equal(
        (await User.findById(shop.user._id)).shop.status,
        "approved",
      );
    },
  );
  await t.test(
    "two simultaneous buyers cannot both purchase last stock",
    async () => {
      await Product.updateOne({ _id: productId }, { $set: { stock: 1 } });
      const results = await Promise.all(
        [buyer, buyer2].map((a) =>
          write(a, "post", "/orders", {
            items: [{ productId, quantity: 1 }],
            shipping,
            requestKey: randomUUID(),
          }),
        ),
      );
      assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
      assert.equal((await Product.findById(productId)).stock, 0);
    },
  );
  await t.test("failed multi-item checkout rolls all stock back", async () => {
    await Product.updateOne({ _id: productId }, { $set: { stock: 3 } });
    const empty = await Product.create({
      ...product,
      seller: shop.user._id,
      stock: 0,
      name: "Sold out cup",
    });
    await write(buyer, "post", "/orders", {
      items: [
        { productId, quantity: 1 },
        { productId: String(empty._id), quantity: 1 },
      ],
      shipping,
      requestKey: randomUUID(),
    }).expect(409);
    assert.equal((await Product.findById(productId)).stock, 3);
  });
  await t.test(
    "fulfilled orders only allow one purchase-linked review and no shipped cancellation",
    async () => {
      const o = await write(buyer, "post", "/orders", {
        items: [{ productId, quantity: 1 }],
        shipping,
        requestKey: randomUUID(),
      }).expect(201);
      const review = {
        productId,
        rating: 5,
        comment: "A lovely cup, the size is perfect for tea.",
      };
      await write(
        buyer,
        "post",
        "/orders/" + o.body._id + "/reviews",
        review,
      ).expect(403);
      await write(shop, "patch", "/orders/" + o.body._id + "/status", {
        status: "confirmed",
      }).expect(200);
      await write(shop, "patch", "/orders/" + o.body._id + "/status", {
        status: "shipped",
      }).expect(200);
      await write(buyer, "patch", "/orders/" + o.body._id + "/status", {
        status: "cancelled",
        reason: "Too late",
      }).expect(409);
      await write(shop, "patch", "/orders/" + o.body._id + "/status", {
        status: "delivered",
      }).expect(200);
      await write(
        buyer,
        "post",
        "/orders/" + o.body._id + "/reviews",
        review,
      ).expect(201);
      await write(
        buyer,
        "post",
        "/orders/" + o.body._id + "/reviews",
        review,
      ).expect(409);
    },
  );
  await t.test(
    "seller suspension gates detail, search and checkout but preserves existing orders",
    async () => {
      await write(moderator, "patch", "/admin/sellers/" + shop.user._id, {
        status: "suspended",
        reason: "Review needed.",
      }).expect(200);
      await buyer.agent
        .get("/api/products/" + productId)
        .expect(404);
      assert.equal((await buyer.agent.get("/api/products")).body.total, 0);
      await write(buyer, "post", "/orders", {
        items: [{ productId, quantity: 1 }],
        shipping,
        requestKey: randomUUID(),
      }).expect(409);
      await shop.agent.get("/api/orders?sales=true").expect(200);
    },
  );
  await t.test(
    "password reset is one-use and invalidates existing sessions",
    async () => {
      const token = "b".repeat(64);
      await PasswordReset.create({
        tokenHash: hash(token),
        user: buyer2.user._id,
        expiresAt: new Date(Date.now() + 60000),
      });
      await request(app)
        .post("/api/auth/reset-password")
        .send({ token, password: "NewTestPassword123!" })
        .expect(200);
      await buyer2.agent.get("/api/orders").expect(401);
      await request(app)
        .post("/api/auth/reset-password")
        .send({ token, password: "NewTestPassword123!" })
        .expect(400);
      await request(app)
        .post("/api/auth/login")
        .send({ email: buyer2.user.email, password: "NewTestPassword123!" })
        .expect(200);
    },
  );
});
