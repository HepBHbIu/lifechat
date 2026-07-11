interface AvatarProps {
  url?: string | null;
  username: string;
  size?: number;
  className?: string;
}

export default function Avatar({ url, username, size = 40, className = '' }: AvatarProps) {
  const initial = username ? username.charAt(0).toUpperCase() : '?';
  const name = username || '?';

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`rounded-lg object-cover ${className}`}
        style={{ width: size, height: size }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display:flex');
        }}
      />
    );
  }

  return (
    <div
      className={`rounded-lg flex items-center justify-center font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, var(--accent), var(--accent-hover))`,
        fontSize: size * 0.35,
        display: url ? 'none' : 'flex',
        letterSpacing: '-0.02em',
      }}
    >
      {size >= 32 ? (username?.slice(0, 2)?.toUpperCase() || '?') : initial}
    </div>
  );
}
