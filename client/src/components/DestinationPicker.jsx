import { useDestinationList } from '../hooks/useDestinationList';

/** Part 10 — choose one of the catalog destinations (value = slug). */
export const DestinationPicker = ({ value, onChange, id = 'destination-picker' }) => {
  const list = useDestinationList();
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Destination
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="py-2.5 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        {!list.some((d) => d.slug === value) && <option value={value}>{value}</option>}
        {list.map((d) => (
          <option key={d.slug} value={d.slug}>
            {d.name} — {d.state}
          </option>
        ))}
      </select>
    </>
  );
};

export default DestinationPicker;
