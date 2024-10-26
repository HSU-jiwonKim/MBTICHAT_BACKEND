import { Server } from 'socket.io';
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';
import chatController from '../Controllers/chat.controller.js';
import userController from '../Controllers/user.controller.js';

dotenv.config();

// Vertex AI API 초기화
const API_ENDPOINT = 'us-central1-aiplatform.googleapis.com';
const clientOptions = {
apiEndpoint: API_ENDPOINT,
credentials: {
client_email: process.env.GOOGLE_CLIENT_EMAIL,
private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\n/g, '\n'),
},
};

// API 호출 쿨다운 설정
let lastGPTCallTime = 0;
const GPT_COOLDOWN = 5000; // 5초 쿨다운

export default function (io) {
let connectedUsers = 0;
const users = {};

io.on('connection', async (socket) => {
if (users[socket.id]) {
console.log('기존 사용자 재연결:', socket.id);
return;
}

console.log('client is connected', socket.id);

socket.on('login', async (userName, cb) => {
  console.log('User name received:', userName);
  if (typeof cb !== 'function') {
    console.error('Callback is not a function');
    return;
  }
  try {
    const existingUser = Object.values(users).find(user => user.name === userName);
    if (existingUser) {
      cb({ ok: false, error: '이미 사용 중인 닉네임입니다.' });
      return;
    }

    const user = await userController.saveUser(userName, socket.id);
    users[socket.id] = user;
    connectedUsers++;
    io.emit('userCount', connectedUsers);

    cb({ ok: true, data: user });

    const today = new Date();
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      timeZone: 'Asia/Seoul',
    };
    const dateMessage = {
      chat: `📅${new Intl.DateTimeFormat('ko-KR', options).format(today)} >`,
      user: { id: null, name: 'system' },
    };
    socket.emit('message', dateMessage);

    const welcomeMessage = {
      chat: `${user.name} 님이 들어왔습니다.`,
      user: { id: null, name: 'system' },
    };
    io.emit('message', welcomeMessage);
  } catch (error) {
    cb({ ok: false, error: error.message });
  }
});

socket.on('sendMessage', async (message, cb) => {
  console.log('Message to send:', message);
  if (typeof cb !== 'function') {
    console.error('Callback is not a function');
    return;
  }
  try {
    const user = await userController.checkUser(socket.id);
    const now = Date.now();

    if (message.startsWith('!Gemini')) {
      if (now - lastGPTCallTime < GPT_COOLDOWN) {
        cb({ ok: false, error: '너무 많은 요청입니다. 몇 초 후에 다시 시도해주세요.' });
        return;
      }
      lastGPTCallTime = now;

      const prompt = message.replace('!Gemini', '').trim();

      // Gemini API 호출 (Vertex AI API 사용)
      const endpoint = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/gemini-1-5-flash`;
      const parameters = {
        temperature: 0.7, // 필요에 따라 조정
        // 추가 매개변수 설정 가능
      };
      const request = {
        endpoint,
        instances: [{ content: prompt }],
        parameters,
      };

      const [response] = await predictionServiceClient.predict(request);
      const geminiMessage = response.predictions[0].text; // 응답에서 텍스트 추출

      const botMessage = {
        chat: `Gemini: ${geminiMessage}`,
        user: { id: null, name: 'Gemini' },
      };
      io.emit('message', botMessage);
      cb({ ok: true });
      return;
    }

    const newMessage = await chatController.saveChat(message, user);
    io.emit('message', newMessage);
    cb({ ok: true });
  } catch (error) {
    console.error('메시지 전송 중 오류 발생:', error);
    cb({ ok: false, error: '메시지 전송 실패: ' + error.message });
  }
});

socket.on('userLeave', async (userName, cb) => {
  console.log('User leaving:', userName);
  if (typeof cb !== 'function') {
    console.error('Callback is not a function');
    return;
  }
  if (users[socket.id]) {
    connectedUsers--;
    const leaveMessage = {
      chat: `${userName} 님이 나갔습니다.`,
      user: { id: null, name: 'system' },
    };
    io.emit('message', leaveMessage);
    io.emit('userCount', connectedUsers);
    delete users[socket.id];
  }
  cb({ ok: true });
});

socket.on('disconnect', () => {
  const user = users[socket.id];
  if (user) {
    connectedUsers--;
    const leaveMessage = {
      chat: `${user.name} 님이 나갔습니다.`,
      user: { id: null, name: 'system' },
    };
    io.emit('message', leaveMessage);
    io.emit('userCount', connectedUsers);
    delete users[socket.id];
  }
  console.log('client disconnected', socket.id);
});