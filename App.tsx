
import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import ImageUploader from './components/ImageUploader';
import { generateTwinImage } from './services/gemini';
import { 
  saveImageToGallery, 
  getGalleryImages, 
  deleteImageFromGallery, 
  updateImageInGallery,
  getUserPresets,
  saveUserPreset,
  deleteUserPresetFromDB
} from './services/storage';
import { TwinConfig, AspectRatio, ImageSize, GeneratedImage, UserPreset } from './types';
import {
  SHOT_TYPES,
  OUTFITS,
  HAIR_STYLES,
  MAKEUP_STYLES,
  LIGHTING_STYLES,
  MOODS,
  ASPECT_RATIOS,
  ETHNICITIES,
  POSES,
  PHOTOSHOOT_TYPES,
  FILTERS,
  SCENES,
  BOTTLE_TYPES,
  PRODUCT_TEXTURES,
  LABEL_STYLES,
  BRAND_COLORWAYS,
  ROUTINE_PHASES,
  APPLICATION_AREAS,
  SKINCARE_PRESETS
} from './constants';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('none');
  const [isViewingOriginal, setIsViewingOriginal] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [galleryHistory, setGalleryHistory] = useState<GeneratedImage[]>([]);
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<'brand' | 'ritual' | 'appearance' | 'concept'>('concept');

  const [config, setConfig] = useState<TwinConfig>({
    visionPrompt: '',
    shotType: SHOT_TYPES[0],
    photoshootType: PHOTOSHOOT_TYPES[0],
    scene: SCENES[0],
    outfit: OUTFITS[0],
    hair: HAIR_STYLES[0],
    makeup: MAKEUP_STYLES[0],
    facialExpression: "Soft Smile",
    lighting: LIGHTING_STYLES[0],
    mood: MOODS[0],
    extraDetails: '',
    aspectRatio: AspectRatio.PORTRAIT_9_16,
    imageSize: ImageSize.SIZE_1K,
    ethnicity: ETHNICITIES[0],
    pose: POSES[0],
    brandName: '',
    bottleType: BOTTLE_TYPES[0],
    labelStyle: LABEL_STYLES[0],
    productTexture: PRODUCT_TEXTURES[0],
    brandColorway: BRAND_COLORWAYS[0],
    routinePhase: ROUTINE_PHASES[0],
    applicationArea: APPLICATION_AREAS[0],
    glowIntensity: 7,
    poreRealism: 8,
    freckles: true,
    bodyShape: "Natural",
    hipWidth: 5,
    waistDefinition: 5,
    gluteProminence: 5
  });

  useEffect(() => {
    const loadData = async () => {
      const [images, presets] = await Promise.all([
        getGalleryImages(),
        getUserPresets()
      ]);
      setGalleryHistory(images);
      setUserPresets(presets);
      if (images.length > 0) setSelectedImageId(images[0].id);
    };
    loadData();
  }, []);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio?.hasSelectedApiKey) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else {
          setHasApiKey(true);
        }
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleImageSelect = (base64: string, type: string) => {
    setBase64Image(base64);
    setMimeType(type);
    setError(null);
  };

  const handleConfigChange = (key: keyof TwinConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: UserPreset) => {
    setConfig(prev => ({ ...prev, ...preset.config }));
  };

  const handleSavePreset = async () => {
    const name = window.prompt("Enter a name for your custom skincare preset:");
    if (!name) return;

    const newPreset: UserPreset = {
      id: Date.now().toString(),
      name,
      config: { ...config },
      isCustom: true
    };

    await saveUserPreset(newPreset);
    setUserPresets(prev => [...prev, newPreset]);
  };

  const handleDeletePreset = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this custom preset?")) {
      await deleteUserPresetFromDB(id);
      setUserPresets(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleGenerate = async () => {
    if (!base64Image) {
      setError("Please upload a reference photo for your AI Twin.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    
    const steps = [
      "Analyzing skin undertones...",
      "Locking facial geometry...",
      "Rendering silk textures...",
      "Applying brand colorway...",
      "Polishing editorial lighting...",
      "Crafting strategic ad copy..."
    ];

    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      setGenerationStep(steps[stepIdx % steps.length]);
      stepIdx++;
    }, 2000);

    try {
      const { url, adCopy } = await generateTwinImage(base64Image, mimeType, config);
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url,
        adCopy,
        timestamp: Date.now(),
        config: { ...config },
        isFavorite: false
      };
      await saveImageToGallery(newImage);
      setGalleryHistory(prev => [newImage, ...prev]);
      setSelectedImageId(newImage.id);
    } catch (err: any) {
      setError(err.message || "Generation error.");
    } finally {
      clearInterval(stepInterval);
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const toggleFavorite = (id: string) => {
    setGalleryHistory(prev => prev.map(img => {
      if (img.id === id) {
        const updated = { ...img, isFavorite: !img.isFavorite };
        updateImageInGallery(updated);
        return updated;
      }
      return img;
    }));
  };

  const deleteImage = async (id: string) => {
    if (window.confirm("Delete this creation?")) {
      await deleteImageFromGallery(id);
      setGalleryHistory(prev => prev.filter(img => img.id !== id));
      if (selectedImageId === id) setSelectedImageId(null);
    }
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `skincare-ugc-${Date.now()}.png`;
    link.click();
  };

  const handleDownloadAllFavorites = async () => {
    const favorites = galleryHistory.filter(img => img.isFavorite);
    if (favorites.length === 0) {
      alert("No favorites to download. Mark some images as favorites first!");
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder("glowmuse-favorites");

    for (let i = 0; i < favorites.length; i++) {
      const img = favorites[i];
      const base64Data = img.url.split(',')[1];
      folder?.file(`skincare-asset-${i + 1}.png`, base64Data, { base64: true });
      if (img.adCopy) {
        folder?.file(`skincare-asset-${i + 1}-copy.txt`, img.adCopy);
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "glowmuse-brand-package.zip";
    link.click();
  };

  const bgMain = isDarkMode ? "bg-dark-900" : "bg-light-50";
  const bgCard = isDarkMode ? "bg-dark-800" : "bg-white";
  const borderColor = isDarkMode ? "border-white/5" : "border-gray-200";
  const textColor = isDarkMode ? "text-gray-200" : "text-gray-800";
  const subTextColor = isDarkMode ? "text-gray-500" : "text-gray-400";

  if (isCheckingKey) return null;

  if (!hasApiKey) {
    return (
      <div className={`min-h-screen ${bgMain} flex items-center justify-center p-6`}>
        <div className={`${bgCard} max-w-md w-full p-8 rounded-3xl shadow-2xl border ${borderColor} text-center`}>
          <div className="w-20 h-20 bg-brand-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
          </div>
          <h1 className="text-3xl font-serif font-bold mb-4">UGC Skincare AI</h1>
          <p className={`${subTextColor} mb-8`}>Generate high-end brand assets using your unique AI Twin.</p>
          <button onClick={handleSelectKey} className="w-full py-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-xl">Connect Brand Key</button>
        </div>
      </div>
    );
  }

  const displayedImage = selectedImageId ? galleryHistory.find(img => img.id === selectedImageId) : null;

  return (
    <div className={`min-h-screen ${bgMain} ${textColor} transition-colors duration-300 font-sans selection:bg-brand-500 selection:text-white`}>
      <header className={`sticky top-0 z-50 backdrop-blur-xl ${isDarkMode ? 'bg-dark-900/80' : 'bg-white/80'} border-b ${borderColor}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg"><span className="text-white font-serif font-bold text-xl">U</span></div>
            <h1 className="text-xl font-serif font-bold tracking-tight">UGC SKINCARE</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              {isDarkMode ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>}
            </button>
            <button onClick={() => setShowHistory(!showHistory)} className={`p-2.5 rounded-full transition-colors ${showHistory ? 'bg-brand-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <section className={`${bgCard} rounded-3xl p-5 border ${borderColor} shadow-xl`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600">Reference Identity</h2>
            </div>
            <ImageUploader onImageSelect={handleImageSelect} selectedImage={base64Image} />
          </section>

          <section className="space-y-3">
             <div className="flex items-center justify-between px-2 mb-2">
               <h2 className="text-xs font-bold uppercase tracking-widest">Sincere Presets</h2>
               <button onClick={handleSavePreset} className="text-[10px] bg-brand-500 text-white px-3 py-1 rounded-full font-bold hover:bg-brand-600 transition-colors shadow-sm">+ Save Current</button>
             </div>
             <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
               {SKINCARE_PRESETS.map((p: any) => (
                 <button key={p.id} onClick={() => applyPreset(p)} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium border ${borderColor} ${bgCard} hover:border-brand-500 hover:text-brand-600 transition-all shadow-sm`}>{p.name}</button>
               ))}
               {userPresets.map((p) => (
                 <div key={p.id} className="relative flex-shrink-0 group">
                   <button onClick={() => applyPreset(p)} className={`px-4 py-2 rounded-full text-xs font-medium border border-brand-200 dark:border-brand-900 bg-brand-50/50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300 hover:border-brand-500 transition-all pr-8 shadow-sm`}>
                     {p.name}
                   </button>
                   <button onClick={(e) => handleDeletePreset(e, p.id)} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                 </div>
               ))}
             </div>
          </section>

          <section className={`${bgCard} rounded-3xl border ${borderColor} shadow-2xl overflow-hidden`}>
            <div className={`flex border-b ${borderColor} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
              <TabBtn active={activeTab === 'concept'} onClick={() => setActiveTab('concept')} label="Concept" />
              <TabBtn active={activeTab === 'brand'} onClick={() => setActiveTab('brand')} label="Brand" />
              <TabBtn active={activeTab === 'ritual'} onClick={() => setActiveTab('ritual')} label="Ritual" />
              <TabBtn active={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')} label="Twin" />
            </div>

            <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
              {activeTab === 'concept' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold uppercase tracking-tighter text-brand-500">Creative Brief / Custom Prompt</label>
                      <span className="text-[9px] text-gray-400">Describe specific actions or items</span>
                    </div>
                    <textarea 
                      className={`w-full p-4 text-sm rounded-2xl ${isDarkMode ? 'bg-dark-900 border-white/5 text-gray-200' : 'bg-gray-50 border-gray-100 text-gray-800'} border focus:ring-2 focus:ring-brand-500 focus:outline-none h-40 transition-all leading-relaxed placeholder:text-gray-400`}
                      placeholder="e.g. 'Opening a frosted glass bottle while morning dew is visible on the window behind. Wearing a silk robe...'"
                      value={config.visionPrompt}
                      onChange={(e) => handleConfigChange('visionPrompt', e.target.value)}
                    />
                  </div>
                  <SelectGroup label="Framing" value={config.photoshootType} onChange={v => handleConfigChange('photoshootType', v)} options={PHOTOSHOOT_TYPES} isDarkMode={isDarkMode} />
                  <SelectGroup label="Aspect" value={config.aspectRatio} onChange={v => handleConfigChange('aspectRatio', v)} options={ASPECT_RATIOS} isDarkMode={isDarkMode} />
                </div>
              )}

              {activeTab === 'brand' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-tighter">Brand Name</label>
                    <input type="text" className={`w-full p-3 text-sm rounded-xl ${isDarkMode ? 'bg-dark-900 border-white/5' : 'bg-gray-50 border-gray-100'} border`} placeholder="e.g. Glow Recipe" value={config.brandName} onChange={e => handleConfigChange('brandName', e.target.value)} />
                  </div>
                  <SelectGroup label="Bottle Type" value={config.bottleType} onChange={v => handleConfigChange('bottleType', v)} options={BOTTLE_TYPES} isDarkMode={isDarkMode} />
                  <SelectGroup label="Texture" value={config.productTexture} onChange={v => handleConfigChange('productTexture', v)} options={PRODUCT_TEXTURES} isDarkMode={isDarkMode} />
                  <SelectGroup label="Label Style" value={config.labelStyle} onChange={v => handleConfigChange('labelStyle', v)} options={LABEL_STYLES} isDarkMode={isDarkMode} />
                  <SelectGroup label="Brand Colorway" value={config.brandColorway} onChange={v => handleConfigChange('brandColorway', v)} options={BRAND_COLORWAYS} isDarkMode={isDarkMode} />
                </div>
              )}

              {activeTab === 'ritual' && (
                <div className="space-y-5 animate-fade-in">
                  <SelectGroup label="Scene Location" value={config.scene} onChange={v => handleConfigChange('scene', v)} options={SCENES} isDarkMode={isDarkMode} />
                  <SelectGroup label="Routine Phase" value={config.routinePhase} onChange={v => handleConfigChange('routinePhase', v)} options={ROUTINE_PHASES} isDarkMode={isDarkMode} />
                  <SelectGroup label="Action / Pose" value={config.pose} onChange={v => handleConfigChange('pose', v)} options={POSES} isDarkMode={isDarkMode} />
                  <SelectGroup label="Application Area" value={config.applicationArea} onChange={v => handleConfigChange('applicationArea', v)} options={APPLICATION_AREAS} isDarkMode={isDarkMode} />
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-5 animate-fade-in">
                  <SelectGroup label="Ethnicity Lock" value={config.ethnicity} onChange={v => handleConfigChange('ethnicity', v)} options={ETHNICITIES} isDarkMode={isDarkMode} />
                  <SelectGroup label="Wardrobe" value={config.outfit} onChange={v => handleConfigChange('outfit', v)} options={OUTFITS} isDarkMode={isDarkMode} />
                  <SelectGroup label="Hair Ritual" value={config.hair} onChange={v => handleConfigChange('hair', v)} options={HAIR_STYLES} isDarkMode={isDarkMode} />
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <Slider label="Glow Intensity" value={config.glowIntensity} onChange={v => handleConfigChange('glowIntensity', v)} isDarkMode={isDarkMode} />
                    <Slider label="Pore Realism" value={config.poreRealism} onChange={v => handleConfigChange('poreRealism', v)} isDarkMode={isDarkMode} min={1} max={12} step={0.5} />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase">Natural Freckles</span>
                      <button onClick={() => handleConfigChange('freckles', !config.freckles)} className={`w-12 h-6 rounded-full p-1 transition-colors ${config.freckles ? 'bg-brand-500' : 'bg-gray-400'}`}><div className={`w-4 h-4 bg-white rounded-full transition-transform ${config.freckles ? 'translate-x-6' : ''}`}></div></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <button onClick={handleGenerate} disabled={isGenerating || !base64Image} className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] shadow-2xl ${isGenerating || !base64Image ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-brand-600 to-pink-500 text-white'}`}>
            {isGenerating ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : "Create Brand Visual"}
          </button>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className={`relative min-h-[650px] rounded-[2.5rem] border ${borderColor} overflow-hidden ${bgCard} shadow-2xl flex flex-col items-center justify-center transition-all duration-700`}>
            {isGenerating ? (
              <div className="text-center space-y-6 animate-pulse">
                <div className="w-24 h-24 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif font-bold">GlowMuse is Strategizing...</h3>
                  <p className="text-brand-600 font-medium tracking-wide text-sm">{generationStep}</p>
                </div>
              </div>
            ) : displayedImage ? (
              <>
                <div className="relative w-full h-full flex items-center justify-center bg-black/5 overflow-hidden">
                  <img 
                    src={isViewingOriginal && base64Image ? base64Image : displayedImage.url} 
                    alt="Brand Asset" 
                    className="w-full h-full object-contain max-h-[80vh] drop-shadow-2xl transition-all duration-300" 
                    style={{ filter: !isViewingOriginal && activeFilter !== 'none' ? activeFilter : undefined }} 
                  />
                  
                  <div className="absolute top-6 right-6 flex flex-col gap-3">
                    <button onClick={() => toggleFavorite(displayedImage.id)} className={`p-3 rounded-full backdrop-blur-xl transition-all shadow-lg ${displayedImage.isFavorite ? 'bg-brand-500 text-white' : 'bg-white/20 text-white'}`}>
                      <svg className="w-6 h-6" fill={displayedImage.isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                    </button>
                    <button 
                      onMouseDown={() => setIsViewingOriginal(true)}
                      onMouseUp={() => setIsViewingOriginal(false)}
                      onMouseLeave={() => setIsViewingOriginal(false)}
                      onTouchStart={() => setIsViewingOriginal(true)}
                      onTouchEnd={() => setIsViewingOriginal(false)}
                      className="p-3 rounded-full bg-white/20 text-white backdrop-blur-xl shadow-lg hover:bg-white/30 transition-all"
                      title="Hold to view original"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                  </div>

                  {isViewingOriginal && (
                    <div className="absolute top-6 left-6 bg-brand-600 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg animate-fade-in">Original Reference</div>
                  )}
                </div>

                <div className={`w-full p-6 border-t ${borderColor} backdrop-blur-md bg-white/60 dark:bg-dark-800/60 z-10`}>
                  <div className="space-y-6">
                    {displayedImage.adCopy && (
                      <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-dark-900/50 border-white/5' : 'bg-sand-50 border-sand-100'} border`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Strategic Ad Copy</span>
                          <button onClick={() => { navigator.clipboard.writeText(displayedImage.adCopy || ''); alert('Copy copied!'); }} className="text-[10px] text-gray-400 hover:text-brand-500 transition-colors">Copy Text</button>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap italic">{displayedImage.adCopy}</p>
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scroll-hide">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mr-2">Brand Filters:</span>
                        {FILTERS.map(f => (
                          <button key={f.name} onClick={() => setActiveFilter(f.value)} className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${activeFilter === f.value ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'}`}>{f.name}</button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => deleteImage(displayedImage.id)} className="p-3 text-red-500 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.032-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
                        <button onClick={() => handleDownload(displayedImage.url)} className="px-8 py-3 bg-brand-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-brand-600/30 transition-all">Save to Device</button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-12 max-w-sm">
                <div className="w-24 h-24 bg-brand-100 rounded-full mx-auto mb-8 flex items-center justify-center animate-bounce shadow-inner">
                   <svg className="w-12 h-12 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                </div>
                <h3 className="text-3xl font-serif font-bold mb-3 tracking-tight">Glow Awaits.</h3>
                <p className={`${subTextColor} text-lg font-light leading-relaxed`}>Upload your image and define your skincare ritual to generate elite brand assets.</p>
              </div>
            )}
            {error && <div className="absolute bottom-10 left-6 right-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl backdrop-blur-lg text-center font-medium">{error}</div>}
          </div>

          {showHistory && galleryHistory.length > 0 && (
            <div className={`${bgCard} border ${borderColor} rounded-[2rem] p-8 shadow-2xl transition-all`}>
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-xl font-serif font-bold">Brand Portfolio</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{galleryHistory.length} creations</p>
                </div>
                {galleryHistory.some(img => img.isFavorite) && (
                  <button onClick={handleDownloadAllFavorites} className="text-[10px] bg-brand-500 text-white px-4 py-2 rounded-full font-bold hover:bg-brand-600 transition-all flex items-center gap-2 shadow-md">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export Favorites (.zip)
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {galleryHistory.map(img => (
                  <div key={img.id} className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${selectedImageId === img.id ? 'border-brand-500 scale-105' : 'border-transparent hover:border-brand-300'}`} onClick={() => setSelectedImageId(img.id)}>
                    <img src={img.url} className="w-full h-full object-cover" alt="Thumbnail" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <button onClick={(e) => { e.stopPropagation(); handleDownload(img.url); }} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-all" title="Save to Device">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       </button>
                    </div>
                    {img.isFavorite && <div className="absolute top-2 right-2 text-brand-500 drop-shadow-md z-10"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3c1.54 0 2.946.647 3.957 1.681C12.657 3.647 14.063 3 15.602 3 18.577 3 21 5.322 21 8.25c0 3.924-2.438 7.11-4.74 9.272a25.176 25.176 0 01-4.244 3.17c-.11.06-.209.112-.294.156l-.023.012-.007.003-.001.001z" /></svg></div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  );
};

const TabBtn: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button onClick={onClick} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative ${active ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}>
    {label}
    {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"></div>}
  </button>
);

const SelectGroup: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: string[]; isDarkMode: boolean }> = ({ label, value, onChange, options, isDarkMode }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500 pl-1">{label}</label>
    <select className={`w-full p-3 text-xs rounded-xl border ${isDarkMode ? 'bg-dark-900 border-white/5 text-gray-200' : 'bg-gray-50 border-gray-100 text-gray-800'} focus:ring-1 focus:ring-brand-500 focus:outline-none appearance-none cursor-pointer`} value={value} onChange={e => onChange(e.target.value)}>
      {options.map((o, i) => <option key={i} value={o}>{o}</option>)}
    </select>
  </div>
);

const Slider: React.FC<{ label: string; value: number; onChange: (v: number) => void; isDarkMode: boolean; min?: number; max?: number; step?: number }> = ({ label, value, onChange, isDarkMode, min = 1, max = 10, step = 1 }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center px-1">
      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</label>
      <span className="text-[10px] font-mono text-brand-500">{value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-brand-500 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
  </div>
);

export default App;
