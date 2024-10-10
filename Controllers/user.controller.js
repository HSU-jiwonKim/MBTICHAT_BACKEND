const User = require("../Models/user");
const userController = {};

// 유저 정보를 저장하는 함수
userController.saveUser = async (userName, sid) => {
    try {
        // 이미 있는 유저인지 확인
        let user = await User.findOne({ name: userName });

        // 없다면 새로 유저 정보 만들기
        if (!user) {
            user = new User({
                name: userName,
                token: sid,
                online: true,
            });
        }

        // 이미 있는 유저라면 연결 정보(token 값)만 업데이트
        user.token = sid;
        user.online = true;

        await user.save(); // 유저 정보 저장

        return user;
    } catch (error) {
        console.error("Error saving user:", error);
        throw new Error("Error saving user");
    }
};

// 유저를 찾는 함수
userController.checkUser = async (sid) => {
    try {
        const user = await User.findOne({ token: sid }); // token이 sid인 유저 찾기

        if (!user) {
            return null; // 유저를 찾지 못하면 null 반환
        }

        return user;
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

module.exports = userController;
