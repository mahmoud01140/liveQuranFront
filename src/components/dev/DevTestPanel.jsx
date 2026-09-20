/**
 * ═══════════════════════════════════════════════════════════
 *  DevTestPanel — لوحة مطوّر عائمة لتعبئة بيانات اختبارية
 *  —— لا تُعرض إطلاقاً في بيئة الإنتاج ——
 *  —— لا تؤثر على أي ملف كود آخر ——
 * ═══════════════════════════════════════════════════════════
 */
import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useExamStore from '../../store/examStore';
import useAuthStore from '../../store/authStore';
import { fillSurveyTestData, fillExamTestData } from '../../utils/devTestData';
import { Bug, ChevronDown, ChevronUp, Zap, FileText, ClipboardCheck, Play, X } from 'lucide-react';

// Only show in development
const IS_DEV = import.meta.env.DEV;

export default function DevTestPanel() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('correct'); // 'correct' | 'partial'
  const location = useLocation();
  const navigate = useNavigate();

  const { setSurveyAnswer, setAnswer, surveyAnswers, answers } = useExamStore();
  const { user } = useAuthStore();

  const regType = user?.registrationType || 'student';

  const handleFillSurvey = useCallback(() => {
    const filled = fillSurveyTestData(setSurveyAnswer, regType);
    // Also persist to localStorage like the SurveyPage does
    try {
      const storageKey = `survey_answers_${user?._id || 'guest'}_${regType}`;
      localStorage.setItem(storageKey, JSON.stringify(filled));
    } catch (_) {}
    toast.success(`✅ تم تعبئة ${filled.length} إجابة في الاستبيان (${regType})`);
  }, [setSurveyAnswer, regType, user]);

  const handleFillExam = useCallback(() => {
    const filled = fillExamTestData(setAnswer, regType, mode);
    const count = Object.keys(filled).length;
    const label = mode === 'correct' ? 'جميعها صحيحة' : 'نصفها صحيح';
    toast.success(`✅ تم تعبئة ${count} إجابة في الامتحان — ${label}`);
  }, [setAnswer, regType, mode]);

  const handleFillBoth = useCallback(() => {
    handleFillSurvey();
    handleFillExam();
    toast.success('🚀 تم تعبئة الاستبيان والامتحان معاً!');
  }, [handleFillSurvey, handleFillExam]);

  const handleNavigateToSurvey = () => navigate('/onboarding/survey');
  const handleNavigateToExam = () => navigate('/onboarding/written-exam');

  // Don't render in production
  if (!IS_DEV) return null;

  // Only show on onboarding-related pages (or always if user prefers)
  const isOnboarding = location.pathname.startsWith('/onboarding');

  const surveyCount = surveyAnswers?.filter(a => a !== undefined && a !== null).length || 0;
  const examCount = Object.keys(answers || {}).length;

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(!open)}
        title="لوحة البيانات الاختبارية"
        aria-label="فتح لوحة المطوّر"
        style={{
          position: 'fixed',
          bottom: isOnboarding ? 80 : 20,
          left: 20,
          zIndex: 99999,
          width: 48,
          height: 48,
          borderRadius: 14,
          border: 'none',
          background: 'linear-gradient(135deg, #4A3F6B 0%, #177B58 100%)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(74,63,107,0.3)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        {open ? <X size={22} /> : <Bug size={22} />}
      </button>

      {/* Panel */}
      {open && (
        <div
          dir="rtl"
          style={{
            position: 'fixed',
            bottom: isOnboarding ? 140 : 80,
            left: 20,
            zIndex: 99998,
            width: 320,
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            background: '#1E1B2E',
            borderRadius: 20,
            padding: '20px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
            color: '#E8E2D4',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '0.875rem',
            animation: 'devPanelSlideUp 0.2s ease-out',
          }}
        >
          <style>{`
            @keyframes devPanelSlideUp {
              from { opacity: 0; transform: translateY(16px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .dev-btn {
              width: 100%;
              padding: 10px 16px;
              border-radius: 12px;
              border: 1px solid rgba(255,255,255,0.1);
              background: rgba(255,255,255,0.06);
              color: #E8E2D4;
              cursor: pointer;
              font-size: 0.8125rem;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 8px;
              transition: background 0.15s, border-color 0.15s;
              text-align: right;
            }
            .dev-btn:hover {
              background: rgba(255,255,255,0.12);
              border-color: rgba(255,255,255,0.2);
            }
            .dev-btn-primary {
              background: linear-gradient(135deg, #177B58 0%, #1A9D6F 100%);
              border-color: #177B58;
              color: #fff;
            }
            .dev-btn-primary:hover {
              background: linear-gradient(135deg, #1A9D6F 0%, #177B58 100%);
            }
            .dev-divider {
              height: 1px;
              background: rgba(255,255,255,0.08);
              margin: 12px 0;
            }
            .dev-mode-toggle {
              display: flex;
              gap: 4px;
              background: rgba(255,255,255,0.06);
              padding: 4px;
              border-radius: 10px;
            }
            .dev-mode-opt {
              flex: 1;
              padding: 6px 8px;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 0.75rem;
              font-weight: 600;
              transition: all 0.15s;
              color: #756E85;
              background: transparent;
            }
            .dev-mode-opt.active {
              background: #177B58;
              color: #fff;
            }
          `}</style>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Bug size={18} style={{ color: '#A78BFA' }} />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
              بيانات اختبارية
            </span>
            <span style={{
              marginRight: 'auto',
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(167,139,250,0.15)',
              color: '#A78BFA',
              fontSize: '0.6875rem',
              fontWeight: 700,
            }}>
              DEV
            </span>
          </div>

          {/* Current state */}
          <div style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            marginBottom: 14,
          }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: '#756E85' }}>الحالة الحالية</p>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.8125rem' }}>
              <span>
                📋 الاستبيان: <strong style={{ color: surveyCount > 0 ? '#34D399' : '#F87171' }}>{surveyCount}</strong>
              </span>
              <span>
                📝 الامتحان: <strong style={{ color: examCount > 0 ? '#34D399' : '#F87171' }}>{examCount}</strong>
              </span>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.6875rem', color: '#756E85' }}>
              نوع التسجيل: <strong style={{ color: '#A78BFA' }}>{regType}</strong>
              {' · '}
              الصفحة: <strong style={{ color: '#A78BFA' }}>{location.pathname.split('/').pop()}</strong>
            </p>
          </div>

          {/* Mode toggle */}
          <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: '#756E85' }}>نمط الإجابات:</p>
          <div className="dev-mode-toggle" style={{ marginBottom: 14 }}>
            <button
              className={`dev-mode-opt ${mode === 'correct' ? 'active' : ''}`}
              onClick={() => setMode('correct')}
            >
              ✅ جميعها صحيحة
            </button>
            <button
              className={`dev-mode-opt ${mode === 'partial' ? 'active' : ''}`}
              onClick={() => setMode('partial')}
            >
              ⚠️ نصفها صحيح
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="dev-btn" onClick={handleFillSurvey}>
              <ClipboardCheck size={16} style={{ color: '#34D399' }} />
              تعبئة الاستبيان
            </button>

            <button className="dev-btn" onClick={handleFillExam}>
              <FileText size={16} style={{ color: '#60A5FA' }} />
              تعبئة الامتحان التحريري
            </button>

            <div className="dev-divider" />

            <button className="dev-btn dev-btn-primary" onClick={handleFillBoth}>
              <Zap size={16} />
              تعبئة الكل دفعة واحدة
            </button>
          </div>

          {/* Quick navigation */}
          <div className="dev-divider" />
          <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: '#756E85' }}>انتقال سريع:</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { path: '/onboarding/type', label: 'النوع' },
              { path: '/onboarding/survey', label: 'الاستبيان' },
              { path: '/onboarding/written-exam', label: 'التحريري' },
              { path: '/onboarding/oral-exam', label: 'الشفهي' },
              { path: '/onboarding/result', label: 'النتيجة' },
            ].map(({ path, label }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: location.pathname === path ? 'rgba(23,123,88,0.3)' : 'transparent',
                  color: location.pathname === path ? '#34D399' : '#756E85',
                  cursor: 'pointer',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Footer */}
          <p style={{
            margin: '14px 0 0 0',
            textAlign: 'center',
            fontSize: '0.625rem',
            color: 'rgba(117,110,133,0.5)',
          }}>
            ⚠️ يظهر في بيئة التطوير فقط — لا يُعرض في الإنتاج
          </p>
        </div>
      )}
    </>
  );
}
