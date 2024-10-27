import { Server } from 'socket.io';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import chatController from '../Controllers/chat.controller.js';
import userController from '../Controllers/user.controller.js';

dotenv.config();

const clientOptions = {
  project: process.env.GOOGLE_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
};

const vertexAI = new VertexAI(clientOptions);

let lastGPTCallTime = 0;
const GPT_COOLDOWN = 5000;

export default function (io) {
  let connectedUsers = 0;
  const users = {};

  io.on('connection', async (socket) => {
    console.log('client is connected', socket.id);

    socket.on('login', async ({ nickname, password }, cb) => { // userName을 nickname으로 변경
      console.log('User nickname received:', nickname);
      if (typeof cb !== 'function') {
        console.error('Callback is not a function');
        return;
      }
      try {
        const user = await userController.checkUser(nickname, password); // userName을 nickname으로 변경
        if (!user) {
          cb({ ok: false, error: '존재하지 않는 사용자이거나 비밀번호가 잘못되었습니다.' });
          return;
        }

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
          timestamp: new Date().toISOString(),
        };
        socket.emit('message', dateMessage);

        const joinMessage = {
          chat: `${user.nickname} 님이 방에 들어왔습니다.`, // name을 nickname으로 변경
          user: { id: null, name: 'system' },
          timestamp: new Date().toISOString(),
        };
        io.emit('message', joinMessage);

        const welcomeMessage = {
          chat: `안녕하세요! MBTICHAT에 오신 것을 환영합니다, ${user.nickname}님!  
          저를 호출하시려면 !부기 <원하는 말> 을 입력해 주세요.  
          궁금한 점이 있으시면 언제든지 말씀해 주세요! 😊`,          
          user: { id: null, name: '부기' },
          timestamp: new Date().toISOString(),
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

        if (message.startsWith('!부기')) {
          if (now - lastGPTCallTime < GPT_COOLDOWN) {
            cb({ ok: false, error: '너무 많은 요청입니다. 몇 초 후에 다시 시도해주세요.' });
            return;
          }
          lastGPTCallTime = now;

          const prompt = message.replace('!부기', '').trim() + ' (간단히 대답해 주세요)';

          const userMessage = {
            chat: message,
            user: { id: user.id, name: user.nickname }, // name을 nickname으로 변경
            timestamp: new Date().toISOString(),
          };
          io.emit('message', userMessage);

          try {
            const generativeModel = vertexAI.getGenerativeModel({
              model: 'gemini-1.5-flash-001',
            });

            const request = {
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              maxTokens: 50,
            };

            const response = await generativeModel.generateContent(request);
            console.log('Gemini API 응답:', response);

            if (response?.response?.candidates && response.response.candidates.length > 0) {
              let fullTextResponse = response.response.candidates[0].content.parts[0].text;

              if (fullTextResponse.length > 100) {
                fullTextResponse = fullTextResponse.substring(0, 100) + '...';
              }

              const botMessage = {
                chat: `부기: ${fullTextResponse}`,
                user: { id: null, name: '부기' },
                timestamp: new Date().toISOString(),
              };
              io.emit('message', botMessage);
              cb({ ok: true });
            } else {
              cb({ ok: false, error: '유효한 응답을 받지 못했습니다.' });
            }

          } catch (error) {
            console.error('Gemini API 호출 오류:', error);
            cb({ ok: false, error: 'Gemini API 호출 오류: ' + error.message });
          }
          return;
        }

        const newMessage = await chatController.saveChat(message, user);
        newMessage.timestamp = new Date().toISOString();
        io.emit('message', newMessage);
        cb({ ok: true });
      } catch (error) {
        console.error('메시지 전송 중 오류 발생:', error);
        cb({ ok: false, error: '메시지 전송 실패: ' + error.message });
      }
    });

    socket.on('userLeave', async (nickname, cb) => { // userName을 nickname으로 변경
      console.log('User leaving:', nickname);
      if (typeof cb !== 'function') {
        console.error('Callback is not a function');
        return;
      }
      if (users[socket.id]) {
        connectedUsers--;
        const leaveMessage = {
          chat: `${nickname} 님이 나갔습니다.`, // name을 nickname으로 변경
          user: { id: null, name: 'system' },
          timestamp: new Date().toISOString(),
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
          chat: `${user.nickname} 님이 나갔습니다.`, // name을 nickname으로 변경
          user: { id: null, name: 'system' },
          timestamp: new Date().toISOString(),
        };
        io.emit('message', leaveMessage);
        io.emit('userCount', connectedUsers);
        delete users[socket.id];
      }
      console.log('client disconnected', socket.id);
    });

    io.on('error', (error) => {
      console.error('Server error:', error);
    });
  });
}
