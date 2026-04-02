const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const slug = 'aura-puffer-jacket';
    const product = await prisma.product.findFirst({
        where: { slug },
        include: { variants: true, store: true }
    });
    
    if (!product) {
        console.log(`Product NOT FOUND for slug: ${slug}`);
        return;
    }
    
    console.log(`Product: ${product.title}`);
    console.log(`Slug: ${product.slug}`);
    console.log(`Published: ${product.isPublished}`);
    console.log(`Visibility: ${product.visibility}`);
    console.log(`Variants Found: ${product.variants.length}`);
    console.log(`Store: ${product.store.name} (${product.store.id})`);
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
