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

// --------------------
// CREATE NEW SESSION
// --------------------
export async function createNewSession(
  userId: string,
  sessionName?: string
): Promise<{ success: boolean; sessionId?: string; message?: string }> {
  try {
    const adminDb = getAdminApp().firestore();
    
    // Create new session document
    const sessionRef = await adminDb.collection(`users/${userId}/sessions`).add({
      name: sessionName || `Session ${new Date().toLocaleDateString()}`,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completionPercentage: 0,
      totalQuestions: 36, // PHQ-9 (9) + GAD-7 (7) + PCL-5 (20)
      answeredQuestions: 0,
    });

    // Initialize diagnostic questionnaires with all questions set to null
    const questionsCollection = sessionRef.collection('questions');

    // PHQ-9 questions
    const phq9Questions: Record<string, { score: number | null }> = {};
    for (let i = 1; i <= 9; i++) {
      phq9Questions[`Q${i}_PHQ9`] = { score: null };
    }
    await questionsCollection.doc('PHQ-9').set({
      questions: phq9Questions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // GAD-7 questions
    const gad7Questions: Record<string, { score: number | null }> = {};
    for (let i = 1; i <= 7; i++) {
      gad7Questions[`Q${i}_GAD7`] = { score: null };
    }
    await questionsCollection.doc('GAD-7').set({
      questions: gad7Questions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // PCL-5 questions
    const pcl5Questions: Record<string, { score: number | null }> = {};
    for (let i = 1; i <= 20; i++) {
      pcl5Questions[`Q${i}_PCL5`] = { score: null };
    }
    await questionsCollection.doc('PCL-5').set({
      questions: pcl5Questions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    revalidatePath('/chat');
    return { success: true, sessionId: sessionRef.id };
  } catch (error) {
    console.error('Error creating new session:', error);
    const message = error instanceof Error ? error.message : 'Failed to create session';
    return { success: false, message };
  }
}

// --------------------
// CALCULATE ASSESSMENTS FROM DIAGNOSTIC MAPPING
// --------------------
function calculateAssessments(diagnosticMapping: DiagnosticMapping) {
  const assessments = [];

  for (const [assessmentName, questionMap] of Object.entries(diagnosticMapping)) {
    let totalScore = 0;
    let count = 0;

    // Sum up all scores for this assessment
    for (const [questionId, data] of Object.entries(questionMap)) {
      if (data.score !== null && data.score !== undefined) {
        totalScore += data.score;
        count++;
      }
    }

    // Set assessment-specific parameters
    let maxScore = 27;
    let severity = 'Minimal';
    let fullName = 'Major Depressive Disorder';

    if (assessmentName === 'GAD-7') {
      maxScore = 21;
      fullName = 'Generalized Anxiety Disorder';
      if (totalScore >= 15) severity = 'Severe';
      else if (totalScore >= 10) severity = 'Moderate';
      else if (totalScore >= 5) severity = 'Mild';
      else severity = 'Minimal';
    } else if (assessmentName === 'PCL-5') {
      maxScore = 80;
      fullName = 'Post-Traumatic Stress Disorder';
      if (totalScore >= 45) severity = 'Severe';
      else if (totalScore >= 31) severity = 'Moderate';
      else severity = 'Below Threshold';
    } else if (assessmentName === 'PHQ-9') {
      maxScore = 27;
      fullName = 'Major Depressive Disorder';
      if (totalScore >= 20) severity = 'Severe';
      else if (totalScore >= 15) severity = 'Moderately Severe';
      else if (totalScore >= 10) severity = 'Moderate';
      else if (totalScore >= 5) severity = 'Mild';
      else severity = 'Minimal';
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    // Assign color based on percentage (red = highest, orange = middle, green = lowest)
    let color = '#10B981'; // Green (low)
    if (percentage >= 60) {
      color = '#DC2626'; // Red (high)
    } else if (percentage >= 30) {
      color = '#F59E0B'; // Orange (medium)
    }

    assessments.push({
      name: fullName,
      score: totalScore,
      maxScore,
      percentage,
      severity,
      color,
    });
  }

  return assessments;
}

// --------------------
// GENERATE CLINICAL INSIGHT
// --------------------
function generateClinicalInsight(assessments: any[]) {
  const moderateOrHigher = assessments.filter(a => 
    a.severity !== 'Minimal' && a.severity !== 'Below Threshold'
  );

  if (moderateOrHigher.length === 0) {
    return 'Your responses indicate minimal symptoms across all assessed areas. Continue monitoring your mental health and reach out to a professional if symptoms develop.';
  } else if (moderateOrHigher.length === 1) {
    const assessment = moderateOrHigher[0];
    const disorder = assessment.name;
    const severityLevel = assessment.severity.toLowerCase();
    
    return `Your responses suggest ${severityLevel} symptoms consistent with ${disorder}. A licensed mental health provider can provide a comprehensive evaluation and discuss appropriate treatment options.`;
  } else {
    // Multiple disorders - describe each with severity
    const disorderDescriptions = moderateOrHigher.map(a => 
      `${a.severity.toLowerCase()} ${a.name}`
    ).join(', ');
    
    return `Your responses suggest overlapping symptoms including ${disorderDescriptions}. This comorbidity pattern is common, and a licensed mental health provider can help clarify the best support approach for you.`;
  }
}

// --------------------
// UPDATE QUESTION SCORES
// --------------------
export async function updateQuestionScores(
  userId: string,
  sessionId: string,
  mapping: DiagnosticMapping
) {
  const adminDb = getAdminApp().firestore();
  const questionsCollection = adminDb
    .doc(`users/${userId}/sessions/${sessionId}`)
    .collection('questions');

  // Update question scores
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

  // Calculate completion percentage
  const snapshot = await questionsCollection.get();
  const fullMapping: DiagnosticMapping = {};
  
  snapshot.forEach(doc => {
    fullMapping[doc.id] = doc.data().questions || {};
  });

  let total = 0;
  let answered = 0;
  
  for (const [_, questionMap] of Object.entries(fullMapping)) {
    for (const [_, data] of Object.entries(questionMap)) {
      total++;
      if (data.score !== null && data.score !== undefined) {
        answered++;
      }
    }
  }
  
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
  
  // Update session
  await adminDb.doc(`users/${userId}/sessions/${sessionId}`).update({
    completionPercentage: percentage,
    totalQuestions: total,
    answeredQuestions: answered,
  });
  
  // Check if should auto-complete and generate summary
  const sessionDoc = await adminDb.doc(`users/${userId}/sessions/${sessionId}`).get();
  const sessionStatus = sessionDoc.data()?.status;
  
  if (percentage === 100 && sessionStatus === 'active') {
    // Calculate assessments for summary
    const assessments = calculateAssessments(fullMapping);
    const clinicalInsight = generateClinicalInsight(assessments);
    
    // Generate detailed symptoms
    const detailedSymptoms = assessments.map((a) => ({
      disorder: a.name,
      likelihood: a.percentage,
      symptomsReported: [
        `${a.score} out of ${a.maxScore} total points reported`,
        `Severity level: ${a.severity}`,
      ],
    }));

    // Store summary data in session document
    await adminDb.doc(`users/${userId}/sessions/${sessionId}`).update({
      status: 'ended-complete',
      endedAt: admin.firestore.FieldValue.serverTimestamp(),
      summaryData: {
        assessments,
        clinicalInsight,
        detailedSymptoms,
      }
    });
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
      text: bot_reply,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
    
    // Delete all messages
    const messagesSnapshot = await adminDb
      .collection(`users/${userId}/sessions/${sessionId}/messages`)
      .get();
    
    // Delete all questions
    const questionsSnapshot = await adminDb
      .collection(`users/${userId}/sessions/${sessionId}/questions`)
      .get();
    
    const batch = adminDb.batch();
    
    messagesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    questionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
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

// --------------------
// END SESSION MANUALLY
// --------------------
export async function endSessionManually(
  userId: string,
  sessionId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const adminDb = getAdminApp().firestore();
    const sessionRef = adminDb.doc(`users/${userId}/sessions/${sessionId}`);
    
    // Get current session data
    const sessionDoc = await sessionRef.get();
    const sessionData = sessionDoc.data();
    const completionPercentage = sessionData?.completionPercentage || 0;
    
    const status = completionPercentage === 100 ? 'ended-complete' : 'ended-premature';
    
    // If complete, generate and store summary
    if (status === 'ended-complete') {
      // Fetch all questions
      const questionsSnapshot = await adminDb
        .collection(`users/${userId}/sessions/${sessionId}/questions`)
        .get();
      
      const fullMapping: DiagnosticMapping = {};
      questionsSnapshot.forEach(doc => {
        fullMapping[doc.id] = doc.data().questions || {};
      });

      // Calculate assessments
      const assessments = calculateAssessments(fullMapping);
      const clinicalInsight = generateClinicalInsight(assessments);
      
      const detailedSymptoms = assessments.map((a) => ({
        disorder: a.name,
        likelihood: a.percentage,
        symptomsReported: [
          `${a.score} out of ${a.maxScore} total points reported`,
          `Severity level: ${a.severity}`,
        ],
      }));

      await sessionRef.update({
        status,
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
        summaryData: {
          assessments,
          clinicalInsight,
          detailedSymptoms,
        }
      });
    } else {
      await sessionRef.update({
        status,
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    revalidatePath('/chat');
    return { success: true };
  } catch (error) {
    console.error('Error ending session:', error);
    return { success: false, message: 'Failed to end session' };
  }
}

// --------------------
// RESUME SESSION
// --------------------
export async function resumeSession(
  userId: string,
  sessionId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const adminDb = getAdminApp().firestore();
    const sessionRef = adminDb.doc(`users/${userId}/sessions/${sessionId}`);
    
    // Fetch current session data
    const sessionSnap = await sessionRef.get();
    const session = sessionSnap.data();

    if (!session) {
      return { success: false, message: "Session not found" };
    }

    const completion = session.completionPercentage ?? 0;
    const previousStatus = session.status;

    let newStatus: "active" | "resumed";

    // If user had NOT finished diagnostics → return to active mode
    if (completion < 100 || previousStatus === "ended-premature") {
      newStatus = "active";
    }
    // If user finished diagnostics → resume free-talk mode
    else {
      newStatus = "resumed";
    }

    await sessionRef.update({
      status: newStatus,
      resumedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    revalidatePath('/chat');
    return { success: true };
  } catch (error) {
    console.error('Error resuming session:', error);
    return { success: false, message: 'Failed to resume session' };
  }
}

//uncomment down here to manually generate session summary
// --------------------
// MANUALLY GENERATE SUMMARY (for testing/manual triggering)
// --------------------
/*
export async function generateSessionSummary(
  userId: string,
  sessionId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const adminDb = getAdminApp().firestore();
    const sessionRef = adminDb.doc(`users/${userId}/sessions/${sessionId}`);
    
    // Fetch all questions
    const questionsSnapshot = await adminDb
      .collection(`users/${userId}/sessions/${sessionId}/questions`)
      .get();
    
    if (questionsSnapshot.empty) {
      return { success: false, message: 'No questions found for this session' };
    }

    const fullMapping: DiagnosticMapping = {};
    questionsSnapshot.forEach(doc => {
      fullMapping[doc.id] = doc.data().questions || {};
    });

    console.log('📊 Diagnostic mapping:', fullMapping);

    // Calculate assessments
    const assessments = calculateAssessments(fullMapping);
    console.log('✅ Assessments calculated:', assessments);

    if (assessments.length === 0) {
      return { success: false, message: 'No valid assessments could be calculated' };
    }

    const clinicalInsight = generateClinicalInsight(assessments);
    console.log('💡 Clinical insight:', clinicalInsight);
    
    const detailedSymptoms = assessments.map((a) => ({
      disorder: a.name,
      likelihood: a.percentage,
      symptomsReported: [
        `${a.score} out of ${a.maxScore} total points reported`,
        `Severity level: ${a.severity}`,
      ],
    }));

    // Store summary data AND ensure proper status/completion
    await sessionRef.update({
      status: 'ended-complete',
      completionPercentage: 100,
      endedAt: admin.firestore.FieldValue.serverTimestamp(),
      summaryData: {
        assessments,
        clinicalInsight,
        detailedSymptoms,
      }
    });

    console.log('✅ Summary data stored successfully');
    revalidatePath(`/session-summary/${sessionId}`);
    return { success: true };
  } catch (error) {
    console.error('Error generating summary:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate summary';
    return { success: false, message };
  }
}*/