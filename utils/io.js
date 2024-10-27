import { Server } from 'socket.io';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import chatController from '../Controllers/chat.controller.js';
import userController from '../Controllers/user.controller.js';
import { v4 as uuidv4 } from 'uuid'; // uuid 라이브러리 import

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
        console.log('Client connected:', socket.id);

        // 로그인 이벤트 처리 (클라이언트에서 'login' 이벤트 발생)
        socket.on('login', async ({ user_id, password }, cb) => {
            console.log('User user_id received:', user_id);
            console.log('User password received:', password);

            if (typeof cb !== 'function') {
                console.error('Callback is not a function');
                return;
            }

            try {
                const user = await userController.checkUser(user_id, password);
                if (!user.success) {
                    cb({ ok: false, error: user.message });
                    return;
                }

                users[socket.id] = user.user;
                connectedUsers++;
                io.emit('userCount', connectedUsers);

                sendDateMessage(socket);
                sendJoinMessage(user.user);
                sendWelcomeMessage(user.user);

                cb({ ok: true, data: user.user });
            } catch (error) {
                cb({ ok: false, error: '로그인 중 오류 발생: ' + error.message });
            }
        });

        // 회원가입 이벤트 처리 (클라이언트에서 'signup' 이벤트 발생)
        socket.on('signup', async ({ user_id, password, nickname }, cb) => {
            console.log('User user_id received:', user_id);
            console.log('User password received:', password);
            console.log('User nickname received:', nickname);

            if (typeof cb !== 'function') {
                console.error('Callback is not a function');
                return;
            }

            try {
                const newUser = await userController.saveUser(user_id, password, nickname);
                if (!newUser.success) {
                    cb({ ok: false, error: newUser.message });
                    return;
                }

                cb({ ok: true, data: newUser.user });
            } catch (error) {
                cb({ ok: false, error: '회원가입 중 오류 발생: ' + error.message });
            }
        });

        socket.on('sendMessage', async (message, cb) => {
            console.log('Message to send:', message);
            if (typeof cb !== 'function') {
                console.error('Callback is not a function');
                return;
            }

            try {
                const user = users[socket.id];
                if (!user) {
                    cb({ ok: false, error: '사용자 정보가 없습니다.' });
                    return;
                }

                if (message.startsWith('!부기')) {
                    await handleBotMessage(message, user, cb);
                    return;
                }

                const newMessage = await chatController.saveChat(message, user);
                newMessage.timestamp = new Date().toISOString();
                io.emit('message', newMessage);
                cb({ ok: true });
            } catch (error) {
                console.error('Error sending message:', error);
                cb({ ok: false, error: '메시지 전송 실패: ' + error.message });
            }
        });

        socket.on('userLeave', (cb) => {
            handleUserLeave(socket, cb);
        });

        socket.on('disconnect', () => {
            handleUserDisconnect(socket);
        });

        io.on('error', (error) => {
            console.error('Server error:', error);
        });
    });

    const sendDateMessage = (socket) => {
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
            user: { id: 'system', name: 'system' },
            timestamp: new Date().toISOString(),
            _id: uuidv4(),
        };
        socket.emit('message', dateMessage);
    };

    const sendJoinMessage = (user) => {
        const joinMessage = {
            chat: `${user.nickname} 님이 방에 들어왔습니다.`,
            user: { id: 'system', name: 'system' },
            timestamp: new Date().toISOString(),
            _id: uuidv4(),
        };
        io.emit('message', joinMessage);
    };

    const sendWelcomeMessage = (user) => {
        const welcomeMessage = {
            chat: `${user.nickname}님 MBTICHAT에 오신 걸 환영합니다! 👋 궁금한 건 언제든 "!부기"를 불러주세요! 😊`,
            user: { id: '부기', name: '부기' }, 
            timestamp: new Date().toISOString(),
            _id: uuidv4(), 
        };
        io.emit('message', welcomeMessage);
    };

    const handleBotMessage = async (message, user, cb) => {
        const now = Date.now();
        if (now - lastGPTCallTime < GPT_COOLDOWN) {
            cb({ ok: false, error: '너무 많은 요청입니다. 몇 초 후에 다시 시도해주세요.' });
            return;
        }
        lastGPTCallTime = now;

        const prompt = message.replace('!부기', '').trim() + ' (간단히 대답해 주세요)';
        const userMessage = {
            chat: message,
            user: { id: user._id, name: user.nickname }, 
            timestamp: new Date().toISOString(),
            _id: uuidv4(), // 고유한 _id 생성
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
            console.log('Gemini API response:', response);

            if (response?.response?.candidates && response.response.candidates.length > 0) {
                let fullTextResponse = response.response.candidates[0].content.parts[0].text;
                fullTextResponse = fullTextResponse.length > 100 ? fullTextResponse.substring(0, 100) + '...' : fullTextResponse;

                const botMessage = {
                    chat: `부기: ${fullTextResponse}`,
                    user: { id: '부기', name: '부기' },
                    timestamp: new Date().toISOString(),
                    _id: uuidv4(), // 고유한 _id 생성
                };
                io.emit('message', botMessage);
                cb({ ok: true });
            } else {
                cb({ ok: false, error: '유효한 응답을 받지 못했습니다.' });
            }
        } catch (error) {
            console.error('Gemini API call error:', error);
            cb({ ok: false, error: 'Gemini API 호출 오류: ' + error.message });
        }
    };

    const handleUserLeave = (socket, cb) => {
        const user = users[socket.id];
        if (user) {
            delete users[socket.id];
            connectedUsers--;
            io.emit('userCount', connectedUsers);

            const leaveMessage = {
                chat: `${user.nickname} 님이 방을 나갔습니다.`,
                user: { id: 'system', name: 'system' }, 
                timestamp: new Date().toISOString(),
                _id: uuidv4(), // 고유한 _id 생성
            };
            io.emit('message', leaveMessage);
            cb({ ok: true });
        } else {
            cb({ ok: false, error: '사용자 정보가 없습니다.' });
        }
    };

    const handleUserDisconnect = (socket) => {
        const user = users[socket.id];
        if (user) {
            delete users[socket.id];
            connectedUsers--;
            io.emit('userCount', connectedUsers);
            const disconnectMessage = {
                chat: `${user.nickname} 님이 연결을 끊었습니다.`,
                user: { id: 'system', name: 'system' },
                timestamp: new Date().toISOString(),
                _id: uuidv4(), // 고유한 _id 생성
            };
            io.emit('message', disconnectMessage);
        }
    };
}