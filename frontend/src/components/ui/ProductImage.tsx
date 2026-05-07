// Category default images using emoji rendered on a colored canvas via SVG data URIs
// Falls back gracefully when no product image is available

export const CATEGORY_CONFIG: Record<string, { emoji: string; bg: string; color: string }> = {
  'Grocery':       { emoji: '🌾', bg: '#FFF8E1', color: '#F59E0B' },
  'Dairy':         { emoji: '🥛', bg: '#E0F2F1', color: '#009688' },
  'Bakery':        { emoji: '🍞', bg: '#FFF3E0', color: '#FF7A00' },
  'Beverages':     { emoji: '🧃', bg: '#E8F5E9', color: '#43A047' },
  'Snacks':        { emoji: '🍪', bg: '#FCE4EC', color: '#E91E63' },
  'Pharmacy':      { emoji: '💊', bg: '#E3F2FD', color: '#1E88E5' },
  'Personal Care': { emoji: '🧴', bg: '#F3E5F5', color: '#8E24AA' },
  'Household':     { emoji: '🧹', bg: '#E0F7FA', color: '#00ACC1' },
  'Vegetables':    { emoji: '🥦', bg: '#E8F5E9', color: '#2E7D32' },
  'Fruits':        { emoji: '🍎', bg: '#FFEBEE', color: '#E53935' },
  'Meat':          { emoji: '🥩', bg: '#FFEBEE', color: '#C62828' },
  'Other':         { emoji: '📦', bg: '#F1F5F9', color: '#64748B' },
};

export const DEFAULT_CATEGORY = { emoji: '📦', bg: '#F1F5F9', color: '#64748B' };

export function getCategoryConfig(category?: string) {
  if (!category) return DEFAULT_CATEGORY;
  return CATEGORY_CONFIG[category] ?? DEFAULT_CATEGORY;
}

interface ProductImageProps {
  imageUrl?: string;
  category?: string;
  name: string;
  size?: number;
  className?: string;
}

export function ProductImage({ imageUrl, category, name, size = 48, className = '' }: ProductImageProps) {
  const cfg = getCategoryConfig(category);

  // Relative paths (local uploads) need the backend base URL
  const resolvedUrl = imageUrl
    ? imageUrl.startsWith('http')
      ? imageUrl
      : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001'}${imageUrl}`
    : null;

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: 8 }}
        className={className}
        onError={(e) => {
          // fallback to default on broken image
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style');
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: cfg.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.45,
        flexShrink: 0,
      }}
      className={className}
      title={category || 'Product'}
    >
      {cfg.emoji}
    </div>
  );
}
