'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Video } from 'lucide-react';
import { ChatMessage } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { uploadFileToFirebase, sendFileUrlToPythonAPI } from '@/lib/client-actions';
import { postChatMessage, updateQuestionScores } from '@/lib/actions';
import { useVideoRecording } from '@/hooks/useVideoRecording';
import { RecordingOverlay } from './RecordingOverlay';
import { MessageBubble } from './MessageBubble';

const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');

const assistantWelcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "Hello! I'm here to listen and support you. Record a video note to share how you're feeling.",
  timestamp: new Date(),
};

export function ChatLayout({ sessionId, sessionName }: { sessionId: string; sessionName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([assistantWelcomeMessage]);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const messagesQuery = useMemoFirebase(() => {
    if (!user || !firestore || !sessionId) return null;
    return query(
      collection(firestore, `users/${user.uid}/sessions/${sessionId}/messages`),
      orderBy('timestamp', 'asc')
    );
  }, [user, firestore, sessionId]);

  const { data: initialMessages } = useCollection<ChatMessage>(messagesQuery);

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

  const handleRecordingStop = async (blob: Blob) => {
    if (!blob) return;
    setIsSending(true);

    try {
      const file = new File([blob], `video-note-${Date.now()}.webm`, { type: 'video/webm' });
      const uploadResult = await uploadFileToFirebase(file, `${user!.uid}`);
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.message || 'File upload failed.');
      }

      const questionnaireJson = await loadQuestionnaireJson();
      const aiResponse = await sendFileUrlToPythonAPI(
        `${user!.uid}`,
        sessionId,
        uploadResult.url,
        messages ?? [],
        questionnaireJson ?? '{}'
      );

      await updateQuestionScores(`${user!.uid}`, sessionId, aiResponse.diagnostic_mapping);
      await postChatMessage(user!.uid, sessionId, aiResponse);
    } catch (error: any) {
      console.error('Error sending video:', error);
      toast({
        title: 'Action Failed',
        description: error.message || 'Could not upload or send your message.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
      resetRecording();
    }
  };

  const {
    isRecording,
    recordingTime,
    isSending,
    setIsSending,
    videoPreviewRef,
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
  } = useVideoRecording(handleRecordingStop);

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages.length > 0 ? initialMessages : [assistantWelcomeMessage]);
    }
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleRecordClick = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b bg-white flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-500 fill-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">Therapy Conversation</h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Your messages are private and secure</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.map((msg, i) => (
          <MessageBubble 
            key={msg.id || i} 
            msg={msg} 
            userPhotoURL={user?.photoURL} 
            userDisplayName={user?.displayName} 
          />
        ))}
        {isSending && (
          <div className="flex items-start gap-3 justify-end">
            <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-textPrimary text-white flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              <span className="text-sm">Processing video...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Recording Preview Overlay */}
      <RecordingOverlay
        isRecording={isRecording}
        recordingTime={recordingTime}
        videoPreviewRef={videoPreviewRef}
        onCancel={cancelRecording}
        onStop={stopRecording}
      />

      {/* Input Area - Video Note Button */}
      <div className="flex-shrink-0 px-6 py-4 border-t bg-white">
        <div className="flex items-center justify-center">
          <Button
            type="button"
            onClick={handleRecordClick}
            disabled={isSending}
            size="lg"
            className={cn(
              "rounded-full h-14 w-14 transition-all disabled:opacity-50 flex-shrink-0",
              isRecording 
                ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                : "bg-textPrimary hover:to-textSecondary"
            )}
          >
            {isSending ? (
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            ) : (
              <Video className="h-6 w-6 text-white" />
            )}
          </Button>
        </div>
        <p className="text-xs text-center text-gray-400 mt-3">
          {isRecording ? 'Click to stop and send' : 'Click to start recording'}
        </p>
      </div>
    </div>
  );
}