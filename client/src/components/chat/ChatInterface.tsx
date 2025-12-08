import { ClinicalDisclaimer } from '@/components/ui/clinical-disclaimer';
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatMessage } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, XCircle, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ChatInterface() {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chat messages
  const {
    data: messages = [] as ChatMessage[],
    isLoading,
    error,
  } = useQuery<ChatMessage[], Error>({
    queryKey: ['/api/chat/messages'],
    refetchOnWindowFocus: false,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', '/api/chat/messages', { content });
    },
    onSuccess: () => {
      // Clear the input field and refetch messages
      setMessage('');
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send message',
        description: 'Please try again later.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    },
  });

  // Clear chat history mutation
  const clearChatMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', '/api/chat/messages');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
      toast({
        title: 'Chat history cleared',
        description: 'All previous messages have been removed.',
      });
    },
    onError: (error) => {
      console.error('Error clearing chat history:', error);
      toast({
        title: 'Failed to clear chat history',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    sendMessageMutation.mutate(message);
  };

  // Format timestamp to readable format
  const formatTime = (timestamp: string | Date | undefined) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Health Assistant</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium">Failed to load chat</h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading your chat history.
            </p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] })}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="px-4 py-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl">Health Assistant</CardTitle>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All messages will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => clearChatMutation.mutate()}>
                {clearChatMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Clear History"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[400px] px-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <h3 className="text-lg font-medium mb-2">Welcome to your Health Assistant</h3>
              <p className="text-muted-foreground mb-6">
                Ask questions about your health records, medications, or health conditions.
              </p>
              <div className="bg-muted p-3 rounded-lg w-full max-w-md">
                <p className="text-sm font-medium mb-2">Try asking:</p>
                <ul className="text-sm space-y-1 text-left">
                  <li>"What health conditions do I have?"</li>
                  <li>"Tell me about my medication list"</li>
                  <li>"What were my latest lab results?"</li>
                  <li>"Do I have any allergies?"</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((msg: ChatMessage) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                      }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs opacity-70">
                        {msg.role === 'user' ? 'You' : 'Assistant'} • {formatTime(msg.timestamp)}
                      </span>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messageEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 pt-2 flex-col gap-2">
        <form onSubmit={handleSubmit} className="w-full flex space-x-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about your health records..."
            className="flex-1 min-h-[60px] resize-none"
            disabled={isSubmitting}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (message.trim()) {
                  handleSubmit(e);
                }
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            disabled={!message.trim() || isSubmitting}
            className="h-[60px] w-[60px]"
            onClick={(e) => handleSubmit(e as any)}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
        <ClinicalDisclaimer variant="compact" />
      </CardFooter>
    </Card>
  );
}