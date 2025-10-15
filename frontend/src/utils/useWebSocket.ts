import { useEffect, useRef, useState, useCallback } from 'react';
import { authStore } from '@/store';

export interface WebSocketMessage {
  type: 'message' | 'user_joined' | 'user_left' | 'session_started' | 'session_ended' | 'error';
  data: any;
  timestamp?: string;
}

export interface UseWebSocketOptions {
  sessionId: string;
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface UseWebSocketReturn {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  sendMessage: (content: string) => void;
  disconnect: () => void;
  connect: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    sessionId,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<UseWebSocketReturn['connectionStatus']>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'development' 
      ? 'localhost:8000' 
      : window.location.host;
    
    const tokens = authStore.getState().tokens;
    const accessToken = tokens?.access_token;
    
    if (!accessToken) {
      throw new Error('No access token available');
    }

    return `${protocol}//${host}/ws/chat/${sessionId}?token=${accessToken}`;
  }, [sessionId]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        reconnectCountRef.current = 0;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        wsRef.current = null;
        onClose?.();

        // Attempt to reconnect if it wasn't a manual disconnect
        if (!isManualDisconnectRef.current && reconnectCountRef.current < reconnectAttempts) {
          setConnectionStatus('reconnecting');
          reconnectCountRef.current += 1;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting attempt ${reconnectCountRef.current}/${reconnectAttempts}`);
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [getWebSocketUrl, onOpen, onMessage, onClose, onError, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'message',
        content,
        timestamp: new Date().toISOString(),
      };
      
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  // Auto-connect on mount and when sessionId changes
  useEffect(() => {
    isManualDisconnectRef.current = false;
    connect();

    return () => {
      disconnect();
    };
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    connectionStatus,
    sendMessage,
    disconnect,
    connect,
  };
};