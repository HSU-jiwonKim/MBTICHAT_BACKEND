const {createServer} = require("http"); // http를 통해서 서버를 하나 생성
const app = require("./app"); // 아까 만든 앱 불러오기.
const {Server} = require("socket.io"); // socket.io를 불러오기.
require("dotenv").config();

const httpServer = createServer(app); // createServer를 통해서 서버를 하나 만들고 데이터베이스 연결부분을 올림.
const io = new Server(httpServer,{
    cors:{ // 웹소켓도 데이터베이스와 마찬가지로 아무에게나 접속을 허가 할수 없기때문에 cors 설정을 해줘야함.
        origin:"http://localhost:3000" //프론트엔드 주소 3000번
    }
}); // 웹소켓 서버를 만들고 httpServer를 그 위에 올려줌.

require("./utils/io")(io); // require로 함수를 리턴 받아서 매개변수 io를 넘겨줌. 

httpServer.listen(process.env.PORT,()=>{ // .env 파일의 포트를 기준으로 http 서버 틀어놓기. 만약 연결이 되면 log 뜸.
    console.log("server listening on port",process.env.PORT);
});
