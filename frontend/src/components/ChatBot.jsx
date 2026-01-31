import { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../services/api';
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader2, Check, XCircle } from 'lucide-react';
import './ChatBot.scss';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadSuggestions();
      setMessages([{
        role: 'assistant',
        content: 'Bonjour ! Je suis votre assistant IA Supaco. Je peux créer des projets, des prospects, ajouter des tâches et bien plus. Que puis-je faire pour vous ?'
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current && !pendingAction) {
      inputRef.current.focus();
    }
  }, [isOpen, pendingAction]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSuggestions = async () => {
    try {
      const response = await aiAPI.getSuggestions();
      setSuggestions(response.data.questions || []);
    } catch (error) {
      console.error('Erreur chargement suggestions:', error);
    }
  };

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = { role: 'user', content: messageText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setPendingAction(null);

    try {
      const response = await aiAPI.chat(messageText, conversationHistory);
      const assistantMessage = { role: 'assistant', content: response.data.response };
      setMessages(prev => [...prev, assistantMessage]);
      setConversationHistory(response.data.conversationHistory);

      // Si une action est en attente de confirmation
      if (response.data.pendingAction) {
        setPendingAction(response.data.pendingAction);
      }
    } catch (error) {
      console.error('Erreur chat:', error);
      const errorMessage = error.response?.data?.message || 'Désolé, une erreur est survenue. Vérifiez que la clé API Groq est configurée.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: '✓ Confirmé' }]);

    try {
      const response = await aiAPI.executeAction(pendingAction);

      const resultMessage = {
        role: 'assistant',
        content: response.data.success
          ? `✅ ${response.data.message}`
          : `❌ ${response.data.message}`,
        isSuccess: response.data.success,
        isError: !response.data.success
      };

      setMessages(prev => [...prev, resultMessage]);
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: 'Confirmé' },
        { role: 'assistant', content: resultMessage.content }
      ]);
    } catch (error) {
      console.error('Erreur exécution action:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Erreur lors de l\'exécution de l\'action',
        isError: true
      }]);
    } finally {
      setPendingAction(null);
      setIsLoading(false);
    }
  };

  const cancelAction = () => {
    setMessages(prev => [
      ...prev,
      { role: 'user', content: '✗ Annulé' },
      { role: 'assistant', content: 'Action annulée. Que puis-je faire d\'autre pour vous ?' }
    ]);
    setConversationHistory(prev => [
      ...prev,
      { role: 'user', content: 'Annulé' },
      { role: 'assistant', content: 'Action annulée. Que puis-je faire d\'autre pour vous ?' }
    ]);
    setPendingAction(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Conversation réinitialisée. Comment puis-je vous aider ?'
    }]);
    setConversationHistory([]);
    setPendingAction(null);
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Assistant IA"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Fenêtre de chat */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-title">
              <Bot size={20} />
              <span>Assistant Supaco</span>
              <Sparkles size={14} className="sparkle" />
            </div>
            <button className="clear-btn" onClick={clearChat} title="Nouvelle conversation">
              Effacer
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.role} ${message.isError ? 'error' : ''} ${message.isSuccess ? 'success' : ''}`}
              >
                <div className="message-avatar">
                  {message.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message assistant loading">
                <div className="message-avatar">
                  <Bot size={16} />
                </div>
                <div className="message-content">
                  <Loader2 size={16} className="spinner" />
                  <span>Réflexion en cours...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Boutons de confirmation d'action */}
          {pendingAction && !isLoading && (
            <div className="action-confirmation">
              <button className="confirm-btn" onClick={confirmAction}>
                <Check size={16} />
                Confirmer
              </button>
              <button className="cancel-btn" onClick={cancelAction}>
                <XCircle size={16} />
                Annuler
              </button>
            </div>
          )}

          {/* Suggestions */}
          {messages.length <= 1 && suggestions.length > 0 && !pendingAction && (
            <div className="chatbot-suggestions">
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-btn"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pendingAction ? "Confirmez ou annulez l'action..." : "Posez votre question..."}
              disabled={isLoading || pendingAction}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading || pendingAction}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
