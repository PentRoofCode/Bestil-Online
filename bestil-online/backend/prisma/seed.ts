import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("Password123!", 12);

  // Admin
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

  // Restaurant owners
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

  // Customer
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
      addresses: {
        create: [
          {
            label: "Hjem",
            street: "Nørrebrogade 42",
            city: "København",
            postalCode: "2200",
            country: "DK",
            isDefault: true,
          },
          {
            label: "Kontor",
            street: "Vesterbrogade 10",
            city: "København",
            postalCode: "1620",
            country: "DK",
          },
        ],
      },
    },
  });

  const openingHours = {
    mon: { open: "11:00", close: "22:00" },
    tue: { open: "11:00", close: "22:00" },
    wed: { open: "11:00", close: "22:00" },
    thu: { open: "11:00", close: "23:00" },
    fri: { open: "11:00", close: "23:00" },
    sat: { open: "12:00", close: "23:00" },
    sun: { open: "12:00", close: "21:00" },
  };

  // Restaurant 1: Italian
  const r1 = await prisma.restaurant.upsert({
    where: { slug: "la-bella-italia" },
    update: {},
    create: {
      ownerId: owner1.id,
      name: "La Bella Italia",
      slug: "la-bella-italia",
      description: "Autentisk italiensk køkken i hjertet af København",
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
      minimumOrderAmount: new Prisma.Decimal("75.00"),
      deliveryTimeMin: 25,
      avgRating: 4.7,
      reviewCount: 234,
    },
  });

  // Restaurant 2: Japanese
  const r2 = await prisma.restaurant.upsert({
    where: { slug: "sushi-zen" },
    update: {},
    create: {
      ownerId: owner2.id,
      name: "Sushi Zen",
      slug: "sushi-zen",
      description: "Friske sushi og japanske delikatesser",
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
      minimumOrderAmount: new Prisma.Decimal("100.00"),
      deliveryTimeMin: 35,
      avgRating: 4.5,
      reviewCount: 189,
    },
  });

  // Restaurant 3: Burger
  const r3 = await prisma.restaurant.upsert({
    where: { slug: "burgerbyen" },
    update: {},
    create: {
      ownerId: owner1.id,
      name: "Burgerbyen",
      slug: "burgerbyen",
      description: "Håndlavede burgere med friske råvarer",
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
      minimumOrderAmount: new Prisma.Decimal("60.00"),
      deliveryTimeMin: 20,
      avgRating: 4.3,
      reviewCount: 412,
    },
  });

  // Seed menu for r1 (Italian)
  const itCat1 = await prisma.menuCategory.upsert({
    where: { id: "cat-it-pizza" },
    update: {},
    create: {
      id: "cat-it-pizza",
      restaurantId: r1.id,
      name: "Pizza",
      displayOrder: 1,
    },
  });

  const itCat2 = await prisma.menuCategory.upsert({
    where: { id: "cat-it-pasta" },
    update: {},
    create: {
      id: "cat-it-pasta",
      restaurantId: r1.id,
      name: "Pasta",
      displayOrder: 2,
    },
  });

  await prisma.menuItem.upsert({
    where: { id: "item-margherita" },
    update: {},
    create: {
      id: "item-margherita",
      restaurantId: r1.id,
      categoryId: itCat1.id,
      name: "Margherita",
      description: "Tomat, mozzarella, frisk basilikum",
      price: new Prisma.Decimal("89.00"),
      isVegetarian: true,
      displayOrder: 1,
    },
  });

  const diavola = await prisma.menuItem.upsert({
    where: { id: "item-diavola" },
    update: {},
    create: {
      id: "item-diavola",
      restaurantId: r1.id,
      categoryId: itCat1.id,
      name: "Diavola",
      description: "Tomat, mozzarella, chorizo, jalapeño",
      price: new Prisma.Decimal("109.00"),
      displayOrder: 2,
    },
  });

  await prisma.menuItem.upsert({
    where: { id: "item-carbonara" },
    update: {},
    create: {
      id: "item-carbonara",
      restaurantId: r1.id,
      categoryId: itCat2.id,
      name: "Carbonara",
      description: "Pasta, pancetta, æg, pecorino, sort peber",
      price: new Prisma.Decimal("119.00"),
      displayOrder: 1,
    },
  });

  // Option group for diavola
  const existingGroup = await prisma.menuItemOptionGroup.findFirst({ where: { menuItemId: diavola.id } });
  if (!existingGroup) {
    await prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: diavola.id,
        name: "Størrelse",
        isRequired: true,
        displayOrder: 1,
        options: {
          create: [
            { name: "Medium (26cm)", priceModifier: new Prisma.Decimal("0"), displayOrder: 1 },
            { name: "Large (32cm)", priceModifier: new Prisma.Decimal("30"), displayOrder: 2 },
          ],
        },
      },
    });
  }

  // Seed menu for r2 (Sushi)
  const sushiCat = await prisma.menuCategory.upsert({
    where: { id: "cat-sushi-nigiri" },
    update: {},
    create: {
      id: "cat-sushi-nigiri",
      restaurantId: r2.id,
      name: "Nigiri & Maki",
      displayOrder: 1,
    },
  });

  await prisma.menuItem.upsert({
    where: { id: "item-salmon-nigiri" },
    update: {},
    create: {
      id: "item-salmon-nigiri",
      restaurantId: r2.id,
      categoryId: sushiCat.id,
      name: "Laks Nigiri (8 stk)",
      description: "Frisk laks på sushi ris",
      price: new Prisma.Decimal("89.00"),
      displayOrder: 1,
    },
  });

  await prisma.menuItem.upsert({
    where: { id: "item-dragon-roll" },
    update: {},
    create: {
      id: "item-dragon-roll",
      restaurantId: r2.id,
      categoryId: sushiCat.id,
      name: "Dragon Roll (8 stk)",
      description: "Rejer, avocado, tobiko",
      price: new Prisma.Decimal("129.00"),
      displayOrder: 2,
    },
  });

  // Seed menu for r3 (Burger)
  const burgerCat = await prisma.menuCategory.upsert({
    where: { id: "cat-burger-burgers" },
    update: {},
    create: {
      id: "cat-burger-burgers",
      restaurantId: r3.id,
      name: "Burgere",
      displayOrder: 1,
    },
  });

  const classicBurger = await prisma.menuItem.upsert({
    where: { id: "item-classic-burger" },
    update: {},
    create: {
      id: "item-classic-burger",
      restaurantId: r3.id,
      categoryId: burgerCat.id,
      name: "Classic Burger",
      description: "180g dansk oksekød, cheddar, salat, tomat, løg, special sauce",
      price: new Prisma.Decimal("89.00"),
      displayOrder: 1,
    },
  });

  const existingBurgerGroup = await prisma.menuItemOptionGroup.findFirst({
    where: { menuItemId: classicBurger.id },
  });
  if (!existingBurgerGroup) {
    await prisma.menuItemOptionGroup.create({
      data: {
        menuItemId: classicBurger.id,
        name: "Tilbehør",
        isMultiSelect: true,
        displayOrder: 1,
        options: {
          create: [
            { name: "Pommes frites", priceModifier: new Prisma.Decimal("29"), displayOrder: 1 },
            { name: "Coleslaw", priceModifier: new Prisma.Decimal("19"), displayOrder: 2 },
            { name: "Sodavand", priceModifier: new Prisma.Decimal("25"), displayOrder: 3 },
          ],
        },
      },
    });
  }

  console.log("Seeded successfully:");
  console.log(`  Admin: ${admin.email}`);
  console.log(`  Owners: ${owner1.email}, ${owner2.email}`);
  console.log(`  Customer: ${customer.email}`);
  console.log(`  Restaurants: ${r1.slug}, ${r2.slug}, ${r3.slug}`);
  console.log("  All passwords: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
