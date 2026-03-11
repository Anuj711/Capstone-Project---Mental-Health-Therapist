'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Video, CheckCircle2, FileText } from 'lucide-react';
import { ChatMessage } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useMemoFirebase, useDoc, useCollection } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { uploadFileToFirebase, sendFileUrlToPythonAPI } from '@/lib/client-actions';
import { postChatMessage, enablePCL5Assessment } from '@/lib/actions';
import { useVideoRecording } from '@/hooks/useVideoRecording';
import { RecordingOverlay } from './RecordingOverlay';
import { MessageBubble } from './MessageBubble';
import { useRouter } from 'next/navigation';

export function ChatLayout({ sessionId, sessionName }: { sessionId: string; sessionName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
  const sufficientDataCollected = sessionData?.sufficientDataCollected || false;

  // Show completion banner for BOTH ended-complete AND resumed statuses
  const showCompletionBanner = (sessionStatus === 'ended-complete' || sessionStatus === 'resumed') && 
                                (sessionData?.summaryData || sufficientDataCollected);

  useEffect(() => {
    if (initialMessages) {
      if (initialMessages.length > 0) {
        setMessages(initialMessages);
      } else {
        const firstGreeting: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          text: "Welcome. I’m here to listen and support you. As we begin, it can be helpful to look back at the last couple of weeks together. Have you noticed yourself struggling with a lack of interest lately, or perhaps feeling like the things that usually bring you joy just aren't sparking that same pleasure?",
          timestamp: new Date(),
        };
        setMessages([firstGreeting]);
      }
    }
  }, [initialMessages]);

  const handleRecordingStop = async (blob: Blob) => {
    if (!blob) return;
    setIsSending(true);

    try {
      const file = new File([blob], `video-note-${Date.now()}.webm`, { type: 'video/webm' });
      const uploadResult = await uploadFileToFirebase(file, `${user!.uid}`);
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.message || 'File upload failed.');
      }

      // Send current state to backend
      const currentAnswers = sessionData?.user_answers || [];
      const currentSummary = sessionData?.rolling_summary || "";
      const currentScores = sessionData?.diagnostic_scores || {};

      const aiResponse = await sendFileUrlToPythonAPI(
        sessionId,
        `${user!.uid}`,
        uploadResult.url,
        currentAnswers,
        currentSummary,
        currentScores,
        sessionStatus
      );

      if (aiResponse.trauma_detected) {
        console.log('Trauma detected - enabling PCL-5 assessment');
      
        const enableResult = await enablePCL5Assessment(user!.uid, sessionId);
        
          if(enableResult.success) {  
            console.log('PCL-5 assessment enabled successfully');
          } else {
            console.error('Failed to enable PCL-5 assessment:', enableResult.message);
          }
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleRecordClick = async () => {
    if (isRecording) stopRecording();
    else await startRecording();
  };

  const handleViewResults = () => router.push(`/session-summary/${sessionId}`);

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
                  {isResumedMode ? 'Assessment Summary Available' : 'Assessment Complete!'}
                </h3>
                <p className="text-xs text-green-700">
                  {isResumedMode 
                    ? 'Your diagnostic results are ready to view anytime.' 
                    : 'Your diagnostic questionnaire is finished. View your results.'}
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