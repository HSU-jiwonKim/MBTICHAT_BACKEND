import User from "../Models/user.js"; // User 모델 import
import bcrypt from 'bcrypt'; // bcrypt 추가

const userController = {};

// 유저 정보를 저장하는 함수
userController.saveUser = async (user_id, password, nickname) => {
    try {
        // 이미 있는 유저인지 확인 (user_id와 nickname으로 중복 확인)
        let existingUser = await User.findOne({ user_id });
        let existingNickname = await User.findOne({ nickname });

        if (existingUser) {
            return { success: false, message: '이미 있는 아이디입니다.' }; // 아이디 중복
        }
        
        if (existingNickname) {
            return { success: false, message: '이미 있는 닉네임입니다.' }; // 닉네임 중복
        }

        // 없다면 새로 유저 정보 만들기
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            user_id, // 아이디 저장
            password: hashedPassword, // 해시된 비밀번호 저장
            nickname, // 닉네임 저장
            online: true,
        });

        await user.save(); // 유저 정보 저장

        return { success: true, user }; // 저장된 유저 반환
    } catch (error) {
        console.error("Error saving user:", error);
        throw new Error("Error saving user");
    }
};

// 유저를 찾는 함수
userController.checkUser = async (user_id, password) => {
    try {
        const user = await User.findOne({ user_id }); // 유저 찾기

        if (!user) {
            return { success: false, message: '존재하지 않는 사용자입니다.' }; // 사용자 존재하지 않음
        }

        // 비밀번호 확인 로직 (해시 비교)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return { success: false, message: '비밀번호가 틀렸습니다.' }; // 비밀번호 틀림
        }

        return { success: true, user }; // 유저 정보 반환
    } catch (error) {
        console.error("Error checking user:", error);
        throw new Error("Error checking user");
    }
};

// 유저의 프로필 이미지를 업데이트하는 함수
userController.updateProfileImage = async (userId, imageUrl) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        user.profileImage = imageUrl; // 프로필 이미지 URL 업데이트
        await user.save(); // 유저 정보 저장

        return user; // 업데이트된 유저 정보 반환
    } catch (error) {
        console.error("Error updating profile image:", error);
        throw new Error("Error updating profile image");
    }
};

export default userController; // ESM 방식으로 내보내기
