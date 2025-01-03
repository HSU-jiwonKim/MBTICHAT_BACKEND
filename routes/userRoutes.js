import express from 'express';
import User from '../Models/user.js'; // User 모델 import
import bcrypt from 'bcrypt'; // 비밀번호 해싱을 위한 bcrypt
import jwt from 'jsonwebtoken'; // JWT 생성을 위한 jsonwebtoken

const router = express.Router(); // 라우터

// 회원가입
router.post('/signup', async (req, res) => {
    const { user_id, password, nickname } = req.body; // user_id 추가

    // 유효성 검사
    if (!user_id || !password || password.length < 6 || !nickname) {
        return res.status(400).json({ ok: false, error: 'User ID, password, and nickname are required. Password must be at least 6 characters.' });
    }

    // 추가: 비밀번호 강도 체크
    const passwordPattern = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;
    if (!passwordPattern.test(password)) {
        return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters long and include at least one letter, one number, and one special character.' });
    }

    try {
        // 중복된 사용자 ID 확인
        const existingUser = await User.findOne({ user_id });
        if (existingUser) {
            return res.status(400).json({ ok: false, error: 'User ID already exists.' }); // 사용자 ID 중복
        }

        // 새로운 사용자 생성
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ user_id, password: hashedPassword, nickname });
        await newUser.save();
        res.status(201).json({ ok: true, message: 'User created successfully.' });
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).json({ ok: false, error: 'User registration failed.' });
    }
});

// 로그인
router.post('/login', async (req, res) => {
    const { user_id, password } = req.body; // user_id로 수정

    // 유효성 검사
    if (!user_id || !password) {
        return res.status(400).json({ ok: false, error: 'User ID and password are required.' });
    }

    try {
        const user = await User.findOne({ user_id });
        if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ ok: false, error: 'Invalid password.' });

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ ok: false, error: 'JWT secret is not set.' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30m' }); // JWT 생성
        res.json({ ok: true, token });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ ok: false, error: 'Login failed.' });
    }
});

export default router; // 라우터 내보내기
