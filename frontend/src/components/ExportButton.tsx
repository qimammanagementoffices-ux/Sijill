import type { ButtonHTMLAttributes } from "react";
import { IconFilePdf, IconSheet } from "@/components/NavIcons";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> & {
  format: "xlsx" | "pdf";
  label: string;
  onClick: () => void | Promise<void>;
};

export default function ExportButton({ format, label, onClick, className = "", ...props }: Props) {
  return (
    <button
      type="button"
      className={`btn btn-outline btn-sm export-button ${className}`.trim()}
      onClick={() => void onClick()}
      {...props}
    >
      {format === "xlsx" ? <IconSheet className="ic-sm" /> : <IconFilePdf className="ic-sm" />}
      <span>{label}</span>
    </button>
  );
}
