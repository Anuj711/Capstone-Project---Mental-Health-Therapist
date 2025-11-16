'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Paperclip,
  Loader2,
  FileIcon,
  X,
  Sparkles
} from 'lucide-react';
import { ChatMessage } from '@/lib/definitions';
import { postChatMessage } from '@/lib/actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, getDocs, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { uploadFileToFirebase } from '@/lib/client-actions';
import { sendFileUrlToPythonAPI } from '@/lib/client-actions';
import { updateQuestionScores } from '@/lib/actions';

const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');

const assistantWelcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "Hello! I'm here to listen and support you. Please upload a file to begin.",
};




export function ChatLayout({ sessionId, sessionName }: { sessionId: string; sessionName: string }) {
  
  async function loadQuestionnaireJson() {
    if (!firestore || !user || !sessionId) return null;
    const questionsCol = collection(firestore, `users/${user.uid}/sessions/${sessionId}/questions`);
    const snapshot = await getDocs(questionsCol);
    const questionnaires: Record<string, any> = {};
    snapshot.forEach(docSnap => {
      questionnaires[docSnap.id] = docSnap.data();
    });
    return JSON.stringify(questionnaires);
  }

  const [messages, setMessages] = useState<ChatMessage[]>([assistantWelcomeMessage]);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  
  const messagesQuery = useMemoFirebase(() => {
    if (!user || !firestore || !sessionId) return null;
    return query(
      collection(firestore, `users/${user.uid}/sessions/${sessionId}/messages`),
      orderBy('timestamp', 'asc')
    );
  }, [user, firestore, sessionId]);

  const { data: initialMessages } = useCollection<ChatMessage>(messagesQuery);

  useEffect(() => {
    if (initialMessages) {
      // Avoid adding the welcome message if there are already messages from the DB
      if (initialMessages.length > 0) {
        setMessages(initialMessages);
      } else {
        setMessages([assistantWelcomeMessage]);
      }
    }
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast({ title: 'Not logged in', description: 'You must be logged in to chat.' });
      return;
    }
    
    setIsSending(true);

    try {
      // 1. Upload file to Firebase Storage
      const uploadResult = await uploadFileToFirebase(file,`${user.uid}`
      );
      
      if (!uploadResult.success || !uploadResult.url) {
         throw new Error(uploadResult.message || 'File upload failed.');
      }

      console.log('File uploaded. Access Token URL:', uploadResult.url);
      
      console.log(messages);
      const questionnaireJson = await loadQuestionnaireJson();
      const aiResponse = await sendFileUrlToPythonAPI(`${user.uid}`,sessionId, uploadResult.url, messages ?? [], questionnaireJson ?? '{}');
      console.log(aiResponse);

      await updateQuestionScores(`${user.uid}`,sessionId, aiResponse.diagnostic_mapping);

      


      // 2. Call the server action with the file URL
      
      await postChatMessage(user.uid, sessionId, aiResponse);
    } catch (error: any) {
      console.error('Error sending file:', error);
      toast({
        title: 'Action Failed',
        description: error.message || 'Could not upload or send your message.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
      // Reset the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const Message = ({ msg }: { msg: ChatMessage }) => {
    const isAssistant = msg.role === 'assistant';

    return (
      <div className={cn('flex items-start gap-4', isAssistant ? '' : 'justify-end')}>
        {isAssistant && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={cn(
            'max-w-md rounded-lg p-3',
            isAssistant ? 'bg-muted' : 'bg-primary text-primary-foreground'
          )}
        >
          {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}

          {msg.mediaUrl && (
            <div className="mt-2">
              {msg.mediaMimeType?.startsWith('image/') ||
              msg.mediaUrl.match(/\.(png|jpg|jpeg|gif)$/i) ? (
                <Image
                  src={msg.mediaUrl}
                  alt="Uploaded content"
                  width={200}
                  height={200}
                  className="rounded-lg object-cover"
                />
              ) : msg.mediaMimeType?.startsWith('video/') ||
                msg.mediaUrl.endsWith('.mp4') ? (
                <video src={msg.mediaUrl} width="200" controls className="rounded-lg" />
              ) : (
                <div className="p-2 bg-background/50 rounded-lg text-sm">
                  <a
                    href={msg.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <FileIcon size={16} />
                    <span>{msg.mediaMimeType || 'Attachment'}</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
        {!isAssistant && (
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL || userAvatar?.imageUrl} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-background">
        <h2 className="text-xl font-semibold truncate">{sessionName}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, i) => (
          <Message key={msg.id || i} msg={msg} />
        ))}
         {isSending && (
          <div className="flex items-start gap-4 justify-end">
            <div className="max-w-md rounded-lg p-3 bg-primary text-primary-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Sending...</span>
            </div>
             <Avatar className="h-8 w-8">
              <AvatarImage src={user?.photoURL || userAvatar?.imageUrl} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t bg-background">
        <div className="flex justify-center items-center h-full">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              size="lg"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Paperclip className="w-5 h-5 mr-2" />
                  <span>Upload a File</span>
                </>
              )}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
              disabled={isSending}
            />
        </div>
      </div>
    </div>
  );
}
