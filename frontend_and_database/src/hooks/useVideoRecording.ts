import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';

export function useVideoRecording(onRecordingStop: (blob: Blob) => Promise<void>) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: true 
      });
      
      streamRef.current = stream;
      setIsRecording(true);
      
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      if (videoPreviewRef.current && stream) {
        videoPreviewRef.current.srcObject = stream;
        try {
          await videoPreviewRef.current.play();
        } catch (playError) {
          console.error('Error playing video:', playError);
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          await onRecordingStop(blob);
        }
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error: any) {
      const errorMessages: Record<string, string> = {
        'NotAllowedError': 'Please allow camera and microphone access in your browser settings.',
        'NotFoundError': 'No camera or microphone found on your device.',
        'NotReadableError': 'Your camera or microphone is already being used by another application.',
        'OverconstrainedError': 'Could not start camera with the requested settings.',
      };
      
      toast({
        title: 'Camera Access Error',
        description: errorMessages[error.name] || 'Could not access camera and microphone.',
        variant: 'destructive',
      });
    }
  }, [toast, onRecordingStop]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setIsRecording(false);
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const resetRecording = useCallback(() => {
    chunksRef.current = [];
    setRecordingTime(0);
  }, []);

  return {
    isRecording,
    recordingTime,
    isSending,
    setIsSending,
    videoPreviewRef,
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
  };
}