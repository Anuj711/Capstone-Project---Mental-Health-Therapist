'use client';

import { getFirestore, doc, deleteDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const db = getFirestore(getApp());

/**
 * Deletes a journal entry using the client Firestore SDK.
 * This runs safely in the browser as long as Firestore security rules
 * ensure users can only delete their own data.
 */
export async function deleteJournalEntryClient(userId: string, entryId: string) {
  try {
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
    return { success: false, message: message };
  }
}

export async function sendFileUrlToPythonAPI(
  session_id: string, 
  user_id: string, 
  video_url: string, 
  user_answers: Array<{q_id: string; user_answer: string}>, 
  rolling_summary: string,
  last_bot_reply: string,
  diagnostic_scores: Record<string, number>,
  session_status: string="active"
) {
  try {
    const payload = {
      session_id, user_id, video_url, user_answers, 
      rolling_summary, last_bot_reply, diagnostic_scores, session_status
    };
    
    const response = await fetch("http://localhost:8000/analyze_turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Backend error: ${await response.text()}`);
    
    const data = await response.json();
    console.log('✅ Backend response:', data);
    const sessionRef = doc(db, `users/${user_id}/sessions/${session_id}`);
    
    const updates: any = {
      rolling_summary: data.rolling_summary,
      user_answers: data.user_answers,
      sufficientDataCollected: data.sufficientDataCollected,
      updatedAt: serverTimestamp(),
    };

    // TODO: update diagnostic_scores and fix completion percentage
    if (data.diagnostic_scores) {
      Object.entries(data.diagnostic_scores).forEach(([qId, score]) => {
        updates[`diagnostic_scores.${qId}`] = increment(score as number);
      });
    }

    await updateDoc(sessionRef, updates);
    return data;
  } catch (error) {
    console.error("Error sending payload:", error);
    throw error;
  }
}

export async function sendStatusUpdates(
  session_id: string, 
  user_id: string,
  new_status: string
) {
  try {
    const sessionRef = doc(db, `users/${user_id}/sessions/${session_id}`);

    const updates: any = {
      status: new_status,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(sessionRef, updates);
  } catch (error) {
    console.error("Error updating status:", error);
    throw error;
  }
}