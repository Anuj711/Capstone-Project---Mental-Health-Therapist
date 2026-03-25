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

    // Initial list for tracking
    const initialQuestions = [
      "PHQ-9_Q1", "PHQ-9_Q2", "PHQ-9_Q3", "PHQ-9_Q4", "PHQ-9_Q5", "PHQ-9_Q6", "PHQ-9_Q7", "PHQ-9_Q8", "PHQ-9_Q9",
      "GAD-7_Q1", "GAD-7_Q2", "GAD-7_Q3", "GAD-7_Q4", "GAD-7_Q5", "GAD-7_Q6", "GAD-7_Q7"
    ];
    
    const sessionRef = await adminDb.collection(`users/${userId}/sessions`).add({
      name: sessionName || `Session ${new Date().toLocaleDateString()}`,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completionPercentage: 0,
      totalQuestions: 16,
      answeredQuestions: 0,
      sufficientDataCollected: false,
      traumaDetected: false,
      unanswered_question_ids: initialQuestions,
      question_tracker: {
        current_qs_id: "PHQ-9_Q1",
        next_qs_id: "PHQ-9_Q2",
        current_qs_index: 0
      },
      diagnostic_scores: {}
    });

    const questionsCollection = sessionRef.collection('questions');

    // PHQ-9 questions with answered status
    const phq9Questions: Record<string, { score: number | null; answered: boolean }> = {};
    for (let i = 1; i <= 9; i++) {
      phq9Questions[`Q${i}_PHQ9`] = { score: null, answered: false };
    }
    await questionsCollection.doc('PHQ-9').set({
      questions: phq9Questions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // GAD-7 questions with answered status
    const gad7Questions: Record<string, { score: number | null; answered: boolean }> = {};
    for (let i = 1; i <= 7; i++) {
      gad7Questions[`Q${i}_GAD7`] = { score: null, answered: false };
    }
    await questionsCollection.doc('GAD-7').set({
      questions: gad7Questions,
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

// Enable PCL-5 assessment dynamically if trauma is detected
export async function enablePCL5Assessment(
  userId: string,
  sessionId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const adminDb = getAdminApp().firestore();
    
    const pcl5Doc = await adminDb
      .doc(`users/${userId}/sessions/${sessionId}`)
      .collection('questions')
      .doc('PCL-5')
      .get();
    
    if (pcl5Doc.exists) {
      console.log('PCL-5 already exists');
      return { success: true };
    }
    
    console.log('🆕 Creating PCL-5 assessment (trauma detected)');
    
    const questionsCollection = adminDb
      .doc(`users/${userId}/sessions/${sessionId}`)
      .collection('questions');
    
    // Create PCL-5 questions with answered status
    const pcl5Questions: Record<string, { score: number | null; answered: boolean }> = {};
    for (let i = 1; i <= 20; i++) {
      pcl5Questions[`Q${i}_PCL5`] = { score: null, answered: false };
    }
    
    await questionsCollection.doc('PCL-5').set({
      questions: pcl5Questions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    await adminDb.doc(`users/${userId}/sessions/${sessionId}`).update({
      totalQuestions: 36,
      traumaDetected: true,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error enabling PCL-5:', error);
    return { success: false, message: 'Failed to enable PCL-5 assessment' };
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
    
    // Assign color based on percentage 
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
  flatMapping: Record<string, number>
) {
  const adminDb = getAdminApp().firestore();
  const sessionRef = adminDb.doc(`users/${userId}/sessions/${sessionId}`);
  const questionsCollection = sessionRef.collection('questions');

  console.log('\n' + '='.repeat(80));
  console.log('🔄 UPDATE QUESTION SCORES');

  const groupedUpdates: Record<string, Record<string, any>> = {};

  for (const [flatId, score] of Object.entries(flatMapping)) {
    // 1. Split "PHQ-9_Q1" into assessment ("PHQ-9") and question ("Q1")
    const parts = flatId.split('_');
    if (parts.length < 2) continue;

    const assessmentName = parts[0]; // e.g., "PHQ-9"
    const qPart = parts[1];          // e.g., "Q1"

    // 2. Format to match your DB keys: "Q1_PHQ9"
    const assessmentNoHyphen = assessmentName.replace(/-/g, '');
    const internalFieldId = `${qPart}_${assessmentNoHyphen}`;

    if (!groupedUpdates[assessmentName]) groupedUpdates[assessmentName] = {};

    // 3. Target the 'questions' map specifically
    groupedUpdates[assessmentName][`questions.${internalFieldId}.score`] = score;
    groupedUpdates[assessmentName][`questions.${internalFieldId}.answered`] = true;
  }

  // 4. Execute the updates on the existing documents
  for (const [assessmentName, updates] of Object.entries(groupedUpdates)) {
    try {
      await questionsCollection.doc(assessmentName).update(updates);
      console.log(` ✅ Successfully updated existing ${assessmentName} scores.`);
    } catch (error) {
      await questionsCollection.doc(assessmentName).set(updates, { merge: true });
      console.log(` ⚠️ Created/Merged ${assessmentName} scores.`);
    }
  }

  // 5. Calculate Progress 
  const snapshot = await questionsCollection.get();
  let totalQuestions = 0;
  let answeredQuestions = 0;

  snapshot.forEach(doc => {
    const questions = doc.data().questions || {};
    for (const [_, data] of Object.entries(questions)) {
      totalQuestions++;
      if ((data as any).score !== null || (data as any).answered === true) {
        answeredQuestions++;
      }
    }
  });

  const percentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  
  await sessionRef.update({
    completionPercentage: percentage,
    answeredQuestions,
    totalQuestions
  });

  console.log(`📊 Progress Updated: ${answeredQuestions}/${totalQuestions} (${percentage}%)`);
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
): Promise<{ success: boolean; message?: string }> {
  try {
    // Unpack the NEW response structure from backend
    const { 
      text,                    // was bot_reply
      diagnostic_scores,       // was diagnostic_mapping (now flat)
      metadata,                
      assemblyAI_output, 
      deepface_output,
      emergency 
    } = aiResponse as {
      text: string;
      diagnostic_scores: Record<string, number>; // Flat: {"Q1_PHQ9": 2}
      metadata: {
        conversation_type: string;
        crisis_detected: boolean;
        audio_video_alignment: string;
        confidence_level: string;
        next_suggested_focus: string | null;
      };
      assemblyAI_output: { 
        transcript: string;
        sentiment: string;
        sentiment_confidence: number;
      };
      deepface_output: Record<string, number>; // emotion probabilities
      emergency: boolean;
    };

    const adminDb = getAdminApp().firestore();
    const messagePath = `users/${userId}/sessions/${sessionId}/messages`;
    
    // UPDATED: User message with new fields
    const userMessageData = {
      role: 'user' as const,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId,
      text: assemblyAI_output.transcript,
      // Audio data
      audio_sentiment: assemblyAI_output.sentiment,
      audio_confidence: assemblyAI_output.sentiment_confidence,
      // Video data (store as emotions array)
      video_emotions: deepface_output ? Object.keys(deepface_output) : [],
    };
    
    // Write user message to Firestore
    await adminDb.collection(messagePath).add(userMessageData);
    
    // Assistant message with new structure
    const assistantMessageData = {
      role: 'assistant' as const,
      text: text, 
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId,
      
      conversation_type: metadata.conversation_type,
      diagnostic_match: diagnostic_scores && Object.keys(diagnostic_scores).length > 0,
      diagnostic_scores: diagnostic_scores || {}, 
      metadata: metadata, 
    };

    // Write assistant message to Firestore
    await adminDb.collection(messagePath).add(assistantMessageData);

    // Update question scores if diagnostic data exists
    if (diagnostic_scores && Object.keys(diagnostic_scores).length > 0) {
      // Convert flat scores back to nested format for updateQuestionScores
      const diagnosticMapping: DiagnosticMapping = {};
      
      for (const [questionId, score] of Object.entries(diagnostic_scores)) {
        // Extract assessment name from question ID (e.g., "Q1_PHQ9" -> "PHQ-9")
        let assessmentName = '';
        if (questionId.includes('PHQ9')) assessmentName = 'PHQ-9';
        else if (questionId.includes('GAD7')) assessmentName = 'GAD-7';
        else if (questionId.includes('PCL5')) assessmentName = 'PCL-5';
        
        if (assessmentName) {
          if (!diagnosticMapping[assessmentName]) {
            diagnosticMapping[assessmentName] = {};
          }
          diagnosticMapping[assessmentName][questionId] = { score };
        }
      }
      
      // Update question scores in Firestore
      await updateQuestionScores(userId, sessionId, diagnosticMapping);
    }

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

    const sufficientDataCollected = session.sufficientDataCollected ?? false;
    const previousStatus = session.status;

    let newStatus: "active" | "resumed";

    // If sufficient data collected OR session was ended-complete → resume free-talk mode
    if (sufficientDataCollected || previousStatus === "ended-complete") {
      newStatus = "resumed";
      console.log('✅ Resuming in free-talk mode (sufficient data collected)');
    }
    // If user had NOT finished diagnostics → return to active mode
    else {
      newStatus = "active";
      console.log('✅ Resuming in diagnostic mode (insufficient data)');
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

    console.log(' Diagnostic mapping:', fullMapping);

    // Calculate assessments
    const assessments = calculateAssessments(fullMapping);
    console.log(' Assessments calculated:', assessments);

    if (assessments.length === 0) {
      return { success: false, message: 'No valid assessments could be calculated' };
    }

    const clinicalInsight = generateClinicalInsight(assessments);
    console.log(' Clinical insight:', clinicalInsight);
    
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

    console.log(' Summary data stored successfully');
    revalidatePath(`/session-summary/${sessionId}`);
    return { success: true };
  } catch (error) {
    console.error('Error generating summary:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate summary';
    return { success: false, message };
  }
}*/