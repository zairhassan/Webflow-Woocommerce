const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- DATABASE CHECK ---');
    try {
        const customers = await prisma.customer.findMany({
            select: { email: true, firstName: true, lastName: true }
        });
        console.log('Customers found:', customers.length);
        customers.forEach(c => console.log(`- ${c.email} (${c.firstName} ${c.lastName})`));

        const stores = await prisma.store.findMany({
            select: { ownerEmail: true, name: true }
        });
        console.log('\nStores found:', stores.length);
        stores.forEach(s => console.log(`- ${s.ownerEmail} (${s.name})`));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
