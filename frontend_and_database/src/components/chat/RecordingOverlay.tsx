import { Button } from '@/components/ui/button';
import { X, Circle } from 'lucide-react';

interface RecordingOverlayProps {
  isRecording: boolean;
  recordingTime: number;
  videoPreviewRef: React.RefObject<HTMLVideoElement>;
  onCancel: () => void;
  onStop: () => void;
}

export function RecordingOverlay({
  isRecording,
  recordingTime,
  videoPreviewRef,
  onCancel,
  onStop,
}: RecordingOverlayProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center gap-4">
      <div className="relative w-full max-w-md px-4">
        <video
          ref={videoPreviewRef}
          autoPlay
          muted
          playsInline
          className="rounded-lg w-full aspect-video object-cover bg-black"
        />
        <div className="absolute top-4 left-8 bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm font-semibold">
          <Circle className="h-2 w-2 fill-white animate-pulse" />
          {formatTime(recordingTime)}
        </div>
      </div>
      <div className="flex gap-4">
        <Button
          onClick={onCancel}
          variant="outline"
          size="lg"
          className="bg-white/10 hover:bg-white/20 text-white border-white/30"
        >
          <X className="h-5 w-5 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={onStop}
          size="lg"
          className="bg-textPrimary hover:to-textSecondary text-white"
        >
          Send Video Note
        </Button>
      </div>
    </div>
  );
}