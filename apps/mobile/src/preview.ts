import type { Message } from '@/types';
import { isEmojiOnly } from '@/emoji';

export function previewText(message: Message): string {
  if (message.deletedAt) return 'Message removed';
  if (message.attachments.length) {
    const media = message.attachments.find((attachment) => attachment.mimeType.startsWith('image/') || attachment.mimeType.startsWith('video/'));
    if (media) return media.mimeType.startsWith('video/') ? 'Video' : 'Photo';
    if (message.attachments.some((attachment) => (attachment.name ?? '').startsWith('GIPHY:'))) return 'GIF';
    if (message.attachments.some((attachment) => attachment.mimeType.startsWith('audio/'))) return 'Voice message';
  }
  if (message.content && isEmojiOnly(message.content)) return message.content;
  return message.content || 'Attachment';
}
