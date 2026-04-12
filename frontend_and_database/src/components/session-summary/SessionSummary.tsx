'use client';

import { useRouter } from 'next/navigation';
import { 
  Brain, 
  TrendingUp, 
  AlertCircle, 
  FileText, 
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AssessmentScore {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  severity: string;
  color: string;
}

interface DetailedSymptom {
  disorder: string;
  likelihood: number;
  symptomsReported: string[];
}

interface SessionSummaryProps {
  sessionId: string;
  timestamp: string;
  assessments: AssessmentScore[];
  comorbidityInsight: string;
  detailedSymptoms: DetailedSymptom[];
}

export function SessionSummary({
  sessionId,
  timestamp,
  assessments,
  comorbidityInsight,
  detailedSymptoms,
}: SessionSummaryProps) {
  const router = useRouter();

  console.log('SessionSummary rendering with:', { sessionId, assessments });

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/chat')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Provisional Summary</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <Calendar className="h-3 w-3" />
                <span>{timestamp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Assessment Overview */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Brain className="h-6 w-6 text-indigo-600" />
            </div>
            <h2 className="text-md font-bold text-gray-900">Assessment Results</h2>
          </div>

          <div className="space-y-4">
            {assessments && assessments.length > 0 ? (
              assessments.map((assessment, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{assessment.name}</h3>
                      <p className="text-[0.6rem] text-gray-600">
                        Score: {assessment.score} / {assessment.maxScore}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: assessment.color }}>
                        {assessment.percentage}%
                      </div>
                      <div className="text-[0.6rem] font-medium text-gray-600">
                        {assessment.severity}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${assessment.percentage}%`,
                        backgroundColor: assessment.color,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No assessment data available</p>
            )}
          </div>
        </div>

        {/* Comorbidity Insight */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div>
              <h3 className="text-sm font-semibold text-amber-900 mb-2">Clinical Insight</h3>
              <p className="text-xs text-amber-800 leading-relaxed">{comorbidityInsight}</p>
            </div>
          </div>
        </div>

        {/* Detailed Symptoms */}
        {detailedSymptoms && detailedSymptoms.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-6 w-6 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-md font-semibold text-gray-900">Detailed Analysis</h2>
            </div>

            <div className="space-y-6">
              {detailedSymptoms.map((symptom, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">{symptom.disorder}</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-700">Symptoms Reported:</p>
                    <ul className="space-y-1">
                      {(symptom.symptomsReported || []).map((symptomText, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                          <span className="text-indigo-600">•</span>
                          <span>{symptomText}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {index < detailedSymptoms.length - 1 && (
                    <div className="border-t border-gray-100 pt-3" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Important Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="text-md font-semibold text-blue-900">Important Notice</h3>
              <p className="text-xs text-blue-800 leading-relaxed">
                This assessment is for informational purposes only and is not a clinical diagnosis. 
                Please consult with a licensed mental health professional for a comprehensive evaluation 
                and personalized treatment recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}