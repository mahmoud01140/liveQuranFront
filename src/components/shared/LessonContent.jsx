import { useState, useRef } from 'react';
import { Play, Pause, Volume2, Sparkles, HelpCircle, BookOpen } from 'lucide-react';

// Real-world Quranic verse audios (Alafasy reciter) containing the rule examples:
const RULE_AUDIO_MAP = {
  "مَنۡ ءَامَنَ": "https://cdn.islamic.network/quran/audio/128/ar.alafasy/69.mp3", // البقرة 62 (إظهار)
  "مَن يَقُولُ": "https://cdn.islamic.network/quran/audio/128/ar.alafasy/15.mp3", // البقرة 8 (إدغام بغنة)
  "مِن قَبۡلِ": "https://cdn.islamic.network/quran/audio/128/ar.alafasy/11.mp3",  // البقرة 4 (إخفاء)
  "مِن بَعۡدِ": "https://cdn.islamic.network/quran/audio/128/ar.alafasy/34.mp3",  // البقرة 27 (إقلاب)
};

// Help explanations for the Tajweed rules
const RULE_EXPLANATIONS = {
  "إظهار": "النطق بالنون الساكنة أو التنوين واضحة من مخرجها من غير غنة كاملة إذا جاء بعدها أحد حروف الحلق (أ، هـ، ع، ح، غ، خ).",
  "إدغام": "دمج النون الساكنة أو التنوين في الحرف الذي يليها بحيث يصيران حرفاً واحداً مشدداً، وحروفه (ي، ر، م، ل، و، ن).",
  "إخفاء": "النطق بالنون الساكنة أو التنوين بحالة متوسطة بين الإظهار والإدغام مع بقاء الغنة، وحروفه 15 حرفاً تجمعها أوائل كلمات بيت الشعر: صف ذا ثنا كم جاد شخص قد سما...",
  "إقلاب": "قلب النون الساكنة أو التنوين ميماً مخفاة مع الغنة إذا جاء بعدها حرف الباء (ب).",
};

