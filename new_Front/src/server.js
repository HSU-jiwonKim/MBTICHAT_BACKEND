import { io } from "socket.io-client"; // io를 아까 다운 받은 socket.io-client에서 들고옴.
// 로컬에서 개발할 때는 localhost 주소로 설정하고, 배포할 때는 Render 주소로 변경
const socket = io("https://mbtichat.onrender.com"); // 연결하고 싶은 백엔드 주소
// const socket = io("https://mbtichat.onrender.com/"); // 나중에 배포할 때 사용
export default socket; // 소켓을 원하는데서 사용할 수 있게 export
