'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { geminiQueue } from '../../lib/geminiQueue';
import { MathDisplay } from '../../components/MathDisplay';

// Dynamically setup PDF.js
let pdfjsLib: any = null;
if (typeof window !== 'undefined') {
  pdfjsLib = require('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface ExtractedQuestion {
  questionText: string;
  questionType: 'numeric' | 'algebraic' | 'multichoice' | 'coordinate' | 'diagram';
  correctAnswer: string;
  markScheme: string;
  difficulty: 1 | 2 | 3;
  source: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // PDF Viewer & Cropper States
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Question metadata
  const [subject, setSubject] = useState<'Mathematics' | 'Physics' | 'Chemistry' | 'Biology'>('Mathematics');
  const [tier, setTier] = useState<'Foundation' | 'Higher' | 'Both'>('Both');
  const [stage, setStage] = useState<'KS3' | 'KS4'>('KS4');
  const [topicCode, setTopicCode] = useState('M1.1');
  const [topicName, setTopicName] = useState('Algebra Foundation');

  // Extraction process
  const [seedingText, setSeedingText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [diagramUrl, setDiagramUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Extracted data for review
  const [reviewData, setReviewData] = useState<ExtractedQuestion | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // 1. Role verification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/');
      } else {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            setIsAdmin(true);
          } else {
            alert('Access denied. Admin role required.');
            router.push('/dashboard');
          }
        } catch (err) {
          console.error('Failed to verify role:', err);
          router.push('/dashboard');
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Load PDF file
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pdfjsLib) return;

    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
      try {
        const loadingTask = pdfjsLib.getDocument(typedarray);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setPageNum(1);
        setCropBox(null);
      } catch (err) {
        console.error('Error loading PDF:', err);
        alert('Failed to load PDF past paper.');
      }
    };
    fileReader.readAsArrayBuffer(file);
  };

  // 3. Render PDF page to canvas
  useEffect(() => {
    if (!pdfDoc) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Cancel previous render if still running
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('PDF Render Error:', err);
        }
      }
    };

    renderPage();
  }, [pdfDoc, pageNum, scale]);

  // Mouse handlers for drawing bounding box on top of PDF Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setCropBox(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPos({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const w = Math.abs(startPos.x - currentPos.x);
    const h = Math.abs(startPos.y - currentPos.y);

    if (w > 10 && h > 10) {
      setCropBox({ x, y, w, h });
    }
  };

  // Extract crop box as PNG blob and upload to Cloudflare R2
  const handleCropAndUpload = async () => {
    if (!cropBox || !canvasRef.current) return;

    try {
      setUploadingImage(true);
      setStatusMessage('Cropping diagram and requesting upload signature...');

      const originalCanvas = canvasRef.current;
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropBox.w;
      cropCanvas.height = cropBox.h;

      const ctx = cropCanvas.getContext('2d');
      if (!ctx) return;

      // Draw the cropped region into our secondary canvas
      ctx.drawImage(
        originalCanvas,
        cropBox.x,
        cropBox.y,
        cropBox.w,
        cropBox.h,
        0,
        0,
        cropBox.w,
        cropBox.h
      );

      // Convert to Blob
      const blob = await new Promise<Blob | null>((resolve) => 
        cropCanvas.toBlob((b) => resolve(b), 'image/png')
      );

      if (!blob) throw new Error('Failed to generate image blob');

      // Request presigned URL from API
      const presignRes = await fetch('/api/r2-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `crop_${Date.now()}.png`,
          contentType: 'image/png'
        })
      });

      if (!presignRes.ok) throw new Error('Failed to sign upload request');
      const { uploadUrl, publicUrl } = await presignRes.json();

      setStatusMessage('Uploading crop to Cloudflare R2 storage...');
      
      // Upload blob to R2 directly
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: blob
      });

      if (!uploadRes.ok) throw new Error('Upload to R2 failed');

      setDiagramUrl(publicUrl);
      setStatusMessage('Image uploaded successfully! Diagram URL set.');
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Error: ${err.message || 'Image processing failed'}`);
    } finally {
      setUploadingImage(false);
    }
  };

  // Submit cropped text and image URL to Gemini API parser
  const handleExtractQuestion = async () => {
    if (!seedingText.trim()) {
      alert('Please enter or copy/paste some text from the question first.');
      return;
    }

    try {
      setIsExtracting(true);
      setStatusMessage('Queueing request to Gemini model...');

      const result = await geminiQueue.add(async () => {
        const response = await fetch('/api/seed-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textChunk: seedingText,
            diagramUrl: diagramUrl,
            topicCode: topicCode
          })
        });

        if (!response.ok) {
          const detail = await response.json();
          throw new Error(detail.error || 'Gemini processing failed');
        }

        return await response.json();
      });

      setReviewData(result);
      setStatusMessage('Question parsed successfully! Please review the content below.');
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Error: ${err.message || 'Gemini extraction failed'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Save reviewed and modified question to Firestore
  const handleApproveQuestion = async () => {
    if (!reviewData) return;

    try {
      setStatusMessage('Saving question to Firestore...');
      
      await addDoc(collection(db, 'questions'), {
        ...reviewData,
        subject,
        tier,
        stage,
        topicCode,
        topicName,
        diagramUrl,
        createdAt: new Date()
      });

      setStatusMessage('Question successfully written to Firestore database!');
      setReviewData(null);
      setDiagramUrl(null);
      setCropBox(null);
      setSeedingText('');
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Save failed: ${err.message || 'Firestore write error'}`);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen space-bg flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-full border-4 border-cyber-cyan border-t-transparent animate-spin mb-4" />
        <p className="text-lavender-grey text-sm font-semibold tracking-wider">
          VERIFYING ADMIN ACCESS...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-bg text-white pb-20">
      {/* Header */}
      <header className="border-b border-white/10 bg-space-navy/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🛠️</span>
            <h1 className="text-sm font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-lavender-grey to-cyber-cyan">
              Seeding Command Center
            </h1>
          </div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-xs font-bold px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-lavender-grey hover:text-white transition"
          >
            ← Student Dashboard
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side - PDF Viewer & Bounding Box Cropper */}
        <div className="space-y-6">
          <div className="bg-card-plum/80 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyber-cyan mb-4">
              Step 1: Upload Past Paper & Crop Diagrams
            </h2>
            
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handlePdfUpload}
                className="block w-full text-xs text-lavender-grey file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-electric-violet/20 file:text-white hover:file:bg-electric-violet/30 cursor-pointer"
              />
              
              {pdfDoc && (
                <div className="flex items-center gap-2 text-xs font-semibold bg-space-navy/40 border border-white/10 px-3 py-1.5 rounded-lg">
                  <button 
                    onClick={() => setPageNum(p => Math.max(1, p - 1))}
                    disabled={pageNum <= 1}
                    className="hover:text-white disabled:opacity-40 transition"
                  >
                    ◀ Prev
                  </button>
                  <span className="text-lavender-grey">Page {pageNum} / {numPages}</span>
                  <button 
                    onClick={() => setPageNum(p => Math.min(numPages, p + 1))}
                    disabled={pageNum >= numPages}
                    className="hover:text-white disabled:opacity-40 transition"
                  >
                    Next ▶
                  </button>
                </div>
              )}

              {pdfDoc && (
                <div className="flex items-center gap-1.5 text-xs bg-space-navy/40 border border-white/10 px-2.5 py-1 rounded-lg">
                  <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="hover:text-white transition">🔍-</button>
                  <span className="text-lavender-grey font-mono">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="hover:text-white transition">🔍+</button>
                </div>
              )}
            </div>

            {/* Canvas Viewport */}
            <div className="relative border border-white/10 bg-space-navy/50 rounded-xl overflow-auto max-h-[500px] shadow-inner">
              {!pdfDoc && (
                <div className="h-64 flex flex-col items-center justify-center text-lavender-grey text-xs">
                  <span>📂 No PDF loaded</span>
                  <span className="mt-1">Upload a past paper to crop question diagrams</span>
                </div>
              )}
              
              <div className="relative inline-block">
                <canvas 
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="cursor-crosshair max-w-full"
                />

                {/* Bounding box display while drawing */}
                {isDrawing && (
                  <div 
                    className="absolute border-2 border-dashed border-cyber-cyan bg-cyber-cyan/10 pointer-events-none"
                    style={{
                      left: Math.min(startPos.x, currentPos.x),
                      top: Math.min(startPos.y, currentPos.y),
                      width: Math.abs(startPos.x - currentPos.x),
                      height: Math.abs(startPos.y - currentPos.y)
                    }}
                  />
                )}

                {/* Cropped area selection marker */}
                {cropBox && (
                  <div 
                    className="absolute border-2 border-solid border-electric-violet bg-electric-violet/10 pointer-events-none shadow-[0_0_8px_rgba(124,58,237,0.4)] animate-pulse"
                    style={{
                      left: cropBox.x,
                      top: cropBox.y,
                      width: cropBox.w,
                      height: cropBox.h
                    }}
                  />
                )}
              </div>
            </div>

            {cropBox && (
              <div className="mt-4 flex justify-between items-center bg-space-navy/30 border border-white/5 p-3 rounded-lg">
                <span className="text-xs text-lavender-grey font-mono">
                  Crop Box Selected: {Math.round(cropBox.w)} x {Math.round(cropBox.h)} px
                </span>
                <button
                  onClick={handleCropAndUpload}
                  disabled={uploadingImage}
                  className="text-xs px-3 py-1.5 bg-electric-violet hover:bg-purple-600 font-bold rounded-lg text-white transition disabled:opacity-50"
                >
                  {uploadingImage ? 'Uploading Image...' : '✂️ Crop & Upload to R2'}
                </button>
              </div>
            )}
            
            {diagramUrl && (
              <div className="mt-3 bg-lime-zap/5 border border-lime-zap/20 rounded-lg p-3 flex flex-col gap-2">
                <span className="text-[10px] text-lime-zap font-bold uppercase tracking-wider">✓ Registered Image Asset</span>
                <div className="flex items-center justify-between text-xs text-lavender-grey font-mono break-all bg-space-navy/60 p-2 rounded">
                  <span>{diagramUrl}</span>
                  <button onClick={() => setDiagramUrl(null)} className="text-neon-coral hover:underline ml-2">Clear</button>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Input Raw Text */}
          <div className="bg-card-plum/80 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyber-cyan mb-4">
              Step 2: Question Context & Raw Text
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] uppercase text-lavender-grey font-bold tracking-wider mb-1">Subject</label>
                <select 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value as any)}
                  className="w-full bg-space-navy/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-lavender-grey font-bold tracking-wider mb-1">Topic Code</label>
                <input 
                  type="text" 
                  value={topicCode}
                  onChange={(e) => setTopicCode(e.target.value)}
                  placeholder="e.g. M1.1"
                  className="w-full bg-space-navy/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-electric-violet"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-lavender-grey font-bold tracking-wider mb-1">Stage</label>
                <select 
                  value={stage} 
                  onChange={(e) => setStage(e.target.value as any)}
                  className="w-full bg-space-navy/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value="KS3">KS3</option>
                  <option value="KS4">KS4</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-lavender-grey font-bold tracking-wider mb-1">Tier</label>
                <select 
                  value={tier} 
                  onChange={(e) => setTier(e.target.value as any)}
                  className="w-full bg-space-navy/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value="Both">Both</option>
                  <option value="Foundation">Foundation</option>
                  <option value="Higher">Higher</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] uppercase text-lavender-grey font-bold tracking-wider mb-1">Topic Name</label>
                <input 
                  type="text" 
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g. Algebra Foundation"
                  className="w-full bg-space-navy/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-electric-violet"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-lavender-grey font-bold tracking-wider mb-1">Paste Raw Question Text</label>
              <textarea 
                value={seedingText}
                onChange={(e) => setSeedingText(e.target.value)}
                placeholder="Paste the raw text of the question here for Gemini API extraction..."
                className="w-full h-32 bg-space-navy/50 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-cyber-cyan transition font-mono resize-none"
              />
            </div>

            <button
              onClick={handleExtractQuestion}
              disabled={isExtracting || !seedingText.trim()}
              className="mt-4 w-full py-3 bg-gradient-to-r from-cyber-cyan to-blue-500 hover:from-blue-500 hover:to-cyber-cyan font-bold tracking-wide text-sm rounded-lg text-white transition disabled:opacity-40"
            >
              {isExtracting ? 'Extracting with Gemini (RPM Managed)...' : '🤖 Extract Question JSON ➔'}
            </button>
          </div>
        </div>

        {/* Right Side - Review, Edit & Write to Database */}
        <div className="space-y-6">
          <div className="bg-card-plum/80 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl min-h-[400px] flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyber-cyan mb-4">
              Step 3: Review Extracted Schema
            </h2>

            {statusMessage && (
              <div className="mb-4 bg-space-navy/40 border border-white/5 p-3 rounded-lg text-xs font-semibold text-lavender-grey tracking-wide animate-pulse">
                ℹ️ {statusMessage}
              </div>
            )}

            {!reviewData ? (
              <div className="flex-1 flex flex-col items-center justify-center text-lavender-grey text-xs py-20 text-center">
                <span>🤖 Question Data Ready for Parsing</span>
                <p className="mt-1 max-w-[280px] leading-relaxed">
                  Fill in the details on the left, crop optional diagrams, and click extract to load the Gemini parsed question data here.
                </p>
              </div>
            ) : (
              <div className="space-y-5 flex-1">
                {/* Inputs for raw review */}
                <div>
                  <label className="block text-[10px] uppercase text-lavender-grey font-bold tracking-wider mb-1">Question Type</label>
                  <select 
                    value={reviewData.questionType}
                    onChange={(e) => setReviewData({ ...reviewData, questionType: e.target.value as any })}
                    className="w-full bg-space-navy/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="numeric">numeric</option>
                    <option value="algebraic">algebraic</option>
                    <option value="multichoice">multichoice</option>
                    <option value="coordinate">coordinate</option>
                    <option value="diagram">diagram</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-lavender-grey font-bold tracking-wider mb-1">Source Reference</label>
                  <input 
                    type="text" 
                    value={reviewData.source}
                    onChange={(e) => setReviewData({ ...reviewData, source: e.target.value })}
                    className="w-full bg-space-navy/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-electric-violet"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-lavender-grey font-bold tracking-wider mb-1">Difficulty Level (1=Easy, 2=Medium, 3=Hard)</label>
                  <select 
                    value={reviewData.difficulty}
                    onChange={(e) => setReviewData({ ...reviewData, difficulty: parseInt(e.target.value) as any })}
                    className="w-full bg-space-navy/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="1">1 (Easy)</option>
                    <option value="2">2 (Medium)</option>
                    <option value="3">3 (Hard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-lavender-grey font-bold tracking-wider mb-1">Correct Answer</label>
                  <input 
                    type="text" 
                    value={reviewData.correctAnswer}
                    onChange={(e) => setReviewData({ ...reviewData, correctAnswer: e.target.value })}
                    className="w-full bg-space-navy/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-electric-violet"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-lavender-grey font-bold tracking-wider mb-1">Question Text (KaTeX Support)</label>
                  <textarea 
                    value={reviewData.questionText}
                    onChange={(e) => setReviewData({ ...reviewData, questionText: e.target.value })}
                    className="w-full h-24 bg-space-navy/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-electric-violet font-mono"
                  />
                  <div className="mt-2 bg-space-navy/60 border border-white/5 rounded-lg p-3 text-sm">
                    <span className="block text-[9px] uppercase tracking-widest text-lavender-grey mb-1">KaTeX Live Preview:</span>
                    <MathDisplay text={reviewData.questionText} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-lavender-grey font-bold tracking-wider mb-1">Mark Scheme & Explanation (KaTeX Support)</label>
                  <textarea 
                    value={reviewData.markScheme}
                    onChange={(e) => setReviewData({ ...reviewData, markScheme: e.target.value })}
                    className="w-full h-24 bg-space-navy/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-electric-violet font-mono"
                  />
                  <div className="mt-2 bg-space-navy/60 border border-white/5 rounded-lg p-3 text-sm">
                    <span className="block text-[9px] uppercase tracking-widest text-lavender-grey mb-1">KaTeX Live Preview:</span>
                    <MathDisplay text={reviewData.markScheme} />
                  </div>
                </div>

                <button
                  onClick={handleApproveQuestion}
                  className="mt-6 w-full py-3 bg-gradient-to-r from-lime-zap to-green-600 hover:from-green-600 hover:to-lime-zap font-bold tracking-wide text-sm rounded-lg text-white transition shadow-lg shadow-lime-zap/15"
                >
                  ✓ Approve & Seed to Firestore ➔
                </button>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
