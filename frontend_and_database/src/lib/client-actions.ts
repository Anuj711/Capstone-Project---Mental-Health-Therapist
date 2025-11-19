'use client';

import { getFirestore, collection, doc, deleteDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Message } from '@/types/messages';
import { ChatMessage } from '@/lib/definitions';

/**
 * Deletes a journal entry using the client Firestore SDK.
 * This runs safely in the browser as long as Firestore security rules
 * ensure users can only delete their own data.
 */
export async function deleteJournalEntryClient(userId: string, entryId: string) {
  try {
    const db = getFirestore(getApp());
    const ref = doc(db, `users/${userId}/journalEntries/${entryId}`);
    await deleteDoc(ref);
    return { success: true, message: 'Journal entry deleted successfully.' };
  } catch (error) {
    console.error('Error deleting entry:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred.';
    return { success: false, message };
  }
}

/**
 * Updates a journal entry using the client Firestore SDK.
 * This runs safely in the browser as long as Firestore security rules
 * ensure users can only update their own data.
 */
export async function updateJournalEntryClient(
  userId: string,
  entryId: string,
  data: { content: string; mood: string }
) {
  try {
    const db = getFirestore(getApp());
    const entryRef = doc(db, `users/${userId}/journalEntries/${entryId}`);
    
    await updateDoc(entryRef, {
      content: data.content,
      mood: data.mood,
      updatedAt: serverTimestamp(),
    });

    return { success: true, message: 'Entry updated successfully' };
  } catch (error) {
    console.error('Error updating journal entry:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred.';
    return { success: false, message };
  }
}

/**
 * Uploads a file to Firebase Cloud Storage and returns its download URL.
 * 
 * @param file The file to upload (from an <input type="file"> or File object)
 * @param path Optional storage path (e.g. "users/{userId}/uploads")
 * @returns The download URL for the uploaded file
 */

export async function uploadFileToFirebase(file: File, userId: string) {
  try {
    const storage = getStorage(getApp());
    const uniqueName = `${crypto.randomUUID()}-${file.name}`;
    // Correct the path to match storage rules: /users/{userId}/{fileName}
    const fileRef = ref(storage, `/user_uploads/${userId}/${uniqueName}`);

    const snapshot = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return { success: true, url, mimeType: file.type };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown storage error occurred.";
    console.error('File upload error:', message);
    return {
      success: false,
      message: message,
    };
  }
}

export async function sendFileUrlToPythonAPI(session_id: string, user_id: string, video_url: string, past_turns: ChatMessage[], questionnaires: string) {
    try {
      const payload = {
        session_id,
        user_id,
        video_url,
        past_turns,
        questionnaires,
      };
      console.log(payload);
      const response = await fetch("http://localhost:8000/analyze_turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error sending payload:", error);
      throw error;
    }
  }