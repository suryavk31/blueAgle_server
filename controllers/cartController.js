const { Cart, CartItem, Product, User } = require('../models');

const getCart = async (req, res) => {
    try {
        const phone = req.user?.phone_number || req.user?.phone;
        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        let cart = await Cart.findOne({
            where: { userId: user.id },
            include: [{
                model: CartItem,
                include: [Product]
            }]
        });

        if (!cart) {
            cart = await Cart.create({ userId: user.id });
            cart.CartItems = [];
        }

        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const phone = req.user?.phone_number || req.user?.phone;
        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        let cart = await Cart.findOne({ where: { userId: user.id } });
        if (!cart) {
            cart = await Cart.create({ userId: user.id });
        }

        const product = await Product.findByPk(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        if (product.stock < quantity) {
            return res.status(400).json({ message: 'Not enough stock' });
        }

        let cartItem = await CartItem.findOne({
            where: { cartId: cart.id, productId }
        });

        if (cartItem) {
            cartItem.quantity += quantity;
            await cartItem.save();
        } else {
            cartItem = await CartItem.create({
                cartId: cart.id,
                productId,
                quantity
            });
        }

        res.json(cartItem);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateCartItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        const phone = req.user?.phone_number || req.user?.phone;

        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const cart = await Cart.findOne({ where: { userId: user.id } });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const cartItem = await CartItem.findOne({ where: { id, cartId: cart.id } });
        if (!cartItem) return res.status(404).json({ message: 'Cart item not found or unauthorized' });

        if (quantity <= 0) {
            await cartItem.destroy();
            return res.json({ message: 'Item removed' });
        }

        cartItem.quantity = quantity;
        await cartItem.save();
        res.json(cartItem);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const removeFromCart = async (req, res) => {
    try {
        const { id } = req.params;
        const phone = req.user?.phone_number || req.user?.phone;

        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const cart = await Cart.findOne({ where: { userId: user.id } });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const cartItem = await CartItem.findOne({ where: { id, cartId: cart.id } });
        if (!cartItem) return res.status(404).json({ message: 'Cart item not found or unauthorized' });

        await cartItem.destroy();
        res.json({ message: 'Item removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart
};

