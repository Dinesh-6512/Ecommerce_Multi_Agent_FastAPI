import React, { useState, useRef, useEffect } from 'react';
import { fetchApi } from '../api';
import './ShopAssistant.css';

function ShopAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your AI Shop Assistant. How can I help you with products, your cart, or orders today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsLoading(true);

    try {
      // Use existing fetchApi which automatically attaches the token
      const data = await fetchApi('/agent/ask', {
        method: 'POST',
        body: JSON.stringify({ message: userText })
      });
      
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
    } catch (error) {
      console.error("Agent error:", error);
      if (error.message && (error.message.includes("401") || error.message.includes("Unauthorized") || error.message.includes("Not authenticated"))) {
        setMessages(prev => [...prev, { role: 'error', text: 'Please log in to use the Shop Assistant.' }]);
      } else {
        setMessages(prev => [...prev, { role: 'error', text: 'Sorry, I encountered an error communicating with the server.' }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="shop-assistant-container">
      {isOpen && (
        <div className="shop-assistant-window">
          <div className="shop-assistant-header">
            <span>Shop Assistant</span>
            <button className="shop-assistant-close" onClick={() => setIsOpen(false)}>&times;</button>
          </div>
          <div className="shop-assistant-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                {msg.text}
              </div>
            ))}
            {isLoading && <div className="loading-indicator">Assistant is thinking...</div>}
            <div ref={messagesEndRef} />
          </div>
          <form className="shop-assistant-input-area" onSubmit={handleSend}>
            <input
              type="text"
              className="shop-assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
            />
            <button type="submit" className="shop-assistant-send" disabled={isLoading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
      {!isOpen && (
        <button className="shop-assistant-toggle" onClick={() => setIsOpen(true)}>
          💬
        </button>
      )}
    </div>
  );
}

export default ShopAssistant;
