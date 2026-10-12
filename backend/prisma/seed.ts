import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // 1. Create Default Admin & Customer Users
  const passwordHash = await bcrypt.hash('SecurePass123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@ecommerce.local' },
    update: {},
    create: {
      email: 'admin@ecommerce.local',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@ecommerce.local' },
    update: {},
    create: {
      email: 'customer@ecommerce.local',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Customer',
      role: Role.CUSTOMER,
      isVerified: true,
    },
  });

  // 2. Create Categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Gadgets, peripherals, and compute hardware',
    },
  });

  const audio = await prisma.category.upsert({
    where: { slug: 'audio' },
    update: {},
    create: {
      name: 'Audio',
      slug: 'audio',
      description: 'Studio monitors, headphones, and DACs',
      parentId: electronics.id,
    },
  });

  // 3. Create Products with Initial Inventory
  const sampleProducts = [
    {
      name: 'Keychron Q1 Pro Mechanical Keyboard',
      slug: 'keychron-q1-pro',
      description: 'Wireless custom mechanical keyboard with CNC aluminum body and hot-swappable switches.',
      basePrice: 199.99,
      categoryId: electronics.id,
      images: ['https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&q=80'],
      quantity: 25,
    },
    {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      slug: 'sony-wh-1000xm5',
      description: 'Industry-leading noise canceling wireless headphones with dual processors and 8 microphones.',
      basePrice: 399.0,
      categoryId: audio.id,
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'],
      quantity: 15,
    },
    {
      name: 'Logitech MX Master 3S Mouse',
      slug: 'logitech-mx-master-3s',
      description: 'Performance wireless ergonomic mouse with 8K DPI tracking and quiet clicks.',
      basePrice: 99.99,
      categoryId: electronics.id,
      images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80'],
      quantity: 40,
    },
    {
      name: 'Audio-Technica AT2020 USB+ Microphone',
      slug: 'audio-technica-at2020usb',
      description: 'Cardioid condenser USB microphone engineered for podcasting, streaming, and studio tracking.',
      basePrice: 149.0,
      categoryId: audio.id,
      images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80'],
      quantity: 18,
    },
  ];

  for (const item of sampleProducts) {
    const existing = await prisma.product.findUnique({ where: { slug: item.slug } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: item.name,
          slug: item.slug,
          description: item.description,
          basePrice: item.basePrice,
          categoryId: item.categoryId,
          images: item.images,
          inventory: {
            create: {
              quantity: item.quantity,
              reserved: 0,
            },
          },
        },
      });
    }
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });