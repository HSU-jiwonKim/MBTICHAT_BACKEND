const User = require("../Models/user");
const userController = {};

// 유저 정보를 저장하는 함수
userController.saveUser = async (userName, sid) => {
    // 이미 있는 유저인지 확인
    let user = await User.findOne({ name: userName }); // 이름이 userName인 유저 찾기

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
};

// 유저를 찾는 함수
userController.checkUser = async (sid) => {
    const user = await User.findOne({ token: sid }); // token이 sid인 유저 찾기

    if (!user) {
        throw new Error("User not found");
    }

    return user;
};

module.exports = userController;
