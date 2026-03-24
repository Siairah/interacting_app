'use client';

import { useState, useRef } from 'react';
import styles from './MessageInput.module.css';

interface MessageInputProps {
  onSend: (content: string, media?: File, replyTo?: string) => void;
}

export default function MessageInput({ onSend }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() || selectedFile) {
      onSend(content, selectedFile || undefined);
      setContent('');
      setSelectedFile(null);
      // Clear file input
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  return (
    <div className={styles.messageInputContainer}>
      <div className={styles.inputWrapper}>
        <input
          type="text"
          id="message-input"
          className={styles.messageInput}
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className={styles.hiddenFileInput}
        onChange={handleImageSelect}
      />
      <button
        type="button"
        className={styles.inputActionBtn}
        onClick={handleImageClick}
        title="Add photo"
      >
        <i className="fas fa-image"></i>
      </button>
      {selectedFile && (
        <span className={styles.selectedFile}>{selectedFile.name}</span>
      )}
      <button
        id="send-btn"
        className={styles.sendBtn}
        onClick={handleSubmit}
        type="button"
      >
        <i className="fas fa-paper-plane"></i>
      </button>
    </div>
  );
}

