const prisma = require('../lib/prisma');
const Stripe = require('stripe');
const { sendOrderConfirmation } = require('../lib/email');

// Handle Stripe webhook
const handleStripeWebhook = async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        const rawBody = req.body;

        // We need to find the store by the session metadata, so first parse the event
        // For webhook, we'll verify signature per-store or use a global webhook secret
        let event;

        if (process.env.STRIPE_WEBHOOK_SECRET) {
            // Global webhook secret (simpler for MVP)
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
            try {
                event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
            } catch (err) {
                console.error('Webhook signature verification failed:', err.message);
                return res.status(400).json({ error: 'Webhook signature verification failed' });
            }
        } else {
            // Parse without verification (dev only)
            event = JSON.parse(rawBody.toString());
        }

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log('✅ Payment completed for session:', session.id);

                // Find the pending order  
                const order = await prisma.order.findFirst({
                    where: { stripeSessionId: session.id }
                });

                if (order) {
                    // Update order status to paid
                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            status: 'paid',
                            stripePaymentIntent: session.payment_intent,
                            customerEmail: session.customer_details?.email || order.customerEmail,
                            customerName: session.customer_details?.name || null
                        }
                    });

                    // Reduce stock for tracked products
                    const orderItems = await prisma.orderItem.findMany({
                        where: { orderId: order.id },
                        include: { product: true, variant: true }
                    });

                    for (const item of orderItems) {
                        if (item.variant) {
                            await prisma.variant.update({
                                where: { id: item.variant.id },
                                data: { stockQuantity: { decrement: item.quantity } }
                            });
                        } else if (item.product.trackInventory) {
                            await prisma.product.update({
                                where: { id: item.product.id },
                                data: { stockQuantity: { decrement: item.quantity } }
                            });
                        }
                    }

                    console.log(`✅ Order ${order.id} updated to PAID, stock adjusted`);

                    // Send order confirmation email
                    try {
                        const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
                        await sendOrderConfirmation(order.storeId, updatedOrder, orderItems);
                    } catch (emailErr) {
                        console.error('📧 Failed to send confirmation email:', emailErr.message);
                    }
                } else {
                    console.warn('⚠️ No order found for session:', session.id);
                }
                break;
            }

            case 'checkout.session.expired': {
                const session = event.data.object;
                const order = await prisma.order.findFirst({
                    where: { stripeSessionId: session.id }
                });
                if (order) {
                    await prisma.order.update({
                        where: { id: order.id },
                        data: { status: 'cancelled' }
                    });
                    console.log(`❌ Order ${order.id} cancelled (session expired)`);
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

module.exports = { handleStripeWebhook };
