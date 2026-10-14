/** User picture, or their initials when there is no picture. */
export const Avatar = ({ user, size = 'w-8 h-8', textSize = 'text-xs' }) => {
  const initials = (user?.name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.name} className={`${size} rounded-full object-cover border border-slate-300`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${size} ${textSize} rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center`}
    >
      {initials}
    </span>
  );
};

export default Avatar;
