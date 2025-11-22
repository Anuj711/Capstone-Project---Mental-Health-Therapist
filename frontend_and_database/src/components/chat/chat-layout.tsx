'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Video, CheckCircle2, FileText } from 'lucide-react';
import { ChatMessage } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, getDocs } from 'firebase/firestore';
import { uploadFileToFirebase, sendFileUrlToPythonAPI } from '@/lib/client-actions';
import { postChatMessage, updateQuestionScores } from '@/lib/actions';
import { useVideoRecording } from '@/hooks/useVideoRecording';
import { RecordingOverlay } from './RecordingOverlay';
import { MessageBubble } from './MessageBubble';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  
  // Get session document to check status
  const sessionQuery = useMemoFirebase(() => {
    if (!user || !firestore || !sessionId) return null;
    return doc(firestore, `users/${user.uid}/sessions/${sessionId}`);
  }, [user, firestore, sessionId]);

  const { data: sessionData } = useDoc(sessionQuery);
  
  const messagesQuery = useMemoFirebase(() => {
    if (!user || !firestore || !sessionId) return null;
    return query(
      collection(firestore, `users/${user.uid}/sessions/${sessionId}/messages`),
      orderBy('timestamp', 'asc')
    );
  }, [user, firestore, sessionId]);

  const { data: initialMessages } = useCollection<ChatMessage>(messagesQuery);

  const sessionStatus = sessionData?.status || 'active';
  const completionPercentage = sessionData?.completionPercentage || 0;

  // Show completion banner instead of auto-redirecting
  const showCompletionBanner = sessionStatus === 'ended-complete';

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
        sessionId,
        `${user!.uid}`,
        uploadResult.url,
        messages ?? [],
        questionnaireJson ?? '{}'
      );

    // update scores only if diagnostic data is present
      if (aiResponse.diagnostic_mapping && Object.keys(aiResponse.diagnostic_mapping).length > 0) {
        await updateQuestionScores(`${user!.uid}`, sessionId, aiResponse.diagnostic_mapping);
      }
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

  const handleViewResults = () => {
    router.push(`/session-summary/${sessionId}`);
  };

  const canRecord = sessionStatus === 'active' || sessionStatus === 'resumed';
  const isResumedMode = sessionStatus === 'resumed';

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-500 fill-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">
                {isResumedMode ? 'Free Talk Session' : 'Therapy Conversation'}
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {isResumedMode 
                ? 'Chat about anything on your mind' 
                : 'Your messages are private and secure'}
            </p>
          </div>
          
          {sessionStatus === 'active' && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{completionPercentage}% Complete</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completion Banner */}
      {showCompletionBanner && (
        <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-green-900">
                  Assessment Complete!
                </h3>
                <p className="text-xs text-green-700">
                  Your diagnostic questionnaire is finished. View your results.
                </p>
              </div>
            </div>
            <Button
              onClick={handleViewResults}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Results
            </Button>
          </div>
        </div>
      )}

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
            <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-2">
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

      {/* Input Area */}
      <div className="flex-shrink-0 px-6 py-4 border-t bg-white">
        <div className="flex items-center justify-center">
          <Button
            type="button"
            onClick={handleRecordClick}
            disabled={isSending || !canRecord}
            size="lg"
            className={cn(
              "rounded-full h-14 w-14 transition-all disabled:opacity-50 flex-shrink-0",
              isRecording 
                ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                : "bg-textPrimary hover:from-indigo-700 hover:to-purple-700"
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
          {isRecording ? 'Click to stop and send' : 
           isResumedMode ? 'Free talk mode - chat about anything' :
           'Click to start recording'}
        </p>
      </div>
    </div>
  );
}