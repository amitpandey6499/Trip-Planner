/** Save a file the browser received or made (PDF, calendar). Works in every modern browser, no library needed. */
export const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const saveText = (text, fileName, type = 'text/plain;charset=utf-8') => saveBlob(new Blob([text], { type }), fileName);

/** "TripPlanner - 4-Day Manali Adventure.pdf" — safe on Windows, macOS, Android. */
export const exportFileName = (title, extension) =>
  `TripPlanner - ${String(title ?? 'Trip').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)}.${extension}`;
