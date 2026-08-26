import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronLeft, ChevronRight, Plus, Minus, Download, X,
  Highlighter, MessageSquare, Trash2, ZoomIn, ZoomOut, Check,
  BookOpen, Edit3, List, Sparkles, RotateCcw, AlertCircle, Loader2, Maximize
} from 'lucide-react';

export default function InteractivePdfViewer({ pdfUrl, title, resourceId, onClose }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tools: 'select' | 'highlight' | 'comment'
  const [activeTool, setActiveTool] = useState('select');
  const [selectedColor, setSelectedColor] = useState('yellow'); // yellow, green, blue

  // Annotations
  const [annotations, setAnnotations] = useState([]);
  const [pendingComment, setPendingComment] = useState(null); // { x, y } coordinates in percent
  const [commentText, setCommentText] = useState('');
  const [activeCommentId, setActiveCommentId] = useState(null); // Currently open comment tooltip

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfTextContent, setPdfTextContent] = useState([]); // Array of { pageNum, text }
  const [isIndexing, setIsIndexing] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('search'); // 'search' | 'comments'

  // Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Drawing state for highlight
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState(null); // { x, y, width, height } relative to overlay

  // Colors mapping
  const colors = {
    yellow: { rgba: 'rgba(253, 224, 71, 0.4)', bg: 'bg-yellow-300', border: 'border-yellow-500', hex: '#fde047' },
    green: { rgba: 'rgba(74, 222, 128, 0.4)', bg: 'bg-green-400', border: 'border-green-600', hex: '#4ade80' },
    blue: { rgba: 'rgba(96, 165, 250, 0.4)', bg: 'bg-blue-400', border: 'border-blue-600', hex: '#60a5fa' },
  };

  // 1. Load pdf.js dynamically from CDN
  useEffect(() => {
    let isMounted = true;
    setIsPdfLoading(true);
    setError(null);

    const initPdf = async () => {
      try {
        if (!window.pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.async = true;
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error('فشل تحميل مكتبة PDF.js'));
            document.head.appendChild(script);
          });
        }

        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        if (isMounted) {
          const loadingTask = pdfjsLib.getDocument(pdfUrl);
          const pdf = await loadingTask.promise;
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setIsPdfLoading(false);
          
          // Index text content for search in background
          extractTextContent(pdf);
        }
      } catch (err) {
        console.error('PDF error:', err);
        if (isMounted) {
          setError('حدث خطأ أثناء تحميل ملف الـ PDF. يرجى التحقق من الرابط وإعادة المحاولة.');
          setIsPdfLoading(false);
        }
      }
    };

    initPdf();

    // Load saved annotations
    const saved = localStorage.getItem(`pdf_ann_${resourceId}`);
    if (saved) {
      try {
        setAnnotations(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing annotations:', e);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [pdfUrl, resourceId]);

  // Extract text from all pages for search
  const extractTextContent = async (pdf) => {
    setIsIndexing(true);
    const pagesText = [];
    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        pagesText.push({ pageNum: i, text: pageText });
      }
      setPdfTextContent(pagesText);
    } catch (e) {
      console.error('Failed to extract text:', e);
    } finally {
      setIsIndexing(false);
    }
  };

  // 2. Render Page on Canvas
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      // Cancel previous render task if active
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.scale(dpr, dpr);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Render error:', err);
      }
    }
  }, [pdfDoc, pageNum, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Adjust zoom to fit width of container automatically on mount or window resize
  const fitWidth = useCallback(async () => {
    if (!pdfDoc || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const containerWidth = containerRef.current.clientWidth - 40; // padding
      const newScale = containerWidth / viewport.width;
      // Cap scale between 0.5 and 2.0
      setScale(Math.max(0.5, Math.min(2.0, newScale)));
    } catch (e) {
      console.error(e);
    }
  }, [pdfDoc]);

  useEffect(() => {
    if (pdfDoc) {
      fitWidth();
    }
  }, [pdfDoc, fitWidth]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      fitWidth();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitWidth]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        // In Arabic layout, Right Arrow goes to Previous Page
        setPageNum(p => Math.max(1, p - 1));
      } else if (e.key === 'ArrowLeft') {
        setPageNum(p => Math.min(numPages, p + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages]);

  // Search memoized logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || pdfTextContent.length === 0) return [];
    const results = [];
    const queryLower = searchQuery.toLowerCase();
    
    pdfTextContent.forEach(({ pageNum, text }) => {
      let index = text.toLowerCase().indexOf(queryLower);
      while (index !== -1) {
        const start = Math.max(0, index - 25);
        const end = Math.min(text.length, index + queryLower.length + 25);
        let snippet = text.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';

        results.push({
          pageNum,
          snippet,
          index
        });
        index = text.toLowerCase().indexOf(queryLower, index + 1);
      }
    });
    return results;
  }, [searchQuery, pdfTextContent]);

  // Save annotations to localStorage helper
  const saveAnnotations = (newAnnotations) => {
    setAnnotations(newAnnotations);
    localStorage.setItem(`pdf_ann_${resourceId}`, JSON.stringify(newAnnotations));
  };

  // Delete an annotation
  const deleteAnnotation = (id) => {
    const filtered = annotations.filter(ann => ann.id !== id);
    saveAnnotations(filtered);
    if (activeCommentId === id) setActiveCommentId(null);
  };

  // Add text comment
  const handleAddComment = () => {
    if (!commentText.trim() || !pendingComment) return;
    const newComment = {
      id: Date.now().toString(),
      type: 'comment',
      page: pageNum,
      x: pendingComment.x,
      y: pendingComment.y,
      text: commentText,
      createdAt: Date.now()
    };
    saveAnnotations([...annotations, newComment]);
    setPendingComment(null);
    setCommentText('');
  };

  // Handle click on PDF overlay
  const handleOverlayClick = (e) => {
    if (activeTool !== 'comment' || isDrawing) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingComment({ x, y });
  };

  // Drawing highlight rectangles
  const handleMouseDown = (e) => {
    if (activeTool !== 'highlight') return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setIsDrawing(true);
    setCurrentRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || activeTool !== 'highlight') return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentRect({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(startPos.x - x),
      height: Math.abs(startPos.y - y)
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || activeTool !== 'highlight') return;
    setIsDrawing(false);
    if (currentRect && currentRect.width > 5 && currentRect.height > 5) {
      const rect = overlayRef.current.getBoundingClientRect();
      const newHighlight = {
        id: Date.now().toString(),
        type: 'highlight',
        page: pageNum,
        x: (currentRect.x / rect.width) * 100,
        y: (currentRect.y / rect.height) * 100,
        width: (currentRect.width / rect.width) * 100,
        height: (currentRect.height / rect.height) * 100,
        color: selectedColor
      };
      saveAnnotations([...annotations, newHighlight]);
    }
    setCurrentRect(null);
  };

  // Filter current page annotations
  const pageAnnotations = useMemo(() => {
    return annotations.filter(ann => ann.page === pageNum);
  }, [annotations, pageNum]);

  // Sidebar list of comments
  const commentsList = useMemo(() => {
    return annotations.filter(ann => ann.type === 'comment');
  }, [annotations]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md overflow-hidden text-right"
      dir="rtl"
    >
      {/* Upper toolbar */}
      <div className="flex flex-nowrap items-center justify-between gap-2 sm:gap-4 p-2.5 sm:p-4 border-b border-slate-700 bg-slate-800/90 backdrop-blur text-white overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-slate-700 rounded-xl transition-colors text-slate-300 hover:text-white"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-bold text-xs sm:text-base md:text-lg truncate max-w-[120px] sm:max-w-xs md:max-w-md">{title}</h2>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden xs:block">عارض تفاعلي مدمج 📄</p>
          </div>
        </div>

        {/* Middle controls: Zoom & Navigation */}
        {!isPdfLoading && !error && (
          <div className="flex items-center gap-1.5 sm:gap-3 mx-1 sm:mx-0 flex-shrink-0">
            {/* Navigation */}
            <div className="flex items-center bg-slate-700/80 rounded-xl p-0.5 sm:p-1 border border-slate-600">
              <button
                disabled={pageNum <= 1}
                onClick={() => setPageNum(p => Math.max(1, p - 1))}
                className="p-1 sm:p-1.5 hover:bg-slate-600 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="الصفحة السابقة"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 flex items-center gap-1 select-none">
                <span>{pageNum}</span>
                <span className="text-slate-400">/</span>
                <span>{numPages}</span>
              </span>

              <button
                disabled={pageNum >= numPages}
                onClick={() => setPageNum(p => Math.min(numPages, p + 1))}
                className="p-1 sm:p-1.5 hover:bg-slate-600 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="الصفحة التالية"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-700/80 rounded-xl p-0.5 sm:p-1 border border-slate-600">
              <button
                disabled={scale <= 0.5}
                onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                className="p-1 sm:p-1.5 hover:bg-slate-600 rounded-lg transition-colors"
                title="تصغير"
              >
                <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <span className="text-[10px] sm:text-xs font-mono font-semibold px-1 sm:px-2 min-w-[36px] sm:min-w-[48px] text-center select-none">
                {Math.round(scale * 100)}%
              </span>
              <button
                disabled={scale >= 2.5}
                onClick={() => setScale(s => Math.min(2.5, s + 0.25))}
                className="p-1 sm:p-1.5 hover:bg-slate-600 rounded-lg transition-colors"
                title="تكبير"
              >
                <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={fitWidth}
                className="p-1 sm:p-1.5 hover:bg-slate-600 rounded-lg border-r border-slate-600/50 transition-colors ml-0.5"
                title="ملائمة العرض"
              >
                <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Right side: Tools & download */}
        {!isPdfLoading && !error && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Tool Selection */}
            <div className="flex bg-slate-700/85 rounded-xl p-0.5 sm:p-1 border border-slate-600 gap-0.5">
              <button
                onClick={() => setActiveTool('select')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all ${
                  activeTool === 'select'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-600'
                }`}
                title="أداة التحديد والتحريك"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden md:inline">قراءة</span>
              </button>

              <button
                onClick={() => setActiveTool('highlight')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all ${
                  activeTool === 'highlight'
                    ? 'bg-yellow-500 text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-600'
                }`}
                title="تظليل النصوص والفقرات"
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span className="hidden md:inline">تظليل</span>
              </button>

              <button
                onClick={() => setActiveTool('comment')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all ${
                  activeTool === 'comment'
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-600'
                }`}
                title="إضافة ملاحظة عند النقر"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden md:inline">ملاحظة</span>
              </button>
            </div>

            {/* Colors selection for highlighter */}
            {activeTool === 'highlight' && (
              <div className="flex items-center bg-slate-700/80 rounded-xl p-1 sm:p-1.5 border border-slate-600 gap-1 sm:gap-1.5">
                {Object.entries(colors).map(([name, config]) => (
                  <button
                    key={name}
                    onClick={() => setSelectedColor(name)}
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${config.bg} border-2 transition-all ${
                      selectedColor === name ? 'border-white scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Sidebar toggle */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-1.5 sm:p-2 rounded-xl transition-all border ${
                showSidebar
                  ? 'bg-primary-500 text-white border-primary-400'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600'
              }`}
              title="البحث والتعليقات"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Download option */}
            <a
              href={pdfUrl}
              download={`${title}.pdf`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 sm:p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded-xl transition-colors border border-slate-600 flex items-center justify-center"
              title="تحميل الملف"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
          </div>
        )}
      </div>

      {/* Main Workspace split */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar for Search and comments */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="h-full absolute sm:static inset-y-0 right-0 z-20 border-l border-slate-700 bg-slate-800/95 sm:bg-slate-800/90 backdrop-blur text-white flex flex-col flex-shrink-0"
            >
              {/* Tab Selector */}
              <div className="flex border-b border-slate-700 p-2 gap-2">
                <button
                  onClick={() => setSidebarTab('search')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    sidebarTab === 'search' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  البحث في المستند
                </button>
                <button
                  onClick={() => setSidebarTab('comments')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    sidebarTab === 'comments' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  ملاحظاتي ({commentsList.length})
                </button>
              </div>

              {/* Tab contents */}
              <div className="flex-1 overflow-y-auto p-4">
                {sidebarTab === 'search' ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="ابحث عن كلمة أو جملة..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 pl-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-right"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>

                    {isIndexing && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/40 p-3 rounded-lg border border-slate-700">
                        <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                        <span>جاري فهرسة نصوص الملف للبحث...</span>
                      </div>
                    )}

                    {!isIndexing && searchQuery.trim() && (
                      <div className="text-xs text-slate-400 mb-2">
                        تم العثور على {searchResults.length} نتيجة:
                      </div>
                    )}

                    <div className="space-y-2">
                      {searchQuery.trim() && searchResults.map((res, i) => (
                        <button
                          key={i}
                          onClick={() => setPageNum(res.pageNum)}
                          className={`w-full text-right p-3 rounded-xl border text-sm transition-all duration-200 block ${
                            pageNum === res.pageNum
                              ? 'bg-primary-500/20 border-primary-500/60'
                              : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-900 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-xs text-primary-300 bg-primary-500/10 px-2 py-0.5 rounded">
                              صفحة {res.pageNum}
                            </span>
                            <span className="text-[10px] text-slate-500">نتيجة {i + 1}</span>
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed italic" dir="auto">
                            {res.snippet}
                          </p>
                        </button>
                      ))}

                      {searchQuery.trim() && searchResults.length === 0 && (
                        <div className="text-center py-6 text-slate-500 text-xs">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                          لم نعثر على أي تطابق للبحث.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {commentsList.map((c) => (
                      <div
                        key={c.id}
                        className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 hover:border-slate-600 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={() => setPageNum(c.page)}
                            className="font-semibold text-xs text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded hover:bg-teal-500/20 transition-all"
                          >
                            صفحة {c.page}
                          </button>
                          <button
                            onClick={() => deleteAnnotation(c.id)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded transition-colors"
                            title="حذف الملاحظة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium break-words">
                          {c.text}
                        </p>
                        <span className="text-[10px] text-slate-500 block mt-1">
                          {new Date(c.createdAt).toLocaleDateString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    ))}

                    {commentsList.length === 0 && (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                        لا توجد أي ملاحظات مكتوبة بعد.
                        <p className="text-[10px] text-slate-600 mt-1">
                          اختر أداة "ملاحظة" ثم انقر في أي مكان على الصفحة لإضافة ملاحظة.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Viewer Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-4 flex items-start justify-center bg-slate-950/40 relative select-none"
        >
          {isPdfLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary-400" />
              <p className="text-sm font-semibold animate-pulse">جاري تحميل المستند وبدء العرض...</p>
            </div>
          ) : error ? (
            <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl text-center max-w-md my-auto shadow-xl">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h3 className="font-bold text-white text-base mb-2">فشل تحميل الملف</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">{error}</p>
              <button
                onClick={onClose}
                className="py-2 px-6 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold transition-all"
              >
                العودة للمكتبة
              </button>
            </div>
          ) : (
            <div className="relative shadow-2xl rounded-lg bg-white my-4 overflow-hidden border border-slate-200">
              {/* PDF Render Canvas */}
              <canvas ref={canvasRef} className="block select-none" />

              {/* Transparent Overlay for Drawing and Interactions */}
              <div
                ref={overlayRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={handleOverlayClick}
                className={`absolute inset-0 z-20 ${
                  activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'
                }`}
              >
                {/* Render Highlights */}
                {pageAnnotations
                  .filter(ann => ann.type === 'highlight')
                  .map(h => (
                    <div
                      key={h.id}
                      style={{
                        position: 'absolute',
                        left: `${h.x}%`,
                        top: `${h.y}%`,
                        width: `${h.width}%`,
                        height: `${h.height}%`,
                        backgroundColor: colors[h.color]?.rgba || colors.yellow.rgba,
                      }}
                      className="group transition-all"
                    >
                      {/* Delete button on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(h.id);
                        }}
                        className="absolute -top-3 -left-3 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                        title="حذف التظليل"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                {/* Render Comments/Notes pins */}
                {pageAnnotations
                  .filter(ann => ann.type === 'comment')
                  .map(c => (
                    <div
                      key={c.id}
                      style={{
                        position: 'absolute',
                        left: `${c.x}%`,
                        top: `${c.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="z-30 group"
                    >
                      {/* Note Pin Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCommentId(activeCommentId === c.id ? null : c.id);
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all border-2 ${
                          activeCommentId === c.id
                            ? 'bg-teal-500 text-white border-white scale-110'
                            : 'bg-white text-teal-600 border-teal-500 hover:scale-105'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      {/* Comment Tooltip Popover */}
                      <AnimatePresence>
                        {activeCommentId === c.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute bottom-10 right-1/2 translate-x-1/2 w-64 bg-slate-800 border border-slate-700 text-white p-3 rounded-xl shadow-xl z-40 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-start justify-between border-b border-slate-700 pb-1.5 mb-1.5">
                              <span className="text-[10px] text-slate-400">
                                {new Date(c.createdAt).toLocaleDateString('ar-EG', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <button
                                onClick={() => deleteAnnotation(c.id)}
                                className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed font-medium break-words">
                              {c.text}
                            </p>
                            <div className="absolute top-full right-1/2 translate-x-1/2 w-3 h-3 bg-slate-800 border-r border-b border-slate-700 transform rotate-45" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}

                {/* Drawing Indicator Rectangle */}
                {isDrawing && currentRect && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${currentRect.x}px`,
                      top: `${currentRect.y}px`,
                      width: `${currentRect.width}px`,
                      height: `${currentRect.height}px`,
                      backgroundColor: colors[selectedColor]?.rgba || colors.yellow.rgba,
                      border: `1.5px dashed ${colors[selectedColor]?.hex || colors.yellow.hex}`,
                    }}
                  />
                )}
              </div>

              {/* Pending Comment Placement form */}
              <AnimatePresence>
                {pendingComment && (
                  <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center z-40">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-slate-800 border border-slate-700 rounded-2xl p-4 w-80 shadow-2xl text-right"
                    >
                      <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-teal-400" />
                        إضافة ملاحظة جديدة
                      </h4>
                      <textarea
                        rows="3"
                        placeholder="اكتب ملاحظتك هنا..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-right mb-3 resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddComment}
                          className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          حفظ
                        </button>
                        <button
                          onClick={() => {
                            setPendingComment(null);
                            setCommentText('');
                          }}
                          className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-bold transition-all"
                        >
                          إلغاء
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
