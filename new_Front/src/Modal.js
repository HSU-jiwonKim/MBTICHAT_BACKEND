import React, { useState } from 'react';
import './Modal.css'; // 스타일 파일 추가

const Modal = ({ onClose, onSubmit }) => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = () => {
        if (inputValue) {
            onSubmit(inputValue);
            onClose(); // 모달 닫기
        } else {
            alert('이름을 입력해야 합니다.'); // 유효성 검사
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h2>이름 입력</h2>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="당신의 이름을 입력하세요"
                />
                <button onClick={handleSubmit}>확인</button>
                <button onClick={onClose}>취소</button>
            </div>
        </div>
    );
};

export default Modal;
