'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Video, CheckCircle2, FileText } from 'lucide-react';
import { ChatMessage } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useMemoFirebase, useDoc, useCollection } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { uploadFileToFirebase, sendFileUrlToPythonAPI, sendStatusUpdates } from '@/lib/client-actions';
import { postChatMessage, enablePCL5Assessment, updateQuestionScores } from '@/lib/actions';
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
        const hasWelcome = initialMessages.some(m => m.id === 'welcome');
        if (!hasWelcome && initialMessages.length > 0) {
             const welcomeMsg: ChatMessage = {
                id: 'welcome',
                role: 'assistant',
                text: "Welcome. I’m here to listen and support you...",
                timestamp: new Date(initialMessages[0].timestamp.toDate().getTime() - 1000),
              };
              setMessages([welcomeMsg, ...initialMessages]);
        } else {
            setMessages(initialMessages);
        }
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

    if (sessionStatus === 'active' && (!sessionData?.question_tracker || !sessionData?.unanswered_question_ids)) {
      toast({
        title: "Initializing Session...",
        description: "Please wait a second for the session to sync and try again.",
      });
      return;
   }

    console.log("🔍 [STATE CHECK]");
    console.log("Current sessionStatus:", sessionStatus);
    console.log("Current Tracker ID:", sessionData?.question_tracker?.current_qs_id);
    console.log("Unanswered Count:", sessionData?.unanswered_question_ids?.length);
    console.log("Rolling Summary Length:", sessionData?.rolling_summary?.length);
  
    setIsSending(true);

    try {
      const file = new File([blob], `video-note-${Date.now()}.webm`, { type: 'video/webm' });
      const uploadResult = await uploadFileToFirebase(file, `${user!.uid}`);
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.message || 'File upload failed.');
      }

      const assistantMessages = messages.filter(m => m.role === 'assistant');
      const lastBotReply = assistantMessages.length > 0 
        ? assistantMessages[assistantMessages.length - 1].text 
        : null;

      // Send current state AND trackers to backend
      const currentAnswers = sessionData?.user_answers || [];
      const currentSummary = sessionData?.rolling_summary || "";
      const currentScores = sessionData?.diagnostic_scores || {};
      const tracker = sessionData?.question_tracker;
      const unanswered = sessionData?.unanswered_question_ids;
      const crisis_detected_persistent = sessionData?.crisisDetected || false;

      console.log("🚀 [SENDING TO BACKEND]", {
        tracker: sessionData?.question_tracker,
        unanswered: sessionData?.unanswered_question_ids
      });

      const aiResponse = await sendFileUrlToPythonAPI(
        sessionId,
        `${user!.uid}`,
        uploadResult.url,
        currentAnswers,
        currentSummary,
        lastBotReply,
        currentScores,
        sessionStatus,
        tracker,
        unanswered,
        crisis_detected_persistent
      );

      console.log("📥 [RECEIVED FROM BACKEND]", {
        next_qs: aiResponse.question_tracker?.current_qs_id,
        new_status: aiResponse.session_status
      });

      if (aiResponse.trauma_detected) {
        console.log('Trauma detected - enabling PCL-5 assessment');
      
        const enableResult = await enablePCL5Assessment(user!.uid, sessionId);
        
          if(enableResult.success) {  
            console.log('PCL-5 assessment enabled successfully');
          } else {
            console.error('Failed to enable PCL-5 assessment:', enableResult.message);
          }
        }

      // Update the question collection and global scores
      if (aiResponse.diagnostic_scores) {
        await updateQuestionScores(user!.uid, sessionId, aiResponse.diagnostic_scores);
      }

      await postChatMessage(user!.uid, sessionId, aiResponse);
      
      await sendStatusUpdates(
        sessionId,
        `${user!.uid}`,
        aiResponse.session_status)
    } catch (error: any) {
      if (error.message === "MISSING_TRANSCRIPT") {
        // Create a friendly local bot message
        const errorBotMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          text: "I'm sorry, I couldn't quite catch that. Could you please try re-recording? Please make sure your microphone is on and you're speaking clearly.",
          timestamp: new Date(),
        };
  
        // Add it to the UI locally so the user sees it immediately
        setMessages(prev => [...prev, errorBotMsg]);
        
        toast({
          title: "Audio Not Detected",
          description: "Please check your microphone settings.",
          variant: "default",
        });
      }
      else
      {
        console.error('Error sending video:', error);
        toast({
          title: 'Action Failed',
          description: error.message || 'Could not upload or send your message.',
          variant: 'destructive',
        });
      }
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
      <div className="flex-shrink-0 px-4 py-3 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-gray-700">
                {sessionName} - {isResumedMode ? 'Free Talk Mode' : 'Diagnostic Mode'}  
              </h2>
            </div>
            <p className="text-[0.6rem] text-gray-500 mt-0.5">
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
        <div className="flex-shrink-0 px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-green-900">
                  {isResumedMode ? 'Assessment Summary Available' : 'Assessment Complete!'}
                </h3>
                <p className="text-[0.6rem] text-green-700">
                  {isResumedMode 
                    ? 'Your diagnostic results are ready to view anytime.' 
                    : 'Your diagnostic questionnaire is finished. View your results.'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleViewResults}
              size="sm"
              className="text-xs bg-green-700 hover:bg-green-700 text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Results
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-gradient-to-b from-gray-50 to-white">
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
            <div className="max-w-[70%] rounded-xl px-4 py-2 bg-gray-200 text-black flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
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
      <div className="flex-shrink-0 px-4 py-2 border-t bg-white">
        <div className="flex items-center justify-center">
          <Button
            type="button"
            onClick={handleRecordClick}
            disabled={isSending || !canRecord}
            size="sm"
            className={cn(
              "rounded-full h-10 w-10 transition-all disabled:opacity-50 flex-shrink-0",
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
        <p className="text-[0.6rem] text-center text-gray-400 mt-3">
          {isRecording ? 'Click to stop and send' : 
           isResumedMode ? 'Free talk mode - chat about anything' :
           'Click to start recording'}
        </p>
      </div>
    </div>
  );
}