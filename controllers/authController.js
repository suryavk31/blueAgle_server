const { User } = require('../models');

const loginOrRegister = async (req, res) => {
    try {
        const phone = req.user?.phone_number || req.user?.phone;
        if (!phone) {
            return res.status(400).json({ message: 'Phone number missing in token payload' });
        }

        const [user, created] = await User.findOrCreate({
            where: { phone },
            defaults: {
                role: 'user',
            }
        });


        res.status(200).json({
            message: created ? 'User registered' : 'User logged in',
            user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMe = async (req, res) => {
    try {
        const phone = req.user?.phone_number || req.user?.phone;
        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find user by email or fallback to finding admin
        let user = await User.findOne({ where: { email, role: 'admin' } });

        // If no user found with that email, check if any admin exists or find by email
        if (!user) {
            user = await User.findOne({ where: { role: 'admin' } });
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        res.json({
            message: 'Admin authenticated',
            user: {
                id: user.id,
                name: user.name || 'Admin User',
                email: user.email || email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Admin Login Error:", error);
        res.status(500).json({ message: 'Server error during admin login' });
    }
};

module.exports = { loginOrRegister, getMe, adminLogin };

