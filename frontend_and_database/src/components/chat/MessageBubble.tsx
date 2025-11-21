import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ChatMessage } from '@/lib/definitions';

interface MessageBubbleProps {
  msg: ChatMessage;
  userPhotoURL?: string | null;
  userDisplayName?: string | null;
}

export function MessageBubble({ msg, userPhotoURL, userDisplayName }: MessageBubbleProps) {
  const isAssistant = msg.role === 'assistant';

  return (
    <div className={cn('flex items-start gap-3', isAssistant ? '' : 'justify-end')}>
      {isAssistant && (
        <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
          <AvatarImage src="/bot.png" alt="AI Therapist" className="object-cover" />
          <AvatarFallback className="bg-textPrimary text-white">
            <Sparkles className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-3 break-words',
          isAssistant
            ? 'bg-gray-100 text-gray-900'
            : 'bg-textPrimary  to-purple-600 text-white'
        )}
      >
        {isAssistant && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-600">AI Therapist</span>
          </div>
        )}
        
        {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}

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
              msg.mediaUrl.match(/\.(mp4|webm)$/i) ? (
              <video src={msg.mediaUrl} width={300} controls className="rounded-lg" />
            ) : (
              <div className="p-2 bg-white/10 rounded-lg text-sm">
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
        <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
          <AvatarImage src={userPhotoURL || undefined} />
          <AvatarFallback className="bg-gray-300 text-gray-700">
            {userDisplayName?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}