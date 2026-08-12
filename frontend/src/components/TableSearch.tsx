type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
};

export default function TableSearch({ value, onChange, placeholder, label }: Props) {
  return (
    <div className="table-search">
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <button type="submit" aria-label={label} title={label}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <span>{label}</span>
      </button>
    </div>
  );
}
