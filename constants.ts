
export const PHOTOSHOOT_TYPES = [
  "UGC Selfie (Close Up)",
  "Half Body (Product Hold)",
  "Full Body (Routine)",
  "Tight Beauty Headshot"
];

export const SHOT_TYPES = [
  "Eye level direct",
  "High angle mirror selfie",
  "Macro skin texture shot",
  "Over-the-shoulder bathroom",
  "Profile application",
  "Vanity mirror reflection"
];

export const BOTTLE_TYPES = [
  "Glass Serum Dropper",
  "Luxury Gold Pump",
  "Minimalist Flip Cap",
  "Matte Glass Jar",
  "Frosted Mist Spray",
  "Metal Squeeze Tube"
];

export const PRODUCT_TEXTURES = [
  "Clear Hydrating Gel",
  "Rich Whipped Cream",
  "Gold Shimmering Oil",
  "White Aerated Foam",
  "Milky Liquid Toner",
  "Clay-like Mask"
];

export const LABEL_STYLES = [
  "Minimalist Modern",
  "Black & White Clean",
  "Gold Foil Embossed",
  "Dermatologist Medical",
  "Eco-Friendly Green"
];

export const BRAND_COLORWAYS = [
  "Neutral Ivory",
  "Soft Blush Pink",
  "Botanical Sage Green",
  "Luxury Slate & Gold",
  "Sky Blue Hydration",
  "Sunset Vitamin C Orange"
];

export const ROUTINE_PHASES = [
  "Morning Prep",
  "Nighttime Wind-down",
  "Shower Ritual",
  "Gym Refresh",
  "Pre-Event Glow Up"
];

export const APPLICATION_AREAS = [
  "Face & Cheeks",
  "Neck & Décolletage",
  "Shoulders & Arms",
  "Hands & Nails",
  "Legs (Glowing Skin)"
];

export const SCENES = [
  "Luxury Marble Bathroom",
  "Sun-drenched Kitchen",
  "Golden Hour Bedroom",
  "Steamy Glass Shower",
  "Professional Spa Suite",
  "Modern Vanity Desk",
  "Beach Sunset Ritual",
  "Sleek Gym Locker Room"
];

export const OUTFITS = [
  "Silk Robe (White)",
  "Fluffy Bath Towel Wrap",
  "Matching Yoga Set",
  "Oversized Linen Shirt",
  "Satin Slip Dress",
  "Ribbed Tank & Sweatpants",
  "Bare Shoulders (UGC Look)"
];

export const HAIR_STYLES = [
  "Wrapped in Towel",
  "Sleek High Bun",
  "Messy Morning Waves",
  "Headband / Spa Band",
  "Wet Look / Post-Shower",
  "Silk Scarf Wrap"
];

export const MAKEUP_STYLES = [
  "Bare Skin (No Makeup)",
  "Dewy Skin Focus",
  "Soft Morning Glow",
  "Clean Girl Aesthetic",
  "Subtle Lip Gloss Only"
];

export const ETHNICITIES = [
  "Same as Reference",
  "African American",
  "East Asian",
  "South Asian",
  "Caucasian",
  "Latina / Hispanic",
  "Middle Eastern",
  "Mixed / Ambiguous"
];

export const POSES = [
  "Applying product to cheek, gently massaging product into the skin",
  "Holding bottle near face",
  "Checking skin in mirror",
  "Soft smile at camera",
  "Splashing water (candid)",
  "Gently rubbing serum into hands",
  "Relaxed with towel on hair",
  "Direct eye contact with bottle"
];

export const LIGHTING_STYLES = [
  "Natural Window Light",
  "Golden Hour Warmth",
  "Bright Studio Soft",
  "Muted Spa Ambience",
  "Morning Sunrise Glow"
];

export const MOODS = [
  "Calm & Serene",
  "Confident & Radiant",
  "Playful & Fresh",
  "Sophisticated Luxury",
  "Authentic & Raw"
];

export const ASPECT_RATIOS = ["1:1", "3:4", "9:16", "4:3", "16:9"];
export const IMAGE_SIZES = ["1K", "2K", "4K"];

export const FILTERS = [
  { name: 'Pure', value: 'none' },
  { name: 'Warm Glow', value: 'sepia(0.1) saturate(1.1) contrast(1.05)' },
  { name: 'Cool Clean', value: 'saturate(0.9) contrast(1.1) brightness(1.05)' },
  { name: 'Vivid Fresh', value: 'saturate(1.2) contrast(1.1)' },
  { name: 'Soft Focus', value: 'brightness(1.02) contrast(0.95) saturate(0.95)' }
];

export const SKINCARE_PRESETS = [
  {
    id: 'p1',
    name: 'Morning Glow Routine',
    config: {
      scene: "Sun-drenched Kitchen",
      lighting: "Natural Window Light",
      outfit: "Oversized Linen Shirt",
      pose: "Holding bottle near face",
      routinePhase: "Morning Prep",
      glowIntensity: 8,
      productTexture: "Clear Hydrating Gel"
    }
  },
  {
    id: 'p2',
    name: 'Luxury Shower Ritual',
    config: {
      scene: "Steamy Glass Shower",
      lighting: "Muted Spa Ambience",
      outfit: "Bare Shoulders (UGC Look)",
      pose: "Applying product to cheek, gently massaging product into the skin",
      routinePhase: "Shower Ritual",
      glowIntensity: 9,
      productTexture: "White Aerated Foam"
    }
  },
  {
    id: 'p3',
    name: 'Nighttime Serum Set',
    config: {
      scene: "Luxury Marble Bathroom",
      lighting: "Bright Studio Soft",
      outfit: "Silk Robe (White)",
      pose: "Gently rubbing serum into hands",
      routinePhase: "Nighttime Wind-down",
      glowIntensity: 6,
      productTexture: "Gold Shimmering Oil",
      bottleType: "Glass Serum Dropper"
    }
  },
  {
    id: 'p4',
    name: 'Clean Girl Selfie',
    config: {
      scene: "Modern Vanity Desk",
      lighting: "Golden Hour Warmth",
      outfit: "Ribbed Tank & Sweatpants",
      pose: "Soft smile at camera",
      routinePhase: "Pre-Event Glow Up",
      glowIntensity: 10,
      makeup: "Dewy Skin Focus"
    }
  }
];
