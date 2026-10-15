import { useState } from 'react';
import { MapPin } from 'lucide-react';

/**
 * Part 10 — a destination photo with its credit (Wikipedia file page), or an honest placeholder
 * with the name when there is no photo yet (never a random photo of somewhere else).
 */
export const DestinationImage = ({ src, alt, credit, className = '', showCredit = false }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-slate-200 text-slate-500 ${className}`} role="img" aria-label={alt}>
        <MapPin className="w-8 h-8 text-blue-400" />
        <span className="mt-1 text-sm font-bold text-slate-600">{alt}</span>
        <span className="text-[10px]">Photo coming soon</span>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      {showCredit && credit && (
        <span className="absolute bottom-1.5 right-2 text-[10px] text-white/90 bg-black/40 px-1.5 py-0.5 rounded">
          Photo:{' '}
          {credit.fileUrl ? (
            <a href={credit.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {credit.source} (licence)
            </a>
          ) : (
            `${credit.source}${credit.note ? `, ${credit.note}` : ''}`
          )}
        </span>
      )}
    </div>
  );
};

export default DestinationImage;
