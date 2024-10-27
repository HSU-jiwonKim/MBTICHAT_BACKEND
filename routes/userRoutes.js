import express from 'express';
import User from '../Models/user.js'; // User 모델 import
import bcrypt from 'bcrypt'; // 비밀번호 해싱을 위한 bcrypt
import jwt from 'jsonwebtoken'; // JWT 생성을 위한 jsonwebtoken

const router = express.Router();

// 회원가입
router.post('/signup', async (req, res) => {
    const { name, password } = req.body;

    // 유효성 검사
    if (!name || !password || password.length < 6) {
        return res.status(400).json({ ok: false, error: 'Name and password are required. Password must be at least 6 characters.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ ok: true, message: 'User created successfully.' });
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).json({ ok: false, error: 'User registration failed.' });
    }
});

// 로그인
router.post('/login', async (req, res) => {
    const { name, password } = req.body;

    // 유효성 검사
    if (!name || !password) {
        return res.status(400).json({ ok: false, error: 'Name and password are required.' });
    }

    try {
        const user = await User.findOne({ name });
        if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ ok: false, error: 'Invalid password.' });

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ ok: false, error: 'JWT secret is not set.' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' }); // JWT 생성
        res.json({ ok: true, token });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ ok: false, error: 'Login failed.' });
    }
});

export default router;
