import User from "../Models/user.js";
import bcrypt from 'bcrypt';

const userController = {};

// 유저 정보를 저장하는 함수
userController.saveUser = async (user_id, password, nickname) => {
    try {
        console.log("Attempting to save user:", { user_id, nickname });

        // 입력 검증
        if (!user_id || !password || !nickname) {
            return { success: false, message: '모든 필드를 입력해야 합니다.' };
        }

        if (user_id.length < 3) {
            return { success: false, message: '아이디는 최소 3자 이상이어야 합니다.' };
        }

        if (nickname.length < 3) {
            return { success: false, message: '닉네임은 최소 3자 이상이어야 합니다.' };
        }

        if (password.length < 8) {
            return { success: false, message: '비밀번호는 최소 8자 이상이어야 합니다.' };
        }

        // 데이터베이스 연결 확인
        console.log("Checking database connection..."); 
        await User.findOne({}).exec(); 
        console.log("Database connected successfully!");

        // 이미 있는 유저인지 확인 (user_id와 nickname으로 중복 확인)
        const existingUser = await User.findOne({ user_id });
        const existingNickname = await User.findOne({ nickname });

        if (existingUser) {
            return { success: false, message: '이미 있는 아이디입니다.' };
        }

        if (existingNickname) {
            return { success: false, message: '이미 있는 닉네임입니다.' }; 
        }

        // 새로운 유저 정보 생성
        const user = new User({
            user_id,
            nickname,
            online: true,
            password: await bcrypt.hash(password, 10), 
        });

        // 유저 정보 저장
        await user.save();
        console.log("User saved successfully:", user);

        return { success: true, user };
    } catch (error) {
        console.error("Error saving user:", error); 

        if (error.code === 11000) { // MongoDB duplicate key error
            if (error.keyPattern.user_id) {
                return { success: false, message: '이미 있는 아이디입니다.' };
            } else if (error.keyPattern.nickname) {
                return { success: false, message: '이미 있는 닉네임입니다.' };
            }
        } 

        return { success: false, message: "유저 정보를 저장하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }; 
    }
};

// 유저를 찾는 함수
userController.checkUser = async (user_id, password) => {
    try {
        console.log("Attempting to find user:", user_id); 

        const user = await User.findOne({ user_id });

        if (!user) {
            return { success: false, message: '존재하지 않는 사용자입니다.' };
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return { success: false, message: '비밀번호가 틀렸습니다.' };
        }

        console.log("User logged in successfully:", user); 
        return { success: true, user }; 
    } catch (error) {
        console.error("Error checking user:", error);
        return { success: false, message: "유저 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }; 
    }
};

export default userController;