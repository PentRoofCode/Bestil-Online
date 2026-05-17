import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("Password123!", 12);

  // ── Users ──────────────────────────────────────────────────────────────────

  const admin = await prisma.user.upsert({
    where: { email: "admin@bestil.online" },
    update: {},
    create: {
      email: "admin@bestil.online",
      passwordHash,
      firstName: "Admin",
      lastName: "Bestil",
      role: "ADMIN",
      emailVerified: true,
    },
  });

  const owner1 = await prisma.user.upsert({
    where: { email: "owner1@bestil.online" },
    update: {},
    create: {
      email: "owner1@bestil.online",
      passwordHash,
      firstName: "Marco",
      lastName: "Rossi",
      role: "RESTAURANT_OWNER",
      emailVerified: true,
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: "owner2@bestil.online" },
    update: {},
    create: {
      email: "owner2@bestil.online",
      passwordHash,
      firstName: "Yuki",
      lastName: "Tanaka",
      role: "RESTAURANT_OWNER",
      emailVerified: true,
    },
  });

  // Customer with a single clean address
  const customer = await prisma.user.upsert({
    where: { email: "customer@bestil.online" },
    update: {},
    create: {
      email: "customer@bestil.online",
      passwordHash,
      firstName: "Lars",
      lastName: "Hansen",
      role: "CUSTOMER",
      emailVerified: true,
    },
  });

  const customerAddress = await prisma.address.upsert({
    where: { id: "addr-lars-hjem" },
    update: {},
    create: {
      id: "addr-lars-hjem",
      userId: customer.id,
      label: "Hjem",
      street: "Nørrebrogade 42",
      city: "København",
      postalCode: "2200",
      country: "DK",
      isDefault: true,
    },
  });

  // ── Opening hours (shared) ─────────────────────────────────────────────────

  const openingHours = {
    mon: { open: "11:00", close: "22:00" },
    tue: { open: "11:00", close: "22:00" },
    wed: { open: "11:00", close: "22:00" },
    thu: { open: "11:00", close: "23:00" },
    fri: { open: "11:00", close: "23:00" },
    sat: { open: "12:00", close: "23:00" },
    sun: { open: "12:00", close: "21:00" },
  };

  // ── Restaurant 1: Burgerbyen ───────────────────────────────────────────────

  const r1 = await prisma.restaurant.upsert({
    where: { slug: "burgerbyen" },
    update: {},
    create: {
      ownerId: owner1.id,
      name: "Burgerbyen",
      slug: "burgerbyen",
      description: "Håndlavede burgere af dansk oksekød — tilpasset præcis som du vil have dem",
      phone: "+45 70 20 30 40",
      email: "hello@burgerbyen.dk",
      street: "Nørrebrogade 100",
      city: "København",
      postalCode: "2200",
      cuisines: ["Burger", "Amerikansk", "Fast Casual"],
      openingHours,
      isActive: true,
      isVerified: true,
      deliveryFee: new Prisma.Decimal("19.00"),
      minimumOrderAmount: new Prisma.Decimal("75.00"),
      deliveryTimeMin: 20,
      avgRating: 4.6,
      reviewCount: 534,
    },
  });

  const r1Cat1 = await prisma.menuCategory.upsert({
    where: { id: "cat-r1-burgere" },
    update: {},
    create: { id: "cat-r1-burgere", restaurantId: r1.id, name: "Burgere", displayOrder: 1 },
  });

  const r1Cat2 = await prisma.menuCategory.upsert({
    where: { id: "cat-r1-menu" },
    update: {},
    create: { id: "cat-r1-menu", restaurantId: r1.id, name: "Menuer", displayOrder: 2 },
  });

  // Classic Burger (standalone)
  const classicBurger = await prisma.menuItem.upsert({
    where: { id: "item-classic-burger" },
    update: {},
    create: {
      id: "item-classic-burger",
      restaurantId: r1.id,
      categoryId: r1Cat1.id,
      name: "Classic Burger",
      description: "180g dansk oksekød, cheddar, salat, tomat, syltet agurk, special sauce",
      price: new Prisma.Decimal("89.00"),
      displayOrder: 1,
    },
  });

  const cbGroup = await prisma.menuItemOptionGroup.findFirst({ where: { menuItemId: classicBurger.id, name: "Tilbehør" } });
  if (!cbGroup) {
    await prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: classicBurger.id,
        name: "Tilbehør",
        isRequired: false,
        isMultiSelect: true,
        displayOrder: 1,
        options: {
          create: [
            { name: "Pommes frites", priceModifier: new Prisma.Decimal("29"), displayOrder: 1 },
            { name: "Onion rings", priceModifier: new Prisma.Decimal("29"), displayOrder: 2 },
            { name: "Coleslaw", priceModifier: new Prisma.Decimal("19"), displayOrder: 3 },
          ],
        },
      },
    });
  }

  const cbDrinkGroup = await prisma.menuItemOptionGroup.findFirst({ where: { menuItemId: classicBurger.id, name: "Drik" } });
  if (!cbDrinkGroup) {
    await prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: classicBurger.id,
        name: "Drik",
        isRequired: false,
        isMultiSelect: false,
        displayOrder: 2,
        options: {
          create: [
            { name: "Sodavand (33cl)", priceModifier: new Prisma.Decimal("25"), displayOrder: 1 },
            { name: "Juice", priceModifier: new Prisma.Decimal("25"), displayOrder: 2 },
            { name: "Vand", priceModifier: new Prisma.Decimal("15"), displayOrder: 3 },
          ],
        },
      },
    });
  }

  // Stor Burger Menu
  const storBurger = await prisma.menuItem.upsert({
    where: { id: "item-stor-burger-menu" },
    update: {},
    create: {
      id: "item-stor-burger-menu",
      restaurantId: r1.id,
      categoryId: r1Cat2.id,
      name: "Stor Burger Menu",
      description: "Valgfri burger med pommes frites og sodavand — vores mest populære valg",
      price: new Prisma.Decimal("139.00"),
      displayOrder: 1,
    },
  });

  const sbPattyGroup = await prisma.menuItemOptionGroup.findFirst({ where: { menuItemId: storBurger.id, name: "Vælg burger" } });
  if (!sbPattyGroup) {
    await prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: storBurger.id,
        name: "Vælg burger",
        isRequired: true,
        isMultiSelect: false,
        displayOrder: 1,
        options: {
          create: [
            { name: "Classic (oksekød, cheddar)", priceModifier: new Prisma.Decimal("0"), displayOrder: 1 },
            { name: "Bacon Burger (ekstra bacon, BBQ sauce)", priceModifier: new Prisma.Decimal("20"), displayOrder: 2 },
            { name: "Dobbelt patty (2× 180g)", priceModifier: new Prisma.Decimal("30"), displayOrder: 3 },
          ],
        },
      },
    });
  }

  const sbExtraGroup = await prisma.menuItemOptionGroup.findFirst({ where: { menuItemId: storBurger.id, name: "Ekstra til burgeren" } });
  if (!sbExtraGroup) {
    await prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: storBurger.id,
        name: "Ekstra til burgeren",
        isRequired: false,
        isMultiSelect: true,
        displayOrder: 2,
        options: {
          create: [
            { name: "Ekstra cheddar", priceModifier: new Prisma.Decimal("10"), displayOrder: 1 },
            { name: "Jalapeños", priceModifier: new Prisma.Decimal("10"), displayOrder: 2 },
            { name: "Avocado", priceModifier: new Prisma.Decimal("15"), displayOrder: 3 },
          ],
        },
      },
    });
  }

  // ── Restaurant 2: La Bella Italia ─────────────────────────────────────────

  const r2 = await prisma.restaurant.upsert({
    where: { slug: "la-bella-italia" },
    update: {},
    create: {
      ownerId: owner1.id,
      name: "La Bella Italia",
      slug: "la-bella-italia",
      description: "Autentisk italiensk køkken med håndlavet pasta og stenovns-pizza",
      phone: "+45 32 11 22 33",
      email: "info@labellaitalia.dk",
      street: "Strøget 15",
      city: "København",
      postalCode: "1100",
      cuisines: ["Italiensk", "Pizza", "Pasta"],
      openingHours,
      isActive: true,
      isVerified: true,
      deliveryFee: new Prisma.Decimal("29.00"),
      minimumOrderAmount: new Prisma.Decimal("100.00"),
      deliveryTimeMin: 30,
      avgRating: 4.8,
      reviewCount: 312,
    },
  });

  const r2Cat1 = await prisma.menuCategory.upsert({
    where: { id: "cat-r2-pizza" },
    update: {},
    create: { id: "cat-r2-pizza", restaurantId: r2.id, name: "Pizza", displayOrder: 1 },
  });

  const r2Cat2 = await prisma.menuCategory.upsert({
    where: { id: "cat-r2-pasta" },
    update: {},
    create: { id: "cat-r2-pasta", restaurantId: r2.id, name: "Pasta", displayOrder: 2 },
  });

  // Margherita
  const margherita = await prisma.menuItem.upsert({
    where: { id: "item-margherita" },
    update: {},
    create: {
      id: "item-margherita",
      restaurantId: r2.id,
      categoryId: r2Cat1.id,
      name: "Margherita",
      description: "San Marzano tomat, fior di latte mozzarella, frisk basilikum, olivenolie",
      price: new Prisma.Decimal("109.00"),
      isVegetarian: true,
      displayOrder: 1,
    },
  });

  const margSizeGroup = await prisma.menuItemOptionGroup.findFirst({ where: { menuItemId: margherita.id, name: "Størrelse" } });
  if (!margSizeGroup) {
    await prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: margherita.id,
        name: "Størrelse",
        isRequired: true,
        isMultiSelect: false,
        displayOrder: 1,
        options: {
          create: [
            { name: "Classic (26 cm)", priceModifier: new Prisma.Decimal("0"), displayOrder: 1 },
            { name: "Grande (32 cm)", priceModifier: new Prisma.Decimal("30"), displayOrder: 2 },
          ],
        },
      },
    });
  }

  const margExtraGroup = await prisma.menuItemOptionGroup.findFirst({ where: { menuItemId: margherita.id, name: "Ekstra" } });
  if (!margExtraGroup) {
    await prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: margherita.id,
        name: "Ekstra",
        isRequired: false,
        isMultiSelect: true,
        displayOrder: 2,
        options: {
          create: [
            { name: "Rucola", priceModifier: new Prisma.Decimal("15"), displayOrder: 1 },
            { name: "Trøffelolie", priceModifier: new Prisma.Decimal("20"), displayOrder: 2 },
            { name: "Prosciutto", priceModifier: new Prisma.Decimal("25"), displayOrder: 3 },
          ],
        },
      },
    });
  }

  // Diavola
  await prisma.menuItem.upsert({
    where: { id: "item-diavola" },
    update: {},
    create: {
      id: "item-diavola",
      restaurantId: r2.id,
      categoryId: r2Cat1.id,
      name: "Diavola",
      description: "Tomat, mozzarella, spicy chorizo, frisk jalapeño, chili-honning",
      price: new Prisma.Decimal("129.00"),
      displayOrder: 2,
    },
  });

  // Carbonara
  const carbonara = await prisma.menuItem.upsert({
    where: { id: "item-carbonara" },
    update: {},
    create: {
      id: "item-carbonara",
      restaurantId: r2.id,
      categoryId: r2Cat2.id,
      name: "Spaghetti Carbonara",
      description: "Hjemmelavet pasta, guanciale, æg, pecorino romano, sort peber",
      price: new Prisma.Decimal("149.00"),
      displayOrder: 1,
    },
  });

  const carbExtraGroup = await prisma.menuItemOptionGroup.findFirst({ where: { menuItemId: carbonara.id, name: "Ekstra" } });
  if (!carbExtraGroup) {
    await prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: carbonara.id,
        name: "Ekstra",
        isRequired: false,
        isMultiSelect: true,
        displayOrder: 1,
        options: {
          create: [
            { name: "Ekstra pecorino", priceModifier: new Prisma.Decimal("15"), displayOrder: 1 },
            { name: "Trøffel (sæson)", priceModifier: new Prisma.Decimal("35"), displayOrder: 2 },
          ],
        },
      },
    });
  }

  // ── Restaurant 3: Sushi Zen ────────────────────────────────────────────────

  const r3 = await prisma.restaurant.upsert({
    where: { slug: "sushi-zen" },
    update: {},
    create: {
      ownerId: owner2.id,
      name: "Sushi Zen",
      slug: "sushi-zen",
      description: "Japansk køkken med fokus på friske råvarer — nigiri, rolls og varm comfort food",
      phone: "+45 33 44 55 66",
      email: "info@sushizen.dk",
      street: "Vesterbrogade 88",
      city: "København",
      postalCode: "1620",
      cuisines: ["Japansk", "Sushi", "Asian Fusion"],
      openingHours,
      isActive: true,
      isVerified: true,
      deliveryFee: new Prisma.Decimal("39.00"),
      minimumOrderAmount: new Prisma.Decimal("120.00"),
      deliveryTimeMin: 35,
      avgRating: 4.7,
      reviewCount: 218,
    },
  });

  const r3Cat1 = await prisma.menuCategory.upsert({
    where: { id: "cat-r3-rolls" },
    update: {},
    create: { id: "cat-r3-rolls", restaurantId: r3.id, name: "Nigiri & Rolls", displayOrder: 1 },
  });

  const r3Cat2 = await prisma.menuCategory.upsert({
    where: { id: "cat-r3-bento" },
    update: {},
    create: { id: "cat-r3-bento", restaurantId: r3.id, name: "Bento Box", displayOrder: 2 },
  });

  // Laks Nigiri
  await prisma.menuItem.upsert({
    where: { id: "item-laks-nigiri" },
    update: {},
    create: {
      id: "item-laks-nigiri",
      restaurantId: r3.id,
      categoryId: r3Cat1.id,
      name: "Laks Nigiri",
      description: "8 stk. frisk atlantisk laks på håndformet sushi-ris",
      price: new Prisma.Decimal("89.00"),
      displayOrder: 1,
    },
  });

  // Dragon Roll
  const dragonRoll = await prisma.menuItem.upsert({
    where: { id: "item-dragon-roll" },
    update: {},
    create: {
      id: "item-dragon-roll",
      restaurantId: r3.id,
      categoryId: r3Cat1.id,
      name: "Dragon Roll",
      description: "8 stk. rejer tempura, avocado, tobiko, unagi sauce",
      price: new Prisma.Decimal("149.00"),
      displayOrder: 2,
    },
  });

  const drExtraGroup = await prisma.menuItemOptionGroup.findFirst({ where: { menuItemId: dragonRoll.id, name: "Ekstra" } });
  if (!drExtraGroup) {
    await prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: dragonRoll.id,
        name: "Ekstra",
        isRequired: false,
        isMultiSelect: true,
        displayOrder: 1,
        options: {
          create: [
            { name: "Ekstra wasabi", priceModifier: new Prisma.Decimal("0"), displayOrder: 1 },
            { name: "Ekstra soya", priceModifier: new Prisma.Decimal("0"), displayOrder: 2 },
            { name: "Spicy mayo dip", priceModifier: new Prisma.Decimal("15"), displayOrder: 3 },
          ],
        },
      },
    });
  }

  // Chicken Teriyaki Bento
  const bento = await prisma.menuItem.upsert({
    where: { id: "item-teriyaki-bento" },
    update: {},
    create: {
      id: "item-teriyaki-bento",
      restaurantId: r3.id,
      categoryId: r3Cat2.id,
      name: "Chicken Teriyaki Bento",
      description: "Grillet kylling i teriyaki sauce, edamame, gyoza, miso suppe, ris",
      price: new Prisma.Decimal("169.00"),
      displayOrder: 1,
    },
  });

  const bentoRisGroup = await prisma.menuItemOptionGroup.findFirst({ where: { menuItemId: bento.id, name: "Ris" } });
  if (!bentoRisGroup) {
    await prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: bento.id,
        name: "Ris",
        isRequired: true,
        isMultiSelect: false,
        displayOrder: 1,
        options: {
          create: [
            { name: "Hvide ris", priceModifier: new Prisma.Decimal("0"), displayOrder: 1 },
            { name: "Brune ris", priceModifier: new Prisma.Decimal("0"), displayOrder: 2 },
            { name: "Blomkålsris (low carb)", priceModifier: new Prisma.Decimal("10"), displayOrder: 3 },
          ],
        },
      },
    });
  }

  const bentoExtraGroup = await prisma.menuItemOptionGroup.findFirst({ where: { menuItemId: bento.id, name: "Ekstra" } });
  if (!bentoExtraGroup) {
    await prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: bento.id,
        name: "Ekstra",
        isRequired: false,
        isMultiSelect: true,
        displayOrder: 2,
        options: {
          create: [
            { name: "Ekstra gyoza (3 stk.)", priceModifier: new Prisma.Decimal("35"), displayOrder: 1 },
            { name: "Miso suppe", priceModifier: new Prisma.Decimal("25"), displayOrder: 2 },
          ],
        },
      },
    });
  }

  // ── Demo order (PENDING_CONFIRMATION so owner can see it immediately) ─────

  const existingOrder = await prisma.order.findUnique({ where: { id: "demo-order-001" } });
  if (!existingOrder) {
    const demoOrder = await prisma.order.create({
      data: {
        id: "demo-order-001",
        orderNumber: "BO-20260514-DEMO01",
        userId: customer.id,
        restaurantId: r1.id,
        deliveryAddressId: customerAddress.id,
        status: "PENDING_CONFIRMATION",
        subtotal: new Prisma.Decimal("159.00"),
        deliveryFee: new Prisma.Decimal("19.00"),
        tax: new Prisma.Decimal("39.75"),
        totalAmount: new Prisma.Decimal("217.75"),
        platformCommission: new Prisma.Decimal("23.85"),
        restaurantPayout: new Prisma.Decimal("135.15"),
        items: {
          create: [
            {
              menuItemId: storBurger.id,
              menuItemName: "Stor Burger Menu",
              quantity: 1,
              unitPrice: new Prisma.Decimal("159.00"),
              itemTotal: new Prisma.Decimal("159.00"),
              selectedOptions: [
                { groupName: "Vælg burger", optionName: "Bacon Burger (ekstra bacon, BBQ sauce)", priceModifier: 20 },
                { groupName: "Ekstra til burgeren", optionName: "Jalapeños", priceModifier: 10 },
              ],
            },
          ],
        },
      },
    });

    await prisma.payment.create({
      data: {
        orderId: demoOrder.id,
        amount: new Prisma.Decimal("217.75"),
        method: "CARD",
        status: "COMPLETED",
        stripePaymentIntentId: "cs_test_demo_seed_001",
        completedAt: new Date(),
      },
    });
  }

  console.log("\nSeeded successfully:");
  console.log(`  Admin:    admin@bestil.online`);
  console.log(`  Owner 1:  owner1@bestil.online  →  Burgerbyen, La Bella Italia`);
  console.log(`  Owner 2:  owner2@bestil.online  →  Sushi Zen`);
  console.log(`  Customer: customer@bestil.online`);
  console.log(`  Password: Password123!`);
  console.log(`  Demo order BO-20260514-DEMO01 is PENDING_CONFIRMATION at Burgerbyen`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
