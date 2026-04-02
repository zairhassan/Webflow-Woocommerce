const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const email = 'zairh09@gmail.com';
    console.log(`Searching for data related to: ${email}\n`);

    const customers = await prisma.customer.findMany({
        where: { email: { contains: email, mode: 'insensitive' } },
        include: { _count: { select: { orders: true } } }
    });

    console.log('--- CUSTOMERS ---');
    console.log(JSON.stringify(customers, null, 2));

    const orders = await prisma.order.findMany({
        where: { customerEmail: { contains: email, mode: 'insensitive' } },
        include: { items: true }
    });

    console.log('\n--- ORDERS ---');
    console.log(JSON.stringify(orders, null, 2));

    const stores = await prisma.store.findMany({
        select: { id: true, name: true, ownerEmail: true }
    });
    console.log('\n--- STORES ---');
    console.log(JSON.stringify(stores, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
