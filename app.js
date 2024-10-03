// 데이터베이스와 스키마 파일들을 연결하는 파일.
const express = require("express");
const mongoose = require("mongoose"); // 데이터베이스를 연결할수 있도록 도와주는 mongoose 불러오기.
require('dotenv').config(); // dotenv 불러오기. .config() 메소드는 환경 변수를 process.env에 추가 해주는 역할을 함.
const cors = require("cors"); // cors 불러오기(이걸 설정해주지 않으면 백엔드는 동일한 도메인 주소 외에는 접근을 제한함.)
const app = express();
app.use(cors()); // 어떤 주소로든 접근 허가



// 데이터 베이스 주소만 주면 데이터 베이스와 연결됨.
mongoose.connect(process.env.DB,{ // DB를 읽어오기. (.env 파일에 있는 주소를 읽어와서 데이터베이스 연결)
   // useNewUrlParser: true, // process.env를 사용하기 위해서는 dotenv파일을 불러와야 함) process.env는 node.js의 환경변수를 접근하고 관리할수 있게 해주는 객체
    //useUnifiedTopology: true,
}).then(()=>console.log("connected to database")).catch(err => console.error("Database connection error:", err)); // 만약에 연결이 됬다면 log가 뜸.

module.exports= app;