// Fictional shops and product specifications for an educational demonstration.
export const demoShops = [
  {
    name: "Nadia Rahman",
    email: "nadia@herconnect.demo",
    shop: {
      name: "Mati & Me",
      city: "Dhaka",
      story:
        "A small pottery studio finding beauty in everyday rituals. Thoughtfully shaped cups and home pieces, made for slow mornings. This is a fictional demo shop.",
      status: "approved",
    },
  },
  {
    name: "Farhana Akter",
    email: "farhana@herconnect.demo",
    shop: {
      name: "Little Loom",
      city: "Narayanganj",
      story:
        "Everyday accessories with a personal touch. A collection of easy-to-love pieces for workdays, weekends and everything between. Fictional demo shop.",
      status: "approved",
    },
  },
  {
    name: "Sadia Islam",
    email: "sadia@herconnect.demo",
    shop: {
      name: "The Gentle Edit",
      city: "Chattogram",
      story:
        "Candles and small rituals for a calmer corner of your day. This fictional demo shop celebrates thoughtful gifting and simple comforts.",
      status: "approved",
    },
  },
  {
    name: "Rumana Chowdhury",
    email: "rumana@herconnect.demo",
    shop: {
      name: "Crumbs by Rumi",
      city: "Dhaka",
      story:
        "A home-baking story built around family recipes and afternoon treats. All products and business details here are fictional demonstration content.",
      status: "approved",
    },
  },
];
export const demoProducts = [
  {
    key: "clay-cups",
    shop: 0,
    name: "Hand-shaped clay cups",
    category: "Handicrafts",
    price: 85000,
    image: "ceramic",
    stock: 18,
    description:
      "A quiet little ritual for your morning tea. This set of four softly shaped clay cups brings an earthy touch to your table. Each piece has its own gentle curves and natural finish.",
    materials:
      "Illustrative sample specification: four clay cups, approximately 180 ml each. Natural pink-beige finish.",
    care: "Hand-wash gently and dry fully. Sample specifications; not a real item for sale.",
  },
  {
    key: "amber-candle",
    shop: 2,
    name: "Amber jar candle",
    category: "Home",
    price: 69000,
    image: "candle-soft",
    stock: 24,
    description:
      "A small amber jar for your favourite slow-evening ritual. A simple gift or a thoughtful addition to your bedside table, with a warm minimal design.",
    materials:
      "Illustrative sample: 180 g candle in a reusable amber-coloured glass jar.",
    care: "Keep away from children, pets and flammable materials. Never leave a burning candle unattended.",
  },
  {
    key: "everyday-tote",
    shop: 1,
    name: "The everyday canvas tote",
    category: "Handicrafts",
    price: 55000,
    image: "tote",
    stock: 31,
    description:
      "For books, fresh market finds and all the little things you carry. This cream canvas tote is a light everyday companion with a relaxed printed design.",
    materials:
      "Illustrative sample: cotton canvas, approximately 35 × 40 cm, shoulder straps. Photo shows an unrelated illustrative design.",
    care: "Spot-clean with mild soap. Air-dry flat. Do not bleach the printed surface.",
  },
  {
    key: "white-mugs",
    shop: 0,
    name: "Minimal white mug duo",
    category: "Home",
    price: 78000,
    image: "white-mugs",
    stock: 20,
    description:
      "One for you, one for someone you love. Two clean, white mugs that fit effortlessly into your morning coffee or evening tea routine.",
    materials:
      "Illustrative sample: two white ceramic mugs, approximately 300 ml each.",
    care: "Wash with mild detergent and avoid sudden changes in temperature.",
  },
  {
    key: "silver-hoops",
    shop: 1,
    name: "Everyday silver-tone hoops",
    category: "Other",
    price: 45000,
    image: "earrings",
    stock: 15,
    description:
      "A little shine for an ordinary day. These simple hoop earrings are a light finishing touch, whether you are dressing for class, work or a coffee date.",
    materials:
      "Illustrative sample: one pair of silver-tone hoops, 3 cm diameter. No claim of precious-metal content.",
    care: "Keep dry and store separately. Avoid perfume and lotions on the surface.",
  },
  {
    key: "candle-kit",
    shop: 2,
    name: "Slow Sunday candle kit",
    category: "Handicrafts",
    price: 129000,
    image: "candle",
    stock: 9,
    description:
      "Make a little time for making. A candle-making starter kit for a quiet weekend at home, with small jars and the everyday essentials to begin.",
    materials:
      "Illustrative sample: wax, wicks, two glass jars and stirring sticks. Adult craft kit.",
    care: "Use adult supervision, a protected work surface and heat-safe equipment. Follow safe candle-making guidance.",
  },
  {
    key: "berry-mugs",
    shop: 0,
    name: "Berry & cream mug pair",
    category: "Home",
    price: 95000,
    image: "mugs",
    stock: 12,
    description:
      "Rich berry on the outside, soft cream within. A pair of everyday mugs for shared conversations and moments that deserve a proper pause.",
    materials:
      "Illustrative sample: two glazed mugs, approximately 280 ml each.",
    care: "Hand-wash with a soft sponge. Do not use abrasive cleaning pads.",
  },
  {
    key: "selfcare-set",
    shop: 2,
    name: "The daily care collection",
    category: "Beauty",
    price: 159000,
    image: "skincare",
    stock: 14,
    description:
      "A collection of bottles and jars for a beautifully organised daily routine. This sample listing demonstrates a beauty product page; it is not a medical or skincare recommendation.",
    materials:
      "Demo cosmetic collection. Ingredients and safety certification are not supplied; not intended for real purchase or use.",
    care: "For real listings, sellers must provide ingredients, expiry dates and usage directions before offering cosmetics.",
  },
  {
    key: "soft-scarf",
    shop: 1,
    name: "The soft statement scarf",
    category: "Clothing",
    price: 89000,
    image: "scarf",
    stock: 17,
    description:
      "An easy finishing layer for your everyday wardrobe. Drape it your way and add a little colour to a simple outfit, from a busy morning to a relaxed evening.",
    materials:
      "Illustrative sample: lightweight scarf, approximately 70 × 180 cm. Fibre content is fictional.",
    care: "Hand-wash separately in cool water. Dry in shade and iron on a low setting.",
  },
  {
    key: "cookie-box",
    shop: 3,
    name: "Tea-break chocolate chip cookie",
    category: "Food",
    price: 9500,
    image: "cookies",
    stock: 16,
    description:
      "The kind of little treat that makes a tea break better. A homestyle chocolate chip cookie, ready for a quiet tea break or your next study session.",
    materials:
      "Illustrative sample: one large cookie. Contains wheat, milk and egg; may contain nuts. No actual food is sold.",
    care: "Sample storage instructions: store airtight in a cool, dry place and enjoy within three days.",
  },
];
export const demoComments = [
  [
    "The finish looks lovely on my shelf. The size was exactly what I expected from the description.",
    5,
  ],
  [
    "A thoughtful little find. I liked the simple packaging and would choose this as a small gift.",
    4,
  ],
  [
    "The colour and details are beautiful. It made an ordinary day feel a bit more special.",
    5,
  ],
];

// Additional fictional catalog editions reuse the bundled illustrative product photos.
demoShops.push(
 {name:'Tania Noor',email:'tania@herconnect.demo',shop:{name:'Rose & Ritual',city:'Sylhet',story:'Fictional women-led gifting studio: thoughtful home rituals and small-batch gifts.',status:'approved'}},
 {name:'Nusrat Jahan',email:'nusrat@herconnect.demo',shop:{name:'Everyday Atelier',city:'Rajshahi',story:'Fictional accessories studio for everyday work, study and creative living.',status:'approved'}}
);
const originals = demoProducts.slice();
for(const [edition,label] of ['Gift edit','Studio collection'].entries()) {
 for(const [i,p] of originals.entries()) demoProducts.push({...p,key:p.key+'-edition-'+edition,
  shop:(i+4+edition)%demoShops.length,name:p.name+' · '+label,price:p.price+(edition+1)*10000,
  stock:12+i,description:p.description+' '+label+' is a fictional catalog edition. Photo is illustrative and shared with the original sample.'});
}
