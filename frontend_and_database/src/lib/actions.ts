'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { JournalEntry, Mood, ChatMessage } from './definitions';
import admin, { firestore } from 'firebase-admin';


// Helper to get the initialized Firebase Admin App
function getAdminApp() {
  console.log("Admin apps:", admin.apps.length);
  if (admin.apps.length > 0) {
    return admin.app();
  }
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

//Take AI Response and question bank with scores if any
type DiagnosticMapping = Record<string, Record<string, { score: number }>>;
export async function updateQuestionScores(
  userId: string,
  sessionId: string,
  mapping: DiagnosticMapping
) {
  const adminDb = getAdminApp().firestore();
  const questionsCollection = adminDb
    .doc(`users/${userId}/sessions/${sessionId}`)
    .collection('questions');

  for (const [assessmentName, questionMap] of Object.entries(mapping)) {
    const updates = Object.entries(questionMap).reduce(
      (acc, [questionId, { score }]) => {
        acc[questionId] = { score };
        return acc;
      },
      {} as Record<string, { score: number }>
    );

    await questionsCollection.doc(assessmentName).set(
      {
        questions: updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
}
// --------------------
// Journal entry schema
// --------------------
const NewEntrySchema = z.object({
  content: z.string().min(1, 'Journal entry cannot be empty.'),
  mood: z.enum(['Happy', 'Calm', 'Neutral', 'Sad', 'Anxious']),
  userId: z.string().min(1, 'User ID is required.'),
});

// --------------------
// Journal entry creation
// --------------------
export async function createJournalEntry(prevState: any, formData: FormData) {
  const validatedFields = NewEntrySchema.safeParse({
    content: formData.get('content'),
    mood: formData.get('mood'),
    userId: formData.get('userId'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to create entry.',
      success: false,
    };
  }

  const { content, mood, userId } = validatedFields.data;

  try {
    const adminDb = getAdminApp().firestore();
    await adminDb.collection(`users/${userId}/journalEntries`).add({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      mood: mood as Mood,
      content,
      userId,
    });

    revalidatePath('/journal');
    revalidatePath('/dashboard');
    return { message: 'Journal entry created successfully.', success: true };
  } catch (error) {
    console.error('Error creating journal entry:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `Error saving to database: ${errorMessage}`, success: false };
  }
}

// --------------------
// Journal entry deletion
// --------------------
export async function deleteJournalEntry(userId: string, entryId: string): Promise<{ success: boolean; message?: string }> {
    try {
        const adminDb = getAdminApp().firestore();
        const entryRef = adminDb.doc(`users/${userId}/journalEntries/${entryId}`);
        await entryRef.delete();

        revalidatePath('/journal');
        revalidatePath('/dashboard');
        return { success: true, message: 'Journal entry deleted.' };
    } catch (error) {
        console.error('Error deleting journal entry:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message };
    }
}


// --------------------
// Chat message posting
// --------------------
export async function postChatMessage(
  userId: string,
  sessionId: string,
  aiResponse: Object
): Promise<{ success: boolean; message?: string } > {
  try {
    //UNPACKING aiResponse object
    const { assemblyAI_output, bot_reply, deepface_output, diagnostic_mapping } = aiResponse as {
      assemblyAI_output: { transcript: string, sentiment: string};
      bot_reply: string;
      deepface_output:[];
      diagnostic_mapping:[];
      
    };

    // Data about User given by AI
    const adminDb = getAdminApp().firestore();
    const messagePath = `users/${userId}/sessions/${sessionId}/messages`;
    const userMessageData = {
      role: 'user' as const,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId,
      text: assemblyAI_output.transcript,
      sentiment: assemblyAI_output.sentiment,
      emotions: deepface_output,
      question_scores: diagnostic_mapping
    };
    
    // Write user data to Firestore
    await adminDb.collection(messagePath).add(userMessageData);
    
    // Simulate assistant response
    const assistantResponse: ChatMessage = {
      role: 'assistant' as const,
      id: new Date().toISOString(),
      text: bot_reply
    };

    // Write assistant message to Firestore
    await adminDb.collection(messagePath).add({
      text: assistantResponse.text,
      role: 'assistant',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId,
    });

    revalidatePath('/chat');
    return { success: true };
    
  } catch (error) {
    console.error('Error processing chat message:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message };
  }
}

// --------------------
// Delete one session
// --------------------
export async function deleteChatSession(
  userId: string,
  sessionId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const adminDb = getAdminApp().firestore();
    const sessionRef = adminDb.doc(`users/${userId}/sessions/${sessionId}`);
    
    const messagesSnapshot = await adminDb.collection(`users/${userId}/sessions/${sessionId}/messages`).get();
    
    const batch = adminDb.batch();
    
    if (!messagesSnapshot.empty) {
        messagesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
    }

    batch.delete(sessionRef);
    await batch.commit();
    
    revalidatePath('/chat');
    return { success: true };
  } catch (error) {
    console.error('Error deleting chat session:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message };
  }
}


// --------------------
// Rename a session
// --------------------
export async function renameChatSession(
  userId: string,
  sessionId: string,
  newName: string
): Promise<{ success: boolean; message?: string }> {
  const schema = z.string().min(1, "Name cannot be empty").max(50, "Name is too long");
  const validation = schema.safeParse(newName);

  if (!validation.success) {
    return { success: false, message: validation.error.errors[0].message };
  }
  
  try {
    const adminDb = getAdminApp().firestore();
    const sessionRef = adminDb.doc(`users/${userId}/sessions/${sessionId}`);
    await sessionRef.update({ name: newName });
    revalidatePath('/chat');
    return { success: true };
  } catch (error) {
    console.error('Error renaming chat session:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message };
  }
}
