import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: [true, "User ID must be provided"],
        unique: true,
        // validate: { 
        //     validator: function(v) {
        //         // user_id 형식 검증 로직 (예: 3~15자의 영문 소문자, 숫자 조합)
        //         return /^[a-z0-9]{3,15}$/.test(v);
        //     },
        //     message: props => `${props.value} is not a valid user ID!`
        // }, 
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        // validate: {
        //     validator: function(v) {
        //         // 비밀번호 형식 검증 로직 (예: 8자 이상, 특수문자 포함 등)
        //         return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(v);
        //     },
        //     message: "Password must be at least 8 characters long and include at least one letter, one number and one special character."
        // }
    },
    nickname: {
        type: String,
        required: [true, "Nickname is required"],
        unique: true, // 닉네임 중복 방지
        // validate: {
        //     validator: function(v) {
        //         // 닉네임 형식 검증 로직
        //         return /^[a-zA-Z0-9가-힣]{2,10}$/.test(v); 
        //     },
        //     message: props => `${props.value} is not a valid nickname!`
        // },
    },
    token: {
        type: String,
    },
    online: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true, versionKey: false });

userSchema.methods.hashPassword = async function () {
    this.password = await bcrypt.hash(this.password, 10);
};

const User = mongoose.model("User", userSchema);

export default User;