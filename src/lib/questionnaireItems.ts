import phq9 from '@/data/phq9.json';
import gad7 from '@/data/gad7.json';
import pcl5 from '@/data/pcl5.json';

const ORDER = ['PHQ-9', 'GAD-7', 'PCL-5'] as const;

type QuestionBank = {
  name: string;
  questions: { id: number; text: string }[];
};

const banks: Record<(typeof ORDER)[number], QuestionBank> = {
  'PHQ-9': phq9 as QuestionBank,
  'GAD-7': gad7 as QuestionBank,
  'PCL-5': pcl5 as QuestionBank,
};

export function buildQuestionnaireItems() {
  const result: Record<string, Record<string, { id: number; text: string; score: null }>> = {};

  for (const assessment of ORDER) {
    const { questions } = banks[assessment];
    const assessmentNoHyphen = assessment.replace(/-/g, '');
    result[assessment] = questions.reduce((acc, question, index) => {
      const key = `Q${index + 1}_${assessmentNoHyphen}`;
      acc[key] = {
        id: question.id,
        text: question.text,
        score: null,
      };
      return acc;
    }, {} as Record<string, { id: number; text: string; score: null }>);
  }

  return result;
}

export { ORDER as QUESTIONNAIRE_ORDER };
