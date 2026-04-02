const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({
        select: {
            id: true,
            name: true,
            ownerEmail: true
        }
    });
    console.log(JSON.stringify(stores, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
