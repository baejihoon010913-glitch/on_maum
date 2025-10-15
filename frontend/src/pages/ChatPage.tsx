import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, Button, Input } from '@/components/UI';
import { chatApi } from '@/api';
import { ChatSession, Message } from '@/types';
import { useWebSocket, WebSocketMessage } from '@/utils/useWebSocket';
import { useAuthStore } from '@/store';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-scroll refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Current user from auth store
  const currentUser = authStore.getState().user;

  // WebSocket connection
  const {
    connectionStatus,
    sendMessage: sendWebSocketMessage,
    disconnect: disconnectWebSocket,
  } = useWebSocket({
    sessionId: currentSession?.id || '',
    onMessage: handleWebSocketMessage,
    onOpen: () => console.log('Chat WebSocket connected'),
    onClose: () => console.log('Chat WebSocket disconnected'),
    onError: (error) => console.error('Chat WebSocket error:', error),
  });

  // Load sessions on component mount
  useEffect(() => {
    loadChatSessions();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSession) {
      loadChatMessages();
    }
  }, [currentSession]);

  // Handle session selection from URL
  useEffect(() => {
    if (sessionId && sessions.length > 0) {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setCurrentSession(session);
      }
    } else if (sessions.length > 0 && !currentSession) {
      // Select first session if none selected
      setCurrentSession(sessions[0]);
    }
  }, [sessionId, sessions]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages]);

  // Handle scroll detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setIsAtBottom(atBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  function handleWebSocketMessage(message: WebSocketMessage) {
    console.log('Received WebSocket message:', message);

    switch (message.type) {
      case 'message':
        // Add new message to the list
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === message.data.id)) {
            return prev;
          }
          return [...prev, message.data];
        });
        break;

      case 'session_started':
        // Update session status
        if (currentSession) {
          setCurrentSession({
            ...currentSession,
            status: 'active',
            actual_start_time: message.data.start_time,
          });
        }
        break;

      case 'session_ended':
        // Update session status
        if (currentSession) {
          setCurrentSession({
            ...currentSession,
            status: 'completed',
            actual_end_time: message.data.end_time,
          });
        }
        break;

      case 'error':
        console.error('WebSocket error message:', message.data);
        setError(message.data.message || '채팅 중 오류가 발생했습니다.');
        break;
    }
  }

  const loadChatSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatApi.getMyChatSessions();
      setSessions(data);
    } catch (err) {
      console.error('Error loading chat sessions:', err);
      setError('채팅 세션을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async () => {
    if (!currentSession) return;

    try {
      const data = await chatApi.getChatMessages(currentSession.id);
      setMessages(data);
    } catch (err) {
      console.error('Error loading chat messages:', err);
      setError('메시지를 불러오는데 실패했습니다.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !currentSession || sendingMessage) {
      return;
    }

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);

    try {
      // Send via WebSocket first for real-time delivery
      if (connectionStatus === 'connected') {
        sendWebSocketMessage(messageContent);
      } else {
        // Fallback to HTTP API if WebSocket is not connected
        await chatApi.sendChatMessage(currentSession.id, { content: messageContent });
        // Reload messages to get the new one
        await loadChatMessages();
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('메시지 전송에 실패했습니다.');
      // Restore the message on error
      setNewMessage(messageContent);
    } finally {
      setSendingMessage(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSessionDate = (session: ChatSession) => {
    const date = new Date(session.scheduled_date);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: ChatSession['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: ChatSession['status']) => {
    switch (status) {
      case 'pending': return '예정';
      case 'active': return '진행중';
      case 'completed': return '완료';
      case 'cancelled': return '취소';
      default: return status;
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'reconnecting': return 'text-orange-600';
      case 'error': return 'text-red-600';
      case 'disconnected': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '연결됨';
      case 'connecting': return '연결 중...';
      case 'reconnecting': return '재연결 중...';
      case 'error': return '연결 오류';
      case 'disconnected': return '연결 끊김';
      default: return connectionStatus;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">채팅 세션을 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h1 className="text-responsive-2xl font-bold text-gray-900">상담</h1>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-red-600">{error}</p>
              <Button onClick={loadChatSessions} className="mt-4">
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-responsive-2xl font-bold text-gray-900">상담</h1>
              <p className="text-responsive-sm text-gray-600 mt-2">
                전문 상담사와 1:1로 대화하며 도움을 받아보세요
              </p>
            </div>
            <Button onClick={() => navigate('/counselors')}>
              새 상담 예약
            </Button>
          </div>
        </CardHeader>
      </Card>

      {sessions.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <div className="mb-4">💬</div>
              <p className="text-responsive-base mb-2">아직 상담 세션이 없습니다.</p>
              <p className="text-sm mb-4">상담사를 선택하여 첫 상담을 시작해보세요.</p>
              <Button onClick={() => navigate('/counselors')}>
                상담사 찾기
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sessions List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">상담 세션</h2>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setCurrentSession(session);
                        navigate(`/chat?session=${session.id}`);
                      }}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4 ${currentSession?.id === session.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-transparent'
                        }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {formatSessionDate(session)}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                            {getStatusText(session.status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {session.scheduled_start_time} - {session.scheduled_end_time}
                        </p>
                        {session.category && (
                          <p className="text-xs text-gray-500">{session.category}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            {currentSession ? (
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {formatSessionDate(currentSession)} 상담
                      </h2>
                      <p className="text-sm text-gray-600">
                        {currentSession.scheduled_start_time} - {currentSession.scheduled_end_time}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-medium ${getConnectionStatusColor()}`}>
                        ● {getConnectionStatusText()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(currentSession.status)}`}>
                        {getStatusText(currentSession.status)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 flex flex-col p-0">
                  <div
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                  >
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>아직 메시지가 없습니다.</p>
                        <p className="text-sm mt-1">첫 메시지를 보내보세요!</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isCurrentUser = message.sender_id === currentUser?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isCurrentUser
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                                }`}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              <p
                                className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-100' : 'text-gray-500'
                                  }`}
                              >
                                {formatMessageTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Scroll to Bottom Button */}
                  {!isAtBottom && (
                    <div className="flex justify-center pb-2">
                      <button
                        onClick={scrollToBottom}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full hover:bg-gray-300 transition-colors"
                      >
                        ↓ 아래로
                      </button>
                    </div>
                  )}

                  {/* Message Input */}
                  <div className="border-t border-gray-200 p-4">
                    <form onSubmit={handleSendMessage} className="flex space-x-2">
                      <Input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="메시지를 입력하세요..."
                        disabled={currentSession.status !== 'active' && currentSession.status !== 'pending'}
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        disabled={
                          !newMessage.trim() ||
                          sendingMessage ||
                          (currentSession.status !== 'active' && currentSession.status !== 'pending')
                        }
                      >
                        {sendingMessage ? '전송 중...' : '전송'}
                      </Button>
                    </form>

                    {(currentSession.status === 'completed' || currentSession.status === 'cancelled') && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        이 상담 세션은 종료되었습니다.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <p>상담 세션을 선택하여 채팅을 시작하세요.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;