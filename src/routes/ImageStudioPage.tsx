import { useEffect, useRef, useState } from "react";
import { Download, ImageIcon, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { loadStoredDashboard } from "../lib/storage";

// ── Types ──────────────────────────────────────────────────

interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  brand: string;
  imageType: string;
  style: string;
  market: string;
  timestamp: string;
  seed: number;
}

const GALLERY_KEY = "opptra-image-studio-gallery";

// ── Prompt config ──────────────────────────────────────────

const IMAGE_TYPES = [
  {
    id: "product",
    label: "Product Shot",
    icon: "📦",
    promptSuffix:
      "luxury product photography, clean white studio background, soft shadow, commercial photography, 8k, sharp focus, beauty product"
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    icon: "✨",
    promptSuffix:
      "lifestyle photography, beautiful model applying beauty product, natural golden light, authentic, aspirational, editorial, beauty campaign"
  },
  {
    id: "campaign",
    label: "Campaign Visual",
    icon: "🎯",
    promptSuffix:
      "advertising campaign visual, bold editorial photography, magazine quality, striking composition, beauty brand marketing"
  },
  {
    id: "packaging",
    label: "Packaging",
    icon: "🎁",
    promptSuffix:
      "product packaging design mockup, elegant retail packaging, unboxing experience, shelf-ready, premium beauty packaging, 3d render"
  },
  {
    id: "moodboard",
    label: "Mood Board",
    icon: "🎨",
    promptSuffix:
      "beauty mood board, color palette inspiration, flat lay arrangement, aesthetic collage, brand identity visual, pastel tones"
  },
  {
    id: "retail",
    label: "Retail Display",
    icon: "🏪",
    promptSuffix:
      "beauty products displayed on retail shelf, luxury store display, point of sale, merchandise arrangement, Sephora-style display"
  }
] as const;

type ImageTypeId = (typeof IMAGE_TYPES)[number]["id"];

const STYLES = [
  { id: "luxury", label: "Luxury / Premium", suffix: "ultra-luxury, sophisticated, high-end, opulent, gold accents, marble texture" },
  { id: "clean", label: "Clean / Indie", suffix: "clean beauty, indie brand aesthetic, sustainable, botanical, minimal, eco-conscious" },
  { id: "mass", label: "Mass Market", suffix: "vibrant, colourful, accessible, friendly, youthful energy, approachable" },
  { id: "kbeauty", label: "K-Beauty", suffix: "K-beauty aesthetic, Korean beauty, dewy skin, youthful, pastel, soft gradient, glass skin" },
  { id: "ayurvedic", label: "Ayurvedic / Herbal", suffix: "ayurvedic, herbal, natural ingredients, earthy tones, traditional, wellness" }
] as const;

const MARKETS = [
  { id: "india", label: "India", suffix: "Indian market, warm golden tones, diverse skin tones, vibrant, rich cultural aesthetic" },
  { id: "sea", label: "SEA", suffix: "Southeast Asian market, tropical, modern, humidity-proof, diverse demographics" },
  { id: "gcc", label: "GCC / Middle East", suffix: "Middle Eastern luxury market, gold accents, modest elegance, premium sophistication" },
  { id: "global", label: "Global", suffix: "global appeal, diverse inclusive, universal beauty, international market" }
] as const;

// ── Helpers ────────────────────────────────────────────────

function loadGallery(): GeneratedImage[] {
  try {
    return JSON.parse(localStorage.getItem(GALLERY_KEY) ?? "[]") as GeneratedImage[];
  } catch {
    return [];
  }
}

function saveGallery(gallery: GeneratedImage[]) {
  localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery.slice(0, 24)));
}

function buildPrompt(brand: string, customPrompt: string, typeId: ImageTypeId, styleId: string, marketId: string): string {
  const type = IMAGE_TYPES.find(t => t.id === typeId)!;
  const style = STYLES.find(s => s.id === styleId)!;
  const market = MARKETS.find(m => m.id === marketId)!;

  const brandPart = brand ? `for ${brand} beauty brand, ` : "";
  const customPart = customPrompt.trim() ? `${customPrompt.trim()}, ` : "";

  return `${brandPart}${customPart}${type.promptSuffix}, ${style.suffix}, ${market.suffix}, professional, high resolution, photorealistic`.trim();
}

