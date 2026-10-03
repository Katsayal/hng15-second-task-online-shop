import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL in .env.local");
}

const connectionUrl = new URL(databaseUrl);
if (!connectionUrl.searchParams.has("connect_timeout")) {
  connectionUrl.searchParams.set("connect_timeout", "30");
}

const prisma = new PrismaClient({
  datasources: { db: { url: connectionUrl.toString() } },
});

const products = [
  {
    name: "Botanical Hand Wash",
    description:
      "A gentle, plant-based hand wash with a fresh botanical scent, made for everyday sinks.",
    price: "14.00",
    stockQuantity: 18,
    imageUrl:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Everyday Canvas Tote",
    description:
      "A durable, easy-to-carry canvas tote for market trips, books, and all the little things.",
    price: "24.00",
    stockQuantity: 16,
    imageUrl:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85",
  },
];

try {
  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
      select: { id: true },
    });

    if (existing) {
      console.log(`Already in catalog: ${product.name}`);
      continue;
    }

    await prisma.product.create({ data: product });
    console.log(`Added: ${product.name}`);
  }
} catch (error) {
  console.error("Could not add demo products:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