export default function LessonContent({ content }) {
  const [playingAudio, setPlayingAudio] = useState(null); // String text of currently playing example
  const [hoveredRule, setHoveredRule] = useState(null); // Rule type for showing definition tooltip
  const audioRef = useRef(new Audio());

  const handlePlayAudio = (phrase) => {
    const audioUrl = RULE_AUDIO_MAP[phrase];
    if (!audioUrl) return;

    if (playingAudio === phrase) {
      audioRef.current.pause();
      setPlayingAudio(null);
    } else {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setPlayingAudio(phrase);
      audioRef.current.onended = () => {
        setPlayingAudio(null);
      };
    }
  };

  // Helper to parse content into paragraphs and render rich formatting
  const renderFormattedText = (text) => {
    if (!text) return null;

    // Split text into lines/paragraphs
    const paragraphs = text.split('\n');

    return paragraphs.map((p, idx) => {
      let trimmed = p.trim();
      if (!trimmed) return null;

      // Handle custom blockquotes or warnings
      if (trimmed.startsWith('>')) {
        return (
          <blockquote key={idx} className="border-r-4 border-primary-500 bg-primary-50/50 p-4 rounded-xl my-4 text-gray-700 leading-relaxed text-sm">
            {parseInlineStyles(trimmed.substring(1).trim())}
          </blockquote>
        );
      }

      // Handle headings
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={idx} className="text-base font-bold text-gray-900 mt-5 mb-2">
            {parseInlineStyles(trimmed.substring(3).trim())}
          </h4>
        );
      }
      if (trimmed.startsWith('##')) {
        return (
          <h3 key={idx} className="text-lg font-extrabold text-primary-600 mt-6 mb-3 border-b border-gray-100 pb-1">
            {parseInlineStyles(trimmed.substring(2).trim())}
          </h3>
        );
      }

      // Handle lists
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return (
          <ul key={idx} className="list-disc list-inside mr-4 my-2 text-sm text-gray-700 space-y-1.5 leading-relaxed">
            <li className="list-item">
              {parseInlineStyles(trimmed.substring(1).trim())}
            </li>
          </ul>
        );
      }

      // Normal paragraph
      return (
        <p key={idx} className="text-sm text-gray-600 leading-relaxed mb-4">
          {parseInlineStyles(trimmed)}
        </p>
      );
    });
  };

  // Helper to parse custom tags: ﴿...﴾ for Quran, [rule|example] for Tajweed rules
  const parseInlineStyles = (line) => {
    let elements = [];
    let currentIdx = 0;
    
    // Regular expressions for Quranic verses ﴿...﴾ and Tajweed rules [rule|example]
    const combinedRegex = /(﴿[^﴾]+﴾)|(\[[^|\]]+\|[^\]]+\])/g;
    let match;

    while ((match = combinedRegex.exec(line)) !== null) {
      const matchStart = match.index;
      const matchText = match[0];

      // Add preceding plain text
      if (matchStart > currentIdx) {
        elements.push(line.substring(currentIdx, matchStart));
      }

      if (matchText.startsWith('﴿')) {
        // Quranic Verse rendering
        const verseText = matchText.slice(1, -1);
        elements.push(
          <span key={matchStart} className="inline-block px-1 mx-0.5 my-1">
            <span className="quran-text font-quran text-emerald-800 bg-emerald-50/70 border border-emerald-100/50 px-2 py-0.5 rounded-lg text-lg select-text shadow-sm font-semibold">
              ﴿ {verseText} ﴾
            </span>
          </span>
        );
      } else {
        // Tajweed rule parsing: [ruleType|example]
        const innerText = matchText.slice(1, -1); // remove [ and ]
        const [ruleType, phrase] = innerText.split('|');

        const audioUrl = RULE_AUDIO_MAP[phrase];
        const isPlaying = playingAudio === phrase;

        elements.push(
          <span
            key={matchStart}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200/80 shadow-sm mx-1 my-1 relative group"
          >
            {/* Rule badge */}
            <span 
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full select-none flex items-center gap-0.5 cursor-help ${
                ruleType.includes('إظهار') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                ruleType.includes('إدغام') ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                ruleType.includes('إخفاء') ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                'bg-orange-50 text-orange-700 border border-orange-100'
              }`}
              onMouseEnter={() => setHoveredRule(ruleType)}
              onMouseLeave={() => setHoveredRule(null)}
            >
              {ruleType}
              <HelpCircle className="w-2.5 h-2.5 text-gray-400" />
            </span>

            {/* Quranic Phrase */}
            <span className="font-quran text-base text-gray-800 select-text">
              {phrase}
            </span>

            {/* Play/Pause example audio */}
            {audioUrl && (
              <button
                onClick={() => handlePlayAudio(phrase)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isPlaying
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                }`}
                title={isPlaying ? "إيقاف مؤقت" : "استمع للمثال بصوت العفاسي"}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 mr-0.5" />}
              </button>
            )}

            {/* Rule description tooltip */}
            {hoveredRule === ruleType && RULE_EXPLANATIONS[ruleType] && (
              <span className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg shadow-lg z-50 text-right leading-relaxed pointer-events-none">
                {RULE_EXPLANATIONS[ruleType]}
                <span className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-slate-800 transform rotate-45" />
              </span>
            )}
          </span>
        );
      }

      currentIdx = combinedRegex.lastIndex;
    }

    // Add trailing text
    if (currentIdx < line.length) {
      elements.push(line.substring(currentIdx));
    }

    return elements;
  };

  return (
    <div className="card-base p-6 bg-white border border-gray-100">
      <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center text-primary-500">
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <h3 className="font-black text-gray-900 text-base">الشرح النصي والأمثلة</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold bg-amber-50 px-2.5 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5" />
          <span>أمثلة تلاوة تفاعلية</span>
        </div>
      </div>

      <div className="space-y-1">
        {content ? renderFormattedText(content) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            <Volume2 className="w-12 h-12 mx-auto mb-2 text-gray-200" />
            لا يوجد محتوى شرح نصي لهذا الدرس.
          </div>
        )}
      </div>
    </div>
  );
}