function buildImageUrl(prompt: string, seed: number): string {
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&seed=${seed}&model=flux&nologo=true&enhance=true`;
}

function randomSeed() {
  return Math.floor(Math.random() * 999999);
}

// ── Component ──────────────────────────────────────────────

export function ImageStudioPage() {
  // Config
  const [selectedBrand, setSelectedBrand] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [imageType, setImageType] = useState<ImageTypeId>("product");
  const [style, setStyle] = useState("luxury");
  const [market, setMarket] = useState("india");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [currentSeed, setCurrentSeed] = useState(randomSeed);
  const [currentUrl, setCurrentUrl] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Gallery
  const [gallery, setGallery] = useState<GeneratedImage[]>(() => loadGallery());
  const [lightboxImg, setLightboxImg] = useState<GeneratedImage | null>(null);

  // Pipeline brands
  const [brands, setBrands] = useState<string[]>([]);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const stored = loadStoredDashboard();
    const unique = Array.from(new Set(stored.performance.map(r => r.brand.trim()).filter(Boolean))).sort();
    setBrands(unique);
    if (unique[0]) setSelectedBrand(unique[0]);
  }, []);

  function generate(newSeed?: number) {
    const seed = newSeed ?? randomSeed();
    const prompt = buildPrompt(selectedBrand, customPrompt, imageType, style, market);
    const url = buildImageUrl(prompt, seed);

    setCurrentSeed(seed);
    setCurrentPrompt(prompt);
    setCurrentUrl(url);
    setGenerating(true);
    setImageLoaded(false);
    setImageError(false);
  }

  function handleImageLoad() {
    setGenerating(false);
    setImageLoaded(true);

    // Save to gallery
    const entry: GeneratedImage = {
      id: `${Date.now()}-${currentSeed}`,
      imageUrl: currentUrl,
      prompt: currentPrompt,
      brand: selectedBrand,
      imageType,
      style,
      market,
      timestamp: new Date().toISOString(),
      seed: currentSeed
    };
    const updated = [entry, ...gallery];
    setGallery(updated);
    saveGallery(updated);
  }

  function handleImageError() {
    setGenerating(false);
    setImageError(true);
  }

  function downloadImage(url: string, brand: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brand.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.jpg`;
    a.target = "_blank";
    a.click();
  }

  function regenerate() {
    generate();
  }

  function deleteFromGallery(id: string) {
    const updated = gallery.filter(g => g.id !== id);
    setGallery(updated);
    saveGallery(updated);
  }

  const activeType = IMAGE_TYPES.find(t => t.id === imageType)!;

  return (
    <div className="studio-page">
      {/* Header */}
      <div className="studio-header">
        <div className="studio-header-left">
          <div className="studio-logo-block">
            <img
              src="https://cdn.prod.website-files.com/67a44396c211269f785f9dfe/67a4a8650573be9ae072ae9e_Opptra-logo.svg"
              alt="Opptra"
              className="studio-logo"
            />
          </div>
          <div>
            <h1 className="studio-title">Lumara Image Studio</h1>
            <p className="studio-subtitle">AI-generated beauty visuals for your pipeline brands</p>
          </div>
        </div>
        <span className="studio-beta-chip">BETA · Powered by AI</span>
      </div>

      <div className="studio-layout">
        {/* ── Left controls ── */}
        <div className="studio-controls">
          {/* Brand */}
          <div className="studio-field">
            <label className="studio-label">Brand</label>
            <select
              className="studio-select"
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
            >
              <option value="">No brand (generic)</option>
              {brands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Image Type */}
          <div className="studio-field">
            <label className="studio-label">Image Type</label>
            <div className="studio-type-grid">
              {IMAGE_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  className={`studio-type-btn${imageType === type.id ? " is-active" : ""}`}
                  onClick={() => setImageType(type.id)}
                >
                  <span className="type-icon">{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="studio-field">
            <label className="studio-label">Aesthetic Style</label>
            <div className="studio-pill-group">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`studio-pill${style === s.id ? " is-active" : ""}`}
                  onClick={() => setStyle(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Market */}
          <div className="studio-field">
            <label className="studio-label">Target Market</label>
            <div className="studio-pill-group">
              {MARKETS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`studio-pill${market === m.id ? " is-active" : ""}`}
                  onClick={() => setMarket(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="studio-field">
            <label className="studio-label">Custom prompt (optional)</label>
            <textarea
              className="studio-prompt-input"
              rows={3}
              placeholder="e.g. featuring rose gold packaging, soft pink flowers in the background..."
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
            />
          </div>

          {/* Prompt preview */}
          {selectedBrand && (
            <div className="studio-prompt-preview">
              <span className="studio-prompt-preview-label">Preview prompt</span>
              <p>{buildPrompt(selectedBrand, customPrompt, imageType, style, market)}</p>
            </div>
          )}

          {/* Generate button */}
          <button
            className="studio-generate-btn"
            onClick={() => generate()}
            disabled={generating}
            type="button"
          >
            {generating ? (
              <>
                <span className="studio-spinner" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Image
              </>
            )}
          </button>
        </div>

        {/* ── Right: Output ── */}
        <div className="studio-output">
          {!currentUrl ? (
            <div className="studio-empty">
              <div className="studio-empty-icon">
                <ImageIcon size={48} strokeWidth={1} />
              </div>
              <strong>Your image will appear here</strong>
              <p>Select a brand and image type, then click Generate Image</p>
            </div>
          ) : (
            <div className="studio-result">
              <div className="studio-image-wrap">
                {generating && (
                  <div className="studio-image-loading">
                    <div className="studio-loading-ring" />
                    <p>Generating {activeType.label.toLowerCase()} for {selectedBrand || "beauty brand"}...</p>
                    <span>This takes 10–20 seconds</span>
                  </div>
                )}
                {imageError && (
                  <div className="studio-image-loading">
                    <p style={{ color: "var(--danger)" }}>Generation failed — try again</p>
                    <button className="studio-retry-btn" onClick={regenerate} type="button">
                      <RefreshCw size={14} /> Retry
                    </button>
                  </div>
                )}
                <img
                  ref={imgRef}
                  src={currentUrl}
                  alt={`Generated: ${currentPrompt}`}
                  className={`studio-generated-img${imageLoaded ? " is-loaded" : ""}`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              </div>

              {imageLoaded && (
                <div className="studio-result-actions">
                  <div className="studio-result-meta">
                    <span>{activeType.icon} {activeType.label}</span>
                    <span>·</span>
                    <span>{selectedBrand || "Generic"}</span>
                    <span>·</span>
                    <span>Seed #{currentSeed}</span>
                  </div>
                  <div className="studio-result-btns">
                    <button
                      className="studio-action-btn"
                      onClick={regenerate}
                      type="button"
                      title="Generate a variation"
                    >
                      <RefreshCw size={14} />
                      Variation
                    </button>
                    <button
                      className="studio-action-btn studio-action-primary"
                      onClick={() => downloadImage(currentUrl, selectedBrand || "beauty")}
                      type="button"
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gallery */}
          {gallery.length > 0 && (
            <div className="studio-gallery">
              <div className="studio-gallery-header">
                <strong>Recent Generations</strong>
                <span>{gallery.length} images</span>
              </div>
              <div className="studio-gallery-grid">
                {gallery.map(img => (
                  <div key={img.id} className="studio-gallery-item" onClick={() => setLightboxImg(img)}>
                    <img src={img.imageUrl} alt={img.prompt} loading="lazy" />
                    <div className="studio-gallery-overlay">
                      <span className="studio-gallery-brand">{img.brand || "Generic"}</span>
                      <button
                        className="studio-gallery-delete"
                        onClick={e => { e.stopPropagation(); deleteFromGallery(img.id); }}
                        type="button"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="studio-lightbox" onClick={() => setLightboxImg(null)}>
          <div className="studio-lightbox-card" onClick={e => e.stopPropagation()}>
            <button className="studio-lightbox-close" onClick={() => setLightboxImg(null)} type="button">
              <X size={18} />
            </button>
            <img src={lightboxImg.imageUrl} alt={lightboxImg.prompt} />
            <div className="studio-lightbox-meta">
              <div>
                <strong>{lightboxImg.brand || "Generic"}</strong>
                <p>{lightboxImg.prompt}</p>
              </div>
              <button
                className="studio-action-btn studio-action-primary"
                onClick={() => downloadImage(lightboxImg.imageUrl, lightboxImg.brand || "beauty")}
                type="button"
              >
                <Download size={14} />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
